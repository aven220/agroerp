import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeAuditService } from './coffee-audit.service';
import { CoffeeScaleService } from './coffee-scale.service';
import {
  WEIGHING_FLOW_STEPS,
  averageReadings,
  computeNetWeight,
  computeStabilityScore,
  generateWeighingNumber,
  hasBlockingErrors,
  isStable,
  validateNetWeight,
  validateWeighingCapture,
} from '../domain/weighing.engine';

@Injectable()
export class CoffeeWeighingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
    private readonly scales: CoffeeScaleService,
  ) {}

  async listPending(organizationId: string, purchaseCenterId?: string) {
    return this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        status: { in: ['arrived', 'queued', 'receiving', 'identity_validated'] },
        ...(purchaseCenterId ? { purchaseCenterId } : {}),
      },
      include: { queueTurn: true, weighingSessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: [{ turnNumber: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
  }

  listSessions(organizationId: string, status?: string) {
    return this.prisma.cpepWeighingSession.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'pending' } : {}),
      },
      include: {
        ticket: { select: { ticketKey: true, producerName: true, turnNumber: true, status: true } },
        scale: true,
        readings: { orderBy: { recordedAt: 'desc' }, take: 20 },
        alerts: { where: { resolved: false }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepWeighingSession.findFirst({
      where: { organizationId, sessionKey },
      include: {
        ticket: true,
        scale: true,
        weighings: { orderBy: { recordedAt: 'asc' } },
        readings: { orderBy: { recordedAt: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException(`Sesión de pesaje ${sessionKey} no encontrada`);
    return {
      ...session,
      flow: WEIGHING_FLOW_STEPS.map((s) => ({
        ...s,
        done: session.step >= s.step || this.stepDone(session.status, s.key),
        current: session.step === s.step,
      })),
    };
  }

  history(organizationId: string, ticketKey?: string) {
    return this.prisma.cpepWeighing.findMany({
      where: {
        ticket: {
          organizationId,
          ...(ticketKey ? { ticketKey } : {}),
        },
      },
      include: {
        ticket: { select: { ticketKey: true, producerName: true, purchaseCenterId: true } },
        scale: true,
        session: { select: { sessionKey: true, weighingNumber: true, status: true } },
      },
      orderBy: { recordedAt: 'desc' },
      take: 500,
    });
  }

  listAlerts(organizationId: string, unresolvedOnly = true) {
    return this.prisma.cpepWeighingAlert.findMany({
      where: {
        organizationId,
        ...(unresolvedOnly ? { resolved: false } : {}),
      },
      include: { scale: true, session: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async startSession(
    organizationId: string,
    userId: string,
    ticketKey: string,
    options?: { purchaseCenterId?: string; scaleKey?: string; contingency?: boolean },
  ) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    if (['weighed', 'quality_pending', 'quality_done', 'settlement_pending', 'settled', 'inventory_posted'].includes(ticket.status)) {
      throw new BadRequestException(`Ticket ${ticketKey} ya fue pesado (status=${ticket.status})`);
    }

    const open = await this.prisma.cpepWeighingSession.findFirst({
      where: {
        organizationId,
        ticketId: ticket.id,
        status: { notIn: ['confirmed', 'sent_to_quality', 'cancelled'] },
      },
    });
    if (open) return this.getSession(organizationId, open.sessionKey);

    const count = await this.prisma.cpepWeighingSession.count({ where: { organizationId } });
    const weighingNumber = generateWeighingNumber(ticketKey, count + 1);
    const sessionKey = `WS-${ticketKey}-${Date.now()}`;

    let scale = options?.scaleKey
      ? await this.scales.findOne(organizationId, options.scaleKey)
      : await this.scales.selectAvailable(organizationId, options?.purchaseCenterId ?? ticket.purchaseCenterId ?? undefined);

    const session = await this.prisma.cpepWeighingSession.create({
      data: {
        organizationId,
        sessionKey,
        weighingNumber,
        ticketId: ticket.id,
        scaleId: scale.id,
        status: options?.contingency ? 'contingency' : 'scale_selected',
        step: 2,
        operatorId: userId,
        purchaseCenterId: options?.purchaseCenterId ?? ticket.purchaseCenterId,
        source: options?.contingency ? 'manual_contingency' : 'iot',
        contingency: !!options?.contingency,
        iotDeviceKey: scale.iotDeviceKey,
        firmwareVersion: scale.firmwareVersion,
        locationLabel: scale.locationLabel,
        latitude: scale.latitude,
        longitude: scale.longitude,
      },
    });

    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { status: 'receiving', wizardStep: Math.max(ticket.wizardStep, 10) },
    });

    if (!options?.contingency) {
      await this.scales.markStatus(organizationId, scale.scaleKey, 'busy', userId);
    }

    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'started', userId, {
      ticketKey,
      scaleKey: scale.scaleKey,
      weighingNumber,
      contingency: !!options?.contingency,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeWeighing',
      session.id,
      EVENT_TYPES.COFFEE_WEIGHING_STARTED,
      { ticketKey, sessionKey, weighingNumber, scaleKey: scale.scaleKey },
    );

    return this.getSession(organizationId, sessionKey);
  }

  async selectScale(organizationId: string, userId: string, sessionKey: string, scaleKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (session.scaleId) {
      const prev = await this.prisma.cpepScale.findUnique({ where: { id: session.scaleId } });
      if (prev) await this.scales.markStatus(organizationId, prev.scaleKey, 'available', userId);
    }
    const scale = await this.scales.findOne(organizationId, scaleKey);
    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        scaleId: scale.id,
        status: 'scale_selected',
        step: 2,
        iotDeviceKey: scale.iotDeviceKey,
        firmwareVersion: scale.firmwareVersion,
        locationLabel: scale.locationLabel,
        latitude: scale.latitude,
        longitude: scale.longitude,
      },
    });
    await this.scales.markStatus(organizationId, scaleKey, 'busy', userId);
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'scale_selected', userId, { scaleKey });
    return this.getSession(organizationId, sessionKey);
  }

  async verifyScale(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (!session.scaleId) throw new BadRequestException('Sesión sin balanza asignada');
    const scale = await this.prisma.cpepScale.findUnique({ where: { id: session.scaleId } });
    if (!scale) throw new BadRequestException('Balanza no encontrada');

    const diagnosis = await this.scales.diagnose(organizationId, scale.scaleKey);
    const issues = diagnosis.issues;
    if (hasBlockingErrors(issues) && !session.contingency) {
      await this.raiseAlert(organizationId, session, scale.id, 'SCALE_VERIFY_FAILED', 'error', issues[0]?.code ?? 'SCALE_OFFLINE', issues[0]?.message ?? 'Fallo verificación');
      throw new BadRequestException({ message: 'Balanza no verificada', issues });
    }

    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        status: 'scale_verified',
        step: 3,
        firmwareVersion: diagnosis.scale.firmwareVersion ?? session.firmwareVersion,
        validationErrors: issues as object[],
      },
    });
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'scale_verified', userId, { healthy: diagnosis.healthy });
    return this.getSession(organizationId, sessionKey);
  }

  async captureReading(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input: {
      weighingType: 'gross' | 'tare';
      weightKg?: number;
      source?: string;
      freeze?: boolean;
      average?: boolean;
      reread?: boolean;
      photoUrl?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    const scale = session.scaleId
      ? await this.prisma.cpepScale.findUnique({ where: { id: session.scaleId } })
      : null;

    let weightKg = input.weightKg;
    let source = input.source ?? (session.contingency ? 'manual_contingency' : 'iot');

    if (weightKg == null && scale?.iotDeviceKey && !session.contingency) {
      const reading = await this.readIotWeight(organizationId, scale.iotDeviceKey);
      weightKg = reading.weightKg;
      source = 'iot';
      await this.scales.heartbeat(organizationId, scale.scaleKey, {
        weightKg,
        stable: reading.stable,
        firmwareVersion: reading.firmwareVersion,
      });
    }

    if (weightKg == null) {
      throw new BadRequestException('No se pudo capturar peso (sin lectura IoT ni valor manual)');
    }

    const existingReadings = await this.prisma.cpepWeighingReading.findMany({
      where: { sessionId: session.id, weighingType: input.weighingType },
      orderBy: { sequence: 'asc' },
    });

    const samples = [
      ...existingReadings.map((r) => ({ weightKg: r.weightKg })),
      { weightKg },
    ];

    if (input.average && samples.length > 0) {
      weightKg = averageReadings(samples.map((s) => s.weightKg)) ?? weightKg;
    }

    const stabilityScore = computeStabilityScore(samples.map((s) => s.weightKg));
    const stable = isStable(samples.map((s) => s.weightKg)) || !!input.freeze;

    const issues = validateWeighingCapture({
      weightKg,
      readings: samples,
      scale: scale
        ? {
            minWeightKg: scale.minWeightKg,
            maxWeightKg: scale.maxWeightKg,
            certified: scale.certified,
            certificationExpiresAt: scale.certificationExpiresAt,
            status: scale.status,
            lastSeenAt: scale.lastSeenAt,
          }
        : undefined,
      requireStability: !input.freeze && !session.contingency,
      contingency: session.contingency,
      contingencyReason: session.contingencyReason ?? undefined,
    });

    for (const issue of issues.filter((i) => i.severity === 'error')) {
      await this.raiseAlert(
        organizationId,
        session,
        scale?.id,
        `READ_${issue.code}`,
        issue.severity,
        issue.code,
        issue.message,
      );
    }

    if (hasBlockingErrors(issues) && !session.contingency && !input.freeze) {
      throw new BadRequestException({ message: 'Lectura inválida', issues });
    }

    const sequence = existingReadings.length + 1;
    await this.prisma.cpepWeighingReading.create({
      data: {
        organizationId,
        sessionId: session.id,
        scaleId: scale?.id,
        ticketId: session.ticketId,
        weighingType: input.weighingType,
        weightKg,
        source,
        isStable: stable,
        isFrozen: !!input.freeze,
        stabilityScore,
        sequence,
        operatorId: userId,
        metadata: {
          reread: !!input.reread,
          average: !!input.average,
        },
      },
    });

    const status =
      input.weighingType === 'gross'
        ? ('capturing_gross' as const)
        : ('capturing_tare' as const);

    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        status,
        step: input.weighingType === 'gross' ? 4 : 6,
        stabilityOk: stable,
        photoUrl: input.photoUrl ?? session.photoUrl,
        latitude: input.latitude ?? session.latitude,
        longitude: input.longitude ?? session.longitude,
        source,
        validationErrors: issues as object[],
        ...(input.weighingType === 'gross' && input.freeze ? { frozenGross: true, grossWeightKg: weightKg } : {}),
        ...(input.weighingType === 'tare' && input.freeze ? { frozenTare: true, tareWeightKg: weightKg } : {}),
        ...(input.weighingType === 'gross' && !input.freeze ? { grossWeightKg: weightKg } : {}),
        ...(input.weighingType === 'tare' && !input.freeze ? { tareWeightKg: weightKg } : {}),
      },
    });

    await this.audit.log(organizationId, 'WeighingSession', sessionKey, `reading_${input.weighingType}`, userId, {
      weightKg,
      source,
      stable,
      freeze: !!input.freeze,
      issues,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeWeighing',
      session.id,
      EVENT_TYPES.COFFEE_WEIGHING_READING,
      { sessionKey, weighingType: input.weighingType, weightKg, stable },
    );

    return this.getSession(organizationId, sessionKey);
  }

  async confirmGross(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    const weight = session.grossWeightKg ?? (await this.latestReading(session.id, 'gross'));
    if (weight == null) throw new BadRequestException('Sin peso bruto capturado');

    await this.persistWeighingRecord(session, 'gross', weight, userId);
    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: { status: 'gross_confirmed', step: 5, grossWeightKg: weight },
    });
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'gross_confirmed', userId, { weight });
    return this.getSession(organizationId, sessionKey);
  }

  async confirmTare(organizationId: string, userId: string, sessionKey: string, skipTare = false) {
    const session = await this.requireSession(organizationId, sessionKey);
    let tare = session.tareWeightKg ?? (await this.latestReading(session.id, 'tare'));
    if (skipTare) tare = tare ?? 0;
    if (tare == null) throw new BadRequestException('Sin peso de tara capturado');

    await this.persistWeighingRecord(session, 'tare', tare, userId);
    const net = computeNetWeight(session.grossWeightKg, tare);
    const netIssues = validateNetWeight(session.grossWeightKg, tare);

    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        status: 'net_calculated',
        step: 7,
        tareWeightKg: tare,
        netWeightKg: net,
        validationErrors: netIssues as object[],
      },
    });
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'tare_confirmed', userId, { tare, net });
    return this.getSession(organizationId, sessionKey);
  }

  async validateSession(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    const scale = session.scaleId
      ? await this.prisma.cpepScale.findUnique({ where: { id: session.scaleId } })
      : null;

    const grossReadings = await this.prisma.cpepWeighingReading.findMany({
      where: { sessionId: session.id, weighingType: 'gross' },
    });
    const tareReadings = await this.prisma.cpepWeighingReading.findMany({
      where: { sessionId: session.id, weighingType: 'tare' },
    });

    const issues = [
      ...validateWeighingCapture({
        weightKg: session.grossWeightKg,
        readings: grossReadings.map((r) => ({ weightKg: r.weightKg })),
        scale: scale
          ? {
              minWeightKg: scale.minWeightKg,
              maxWeightKg: scale.maxWeightKg,
              certified: scale.certified,
              certificationExpiresAt: scale.certificationExpiresAt,
              status: scale.status,
              lastSeenAt: scale.lastSeenAt,
            }
          : undefined,
        contingency: session.contingency,
        contingencyReason: session.contingencyReason ?? undefined,
      }),
      ...validateWeighingCapture({
        weightKg: session.tareWeightKg,
        readings: tareReadings.map((r) => ({ weightKg: r.weightKg })),
        scale: scale
          ? {
              minWeightKg: scale.minWeightKg,
              maxWeightKg: scale.maxWeightKg,
              certified: scale.certified,
              certificationExpiresAt: scale.certificationExpiresAt,
              status: scale.status,
              lastSeenAt: scale.lastSeenAt,
            }
          : undefined,
        contingency: session.contingency,
        contingencyReason: session.contingencyReason ?? undefined,
      }),
      ...validateNetWeight(session.grossWeightKg, session.tareWeightKg),
    ];

    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        status: 'validating',
        step: 8,
        validationErrors: issues as object[],
        stabilityOk: isStable(grossReadings.map((r) => r.weightKg)) || session.frozenGross,
      },
    });

    if (hasBlockingErrors(issues) && !session.contingency) {
      throw new BadRequestException({ message: 'Validación de pesaje fallida', issues });
    }

    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'validated', userId, { issues });
    return this.getSession(organizationId, sessionKey);
  }

  async confirmFinal(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (session.netWeightKg == null) {
      const net = computeNetWeight(session.grossWeightKg, session.tareWeightKg);
      if (net == null) throw new BadRequestException('No se puede confirmar sin peso neto');
      await this.prisma.cpepWeighingSession.update({
        where: { id: session.id },
        data: { netWeightKg: net },
      });
    }

    const current = await this.requireSession(organizationId, sessionKey);
    await this.persistWeighingRecord(current, 'net', current.netWeightKg!, userId);

    await this.prisma.cpepReceptionTicket.update({
      where: { id: current.ticketId },
      data: {
        grossWeightKg: current.grossWeightKg,
        tareWeightKg: current.tareWeightKg,
        netWeightKg: current.netWeightKg,
        weightSource: current.source,
        iotDeviceKey: current.iotDeviceKey,
        weightValidated: true,
        status: 'weighed',
      },
    });

    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: current.ticketId,
        eventKey: `weighing-${current.weighingNumber}`,
        action: `Pesaje confirmado neto ${current.netWeightKg} kg`,
        details: {
          weighingNumber: current.weighingNumber,
          sessionKey,
          source: current.source,
          contingency: current.contingency,
          gross: current.grossWeightKg,
          tare: current.tareWeightKg,
          net: current.netWeightKg,
        },
      },
    });

    if (current.scaleId) {
      const scale = await this.prisma.cpepScale.findUnique({ where: { id: current.scaleId } });
      if (scale) await this.scales.markStatus(organizationId, scale.scaleKey, 'available', userId);
    }

    await this.prisma.cpepWeighingSession.update({
      where: { id: current.id },
      data: { status: 'confirmed', step: 9, confirmedAt: new Date() },
    });

    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: current.ticketId } });
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'confirmed', userId, {
      net: current.netWeightKg,
      weighingNumber: current.weighingNumber,
      contingency: current.contingency,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeWeighing',
      current.id,
      EVENT_TYPES.COFFEE_WEIGHING_CONFIRMED,
      { sessionKey, ticketKey: ticket?.ticketKey, net: current.netWeightKg },
    );
    await this.core.emitUserAction(
      organizationId,
      'CoffeeTicket',
      current.ticketId,
      EVENT_TYPES.COFFEE_WEIGHED,
      { ticketKey: ticket?.ticketKey, net: current.netWeightKg, weighingNumber: current.weighingNumber },
    );

    return this.getSession(organizationId, sessionKey);
  }

  async sendToQuality(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (session.status !== 'confirmed' && session.status !== 'sent_to_quality') {
      await this.confirmFinal(organizationId, userId, sessionKey);
    }
    const current = await this.requireSession(organizationId, sessionKey);
    await this.prisma.cpepReceptionTicket.update({
      where: { id: current.ticketId },
      data: { status: 'quality_pending' },
    });
    await this.prisma.cpepWeighingSession.update({
      where: { id: current.id },
      data: { status: 'sent_to_quality', step: 10, sentToQualityAt: new Date() },
    });
    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: current.ticketId,
        eventKey: `quality-queue-${Date.now()}`,
        action: 'Enviado a control de calidad',
        details: { sessionKey, weighingNumber: current.weighingNumber },
      },
    });
    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: current.ticketId } });
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'sent_to_quality', userId);
    await this.core.emitUserAction(
      organizationId,
      'CoffeeWeighing',
      current.id,
      EVENT_TYPES.COFFEE_SENT_TO_QUALITY,
      { sessionKey, ticketKey: ticket?.ticketKey },
    );
    return this.getSession(organizationId, sessionKey);
  }

  async enableContingency(
    organizationId: string,
    userId: string,
    sessionKey: string,
    reason: string,
    authorizedBy?: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('Justificación obligatoria en contingencia');
    const session = await this.requireSession(organizationId, sessionKey);
    await this.prisma.cpepWeighingSession.update({
      where: { id: session.id },
      data: {
        contingency: true,
        contingencyReason: reason,
        contingencyAuthorizedBy: authorizedBy ?? userId,
        status: 'contingency',
        source: 'manual_contingency',
      },
    });
    await this.raiseAlert(
      organizationId,
      session,
      session.scaleId ?? undefined,
      'CONTINGENCY_MODE',
      'warning',
      'CONTINGENCY',
      reason,
    );
    await this.audit.log(organizationId, 'WeighingSession', sessionKey, 'contingency_enabled', userId, {
      reason,
      authorizedBy: authorizedBy ?? userId,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeWeighing',
      session.id,
      EVENT_TYPES.COFFEE_WEIGHING_CONTINGENCY,
      { sessionKey, reason },
    );
    return this.getSession(organizationId, sessionKey);
  }

  async manualCapture(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input: {
      weighingType: 'gross' | 'tare';
      weightKg: number;
      reason: string;
      photoUrl?: string;
    },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    if (!session.contingency) {
      await this.enableContingency(organizationId, userId, sessionKey, input.reason);
    }
    return this.captureReading(organizationId, userId, sessionKey, {
      weighingType: input.weighingType,
      weightKg: input.weightKg,
      source: 'manual_contingency',
      freeze: true,
      photoUrl: input.photoUrl,
    });
  }

  async syncPendingContingency(organizationId: string, userId: string) {
    const sessions = await this.prisma.cpepWeighingSession.findMany({
      where: {
        organizationId,
        contingency: true,
        status: { in: ['confirmed', 'sent_to_quality'] },
      },
      include: { scale: true },
      take: 50,
    });
    const synced = [];
    for (const session of sessions) {
      if (!session.scale?.scaleKey) continue;
      try {
        await this.scales.heartbeat(organizationId, session.scale.scaleKey, {
          weightKg: session.netWeightKg ?? undefined,
        });
        await this.audit.log(organizationId, 'WeighingSession', session.sessionKey, 'contingency_synced', userId);
        synced.push(session.sessionKey);
      } catch {
        // scale still unavailable
      }
    }
    return { synced, count: synced.length };
  }

  async quickWeigh(
    organizationId: string,
    userId: string,
    ticketKey: string,
    input: {
      grossWeightKg?: number;
      tareWeightKg?: number;
      source?: string;
      iotDeviceKey?: string;
      scaleKey?: string;
      contingency?: boolean;
      contingencyReason?: string;
      photoUrl?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const session = await this.startSession(organizationId, userId, ticketKey, {
      scaleKey: input.scaleKey ?? input.iotDeviceKey,
      contingency: input.contingency,
    });
    if (input.contingency && input.contingencyReason) {
      await this.enableContingency(organizationId, userId, session.sessionKey, input.contingencyReason);
    }
    if (!input.contingency) {
      try {
        await this.verifyScale(organizationId, userId, session.sessionKey);
      } catch {
        if (!input.contingencyReason) throw new BadRequestException('Balanza no verificada; use contingencia con justificación');
        await this.enableContingency(organizationId, userId, session.sessionKey, input.contingencyReason);
      }
    }
    if (input.grossWeightKg != null) {
      await this.captureReading(organizationId, userId, session.sessionKey, {
        weighingType: 'gross',
        weightKg: input.grossWeightKg,
        source: input.source,
        freeze: true,
        photoUrl: input.photoUrl,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    } else if (!input.contingency) {
      await this.captureReading(organizationId, userId, session.sessionKey, {
        weighingType: 'gross',
        freeze: true,
      });
    }
    await this.confirmGross(organizationId, userId, session.sessionKey);

    if (input.tareWeightKg != null) {
      await this.captureReading(organizationId, userId, session.sessionKey, {
        weighingType: 'tare',
        weightKg: input.tareWeightKg,
        source: input.source,
        freeze: true,
      });
      await this.confirmTare(organizationId, userId, session.sessionKey);
    } else {
      try {
        if (!input.contingency) {
          await this.captureReading(organizationId, userId, session.sessionKey, {
            weighingType: 'tare',
            freeze: true,
          });
        }
        await this.confirmTare(organizationId, userId, session.sessionKey, input.contingency);
      } catch {
        await this.confirmTare(organizationId, userId, session.sessionKey, true);
      }
    }
    await this.validateSession(organizationId, userId, session.sessionKey);
    await this.confirmFinal(organizationId, userId, session.sessionKey);
    return this.sendToQuality(organizationId, userId, session.sessionKey);
  }

  async monitor(organizationId: string) {
    const [scales, activeSessions, alerts, recentReadings] = await Promise.all([
      this.scales.list(organizationId),
      this.prisma.cpepWeighingSession.findMany({
        where: {
          organizationId,
          status: { notIn: ['sent_to_quality', 'cancelled'] },
        },
        include: { ticket: { select: { ticketKey: true, producerName: true } }, scale: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.listAlerts(organizationId, true),
      this.prisma.cpepWeighingReading.findMany({
        where: { organizationId },
        orderBy: { recordedAt: 'desc' },
        take: 30,
      }),
    ]);
    return {
      scales,
      activeSessions,
      alerts,
      recentReadings,
      summary: {
        availableScales: scales.filter((s) => s.status === 'available').length,
        busyScales: scales.filter((s) => s.status === 'busy').length,
        offlineScales: scales.filter((s) => s.status === 'offline' || s.status === 'error').length,
        openSessions: activeSessions.length,
        openAlerts: alerts.length,
      },
    };
  }

  private async readIotWeight(organizationId: string, deviceKey: string) {
    const device = await this.prisma.eiesdpDevice.findFirst({
      where: { organizationId, deviceKey, deletedAt: null, deviceType: 'electronic_scale' },
    });
    if (!device) throw new BadRequestException(`Dispositivo IoT ${deviceKey} no encontrado`);

    const reading = await this.prisma.eiesdpTelemetryReading.findFirst({
      where: { organizationId, deviceKey, metricKey: { in: ['weight_kg', 'weight', 'value', 'gross_kg'] } },
      orderBy: { recordedAt: 'desc' },
    });

    const meta = (device.metadata ?? {}) as Record<string, unknown>;
    const weightKg =
      reading?.value ??
      Number(meta.lastWeightKg ?? meta.weightKg ?? 0);

    if (!weightKg || weightKg <= 0) {
      throw new BadRequestException('Sin lectura válida de balanza IoT');
    }

    const twin = await this.prisma.eiesdpDigitalTwin.findFirst({
      where: { deviceId: device.id },
    });
    const reported = (twin?.reportedState ?? {}) as Record<string, unknown>;
    const stable = Boolean(reported.stable ?? meta.stable ?? true);

    return {
      weightKg,
      stable,
      firmwareVersion: device.firmwareVersion ?? undefined,
    };
  }

  private async latestReading(sessionId: string, weighingType: 'gross' | 'tare') {
    const reading = await this.prisma.cpepWeighingReading.findFirst({
      where: { sessionId, weighingType },
      orderBy: { sequence: 'desc' },
    });
    return reading?.weightKg ?? null;
  }

  private async persistWeighingRecord(
    session: {
      id: string;
      ticketId: string;
      scaleId: string | null;
      weighingNumber: string;
      source: string;
      iotDeviceKey: string | null;
      firmwareVersion: string | null;
      contingency: boolean;
      contingencyReason: string | null;
      photoUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      locationLabel: string | null;
      purchaseCenterId: string | null;
      operatorId: string | null;
      stabilityOk: boolean;
      frozenGross: boolean;
      frozenTare: boolean;
    },
    weighingType: string,
    weightKg: number,
    userId: string,
  ) {
    const readingCount = await this.prisma.cpepWeighingReading.count({
      where: {
        sessionId: session.id,
        ...(weighingType === 'net' ? {} : { weighingType }),
      },
    });
    return this.prisma.cpepWeighing.create({
      data: {
        ticketId: session.ticketId,
        sessionId: session.id,
        scaleId: session.scaleId,
        weighingNumber: session.weighingNumber,
        weighingType,
        weightKg,
        source: session.source,
        iotDeviceKey: session.iotDeviceKey,
        firmwareVersion: session.firmwareVersion,
        isStable: session.stabilityOk,
        isFrozen: weighingType === 'gross' ? session.frozenGross : session.frozenTare,
        isAverage: readingCount > 1,
        readingCount: Math.max(1, readingCount),
        contingency: session.contingency,
        contingencyReason: session.contingencyReason,
        photoUrl: session.photoUrl,
        latitude: session.latitude,
        longitude: session.longitude,
        locationLabel: session.locationLabel,
        purchaseCenterId: session.purchaseCenterId,
        operatorId: session.operatorId ?? userId,
        validatedBy: userId,
        validatedAt: new Date(),
      },
    });
  }

  private async raiseAlert(
    organizationId: string,
    session: { id: string; ticketId: string },
    scaleId: string | undefined | null,
    alertKey: string,
    severity: string,
    code: string,
    message: string,
  ) {
    return this.prisma.cpepWeighingAlert.create({
      data: {
        organizationId,
        sessionId: session.id,
        scaleId: scaleId ?? undefined,
        ticketId: session.ticketId,
        alertKey: `${alertKey}-${Date.now()}`,
        severity,
        code,
        message,
      },
    });
  }

  private async requireTicket(organizationId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketKey} no encontrado`);
    return ticket;
  }

  private async requireSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepWeighingSession.findFirst({
      where: { organizationId, sessionKey },
    });
    if (!session) throw new NotFoundException(`Sesión ${sessionKey} no encontrada`);
    return session;
  }

  private stepDone(status: string, key: string): boolean {
    const order = [
      'pending',
      'scale_selected',
      'scale_verified',
      'capturing_gross',
      'gross_confirmed',
      'capturing_tare',
      'tare_confirmed',
      'net_calculated',
      'validating',
      'confirmed',
      'sent_to_quality',
    ];
    const map: Record<string, string> = {
      reception: 'pending',
      select_scale: 'scale_selected',
      verify_scale: 'scale_verified',
      capture_gross: 'capturing_gross',
      confirm_gross: 'gross_confirmed',
      capture_tare: 'capturing_tare',
      compute_net: 'net_calculated',
      validate: 'validating',
      confirm: 'confirmed',
      quality: 'sent_to_quality',
    };
    const target = map[key];
    if (!target) return false;
    return order.indexOf(status) >= order.indexOf(target);
  }
}
