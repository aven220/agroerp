import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EVENT_TYPES, CpepQualityInput } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { BreExecutorService } from '@/core/ebre/application/bre-executor.service';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeAuditService } from './coffee-audit.service';
import { CoffeeReceptionRulesService } from './coffee-reception-rules.service';
import { CoffeeParameterService } from './coffee-parameter.service';
import {
  DEFAULT_QUALITY_THRESHOLDS,
  QUALITY_FLOW_STEPS,
  QualityDecision,
  QualityParameters,
  QualityThresholds,
  computeDefectsTotal,
  evaluateQualityRules,
  generateCustodyCode,
  generateSampleKey,
  mergeBreActions,
  ticketStatusForDecision,
} from '../domain/quality.engine';

@Injectable()
export class CoffeeQualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly reception: CoffeeReceptionService,
    private readonly audit: CoffeeAuditService,
    private readonly receptionRules: CoffeeReceptionRulesService,
    private readonly parameters: CoffeeParameterService,
    @Optional() private readonly bre?: BreExecutorService,
  ) {}

  async listPending(organizationId: string) {
    return this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        status: { in: ['weighed', 'quality_pending', 'quality_lab'] },
      },
      include: {
        quality: true,
        samples: true,
        photos: { where: { photoType: { in: ['quality', 'sample', 'reception'] } } },
        qualitySessions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
  }

  listSessions(organizationId: string, status?: string) {
    return this.prisma.cpepQualitySession.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'pending' } : {}),
      },
      include: {
        ticket: {
          select: {
            ticketKey: true,
            producerName: true,
            farmName: true,
            lotCode: true,
            netWeightKg: true,
            status: true,
          },
        },
        assessments: true,
        alerts: { where: { resolved: false } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepQualitySession.findFirst({
      where: { organizationId, sessionKey },
      include: {
        ticket: {
          include: {
            samples: true,
            photos: true,
            quality: true,
            weighings: { where: { weighingType: 'net' }, take: 1 },
          },
        },
        assessments: true,
        alerts: { orderBy: { createdAt: 'desc' } },
        decisionLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException(`Sesión de calidad ${sessionKey} no encontrada`);
    return {
      ...session,
      flow: QUALITY_FLOW_STEPS.map((s) => ({
        ...s,
        done: session.step >= s.step,
        current: session.step === s.step,
      })),
    };
  }

  history(
    organizationId: string,
    filters?: { producerId?: string; farmId?: string; lotId?: string; lotCode?: string },
  ) {
    return this.prisma.cpepQualityAssessment.findMany({
      where: {
        organizationId,
        ticket: {
          ...(filters?.producerId ? { producerId: filters.producerId } : {}),
          ...(filters?.farmId ? { farmId: filters.farmId } : {}),
          ...(filters?.lotId ? { lotId: filters.lotId } : {}),
          ...(filters?.lotCode ? { lotCode: filters.lotCode } : {}),
        },
      },
      include: {
        ticket: {
          select: {
            ticketKey: true,
            producerName: true,
            producerId: true,
            farmName: true,
            farmId: true,
            lotCode: true,
            lotId: true,
            netWeightKg: true,
            createdAt: true,
          },
        },
      },
      orderBy: { assessedAt: 'desc' },
      take: 200,
    });
  }

  async comparatives(organizationId: string, producerId: string) {
    const rows = await this.history(organizationId, { producerId });
    const humidity = rows.map((r) => r.humidityPct).filter((v): v is number => v != null);
    const factor = rows.map((r) => r.factor).filter((v): v is number => v != null);
    const scores = rows.map((r) => r.qualityScore).filter((v): v is number => v != null);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      samples: rows.length,
      avgHumidity: avg(humidity),
      avgFactor: avg(factor),
      avgScore: avg(scores),
      grades: rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.grade] = (acc[r.grade] ?? 0) + 1;
        return acc;
      }, {}),
      decisions: rows.reduce<Record<string, number>>((acc, r) => {
        const d = r.decision ?? 'unknown';
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {}),
      recent: rows.slice(0, 10),
    };
  }

  async indicators(organizationId: string) {
    const [pending, accepted, rejected, lab, conditioned, alerts] = await Promise.all([
      this.prisma.cpepReceptionTicket.count({
        where: { organizationId, status: { in: ['weighed', 'quality_pending'] } },
      }),
      this.prisma.cpepQualityAssessment.count({
        where: { organizationId, decision: { in: ['accepted', 'accepted_with_observations'] } },
      }),
      this.prisma.cpepQualityAssessment.count({ where: { organizationId, decision: 'rejected' } }),
      this.prisma.cpepQualityAssessment.count({ where: { organizationId, decision: 'requires_lab' } }),
      this.prisma.cpepQualityAssessment.count({ where: { organizationId, decision: 'conditioned' } }),
      this.prisma.cpepQualityAlert.count({ where: { organizationId, resolved: false } }),
    ]);
    const recent = await this.prisma.cpepQualityAssessment.findMany({
      where: { organizationId },
      orderBy: { assessedAt: 'desc' },
      take: 50,
      select: { qualityScore: true, humidityPct: true, factor: true, decision: true },
    });
    const scores = recent.map((r) => r.qualityScore).filter((v): v is number => v != null);
    return {
      pending,
      accepted,
      rejected,
      lab,
      conditioned,
      openAlerts: alerts,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      acceptanceRate: accepted + rejected + conditioned > 0
        ? accepted / (accepted + rejected + conditioned)
        : 0,
    };
  }

  listAlerts(organizationId: string, unresolvedOnly = true) {
    return this.prisma.cpepQualityAlert.findMany({
      where: {
        organizationId,
        ...(unresolvedOnly ? { resolved: false } : {}),
      },
      include: { session: true, assessment: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listPhotos(organizationId: string, ticketKey?: string) {
    return this.prisma.cpepPhoto.findMany({
      where: {
        photoType: { in: ['quality', 'sample'] },
        ticket: {
          organizationId,
          ...(ticketKey ? { ticketKey } : {}),
        },
      },
      include: { ticket: { select: { ticketKey: true, producerName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async startSession(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    if (!['weighed', 'quality_pending', 'quality_lab', 'quality_done'].includes(ticket.status) && ticket.netWeightKg == null) {
      throw new BadRequestException('Ticket sin pesaje confirmado');
    }

    const open = await this.prisma.cpepQualitySession.findFirst({
      where: {
        organizationId,
        ticketId: ticket.id,
        status: { notIn: ['sent_to_settlement', 'rejected', 'cancelled'] },
      },
    });
    if (open) return this.getSession(organizationId, open.sessionKey);

    const sessionKey = `QS-${ticketKey}-${Date.now()}`;
    const session = await this.prisma.cpepQualitySession.create({
      data: {
        organizationId,
        sessionKey,
        ticketId: ticket.id,
        status: 'pending',
        step: 1,
        inspectorId: userId,
        lotCode: ticket.lotCode,
        lotId: ticket.lotId,
        farmId: ticket.farmId,
        farmName: ticket.farmName,
        producerId: ticket.producerId,
        producerName: ticket.producerName,
        netWeightKg: ticket.netWeightKg,
      },
    });

    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { status: 'quality_pending' },
    });

    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'started', userId, { ticketKey });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeQuality',
      session.id,
      EVENT_TYPES.COFFEE_QUALITY_STARTED,
      { ticketKey, sessionKey },
    );

    return this.getSession(organizationId, sessionKey);
  }

  async identifyLot(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input: { lotCode?: string; lotId?: string; farmId?: string; farmName?: string },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: {
        lotCode: input.lotCode ?? session.lotCode,
        lotId: input.lotId ?? session.lotId,
        farmId: input.farmId ?? session.farmId,
        farmName: input.farmName ?? session.farmName,
        status: 'lot_identified',
        step: 2,
      },
    });
    if (input.lotCode || input.lotId || input.farmId || input.farmName) {
      await this.prisma.cpepReceptionTicket.update({
        where: { id: session.ticketId },
        data: {
          lotCode: input.lotCode,
          lotId: input.lotId,
          farmId: input.farmId,
          farmName: input.farmName,
        },
      });
    }
    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'lot_identified', userId, input);
    return this.getSession(organizationId, sessionKey);
  }

  async registerSample(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input?: { sampleKey?: string; weightGrams?: number; physicalLocation?: string; notes?: string },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    const count = await this.prisma.cpepSample.count({ where: { ticketId: session.ticketId } });
    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: session.ticketId } });
    const sampleKey = input?.sampleKey ?? generateSampleKey(ticket?.ticketKey ?? sessionKey, count + 1);
    const custodyCode = generateCustodyCode(sampleKey);

    const sample = await this.prisma.cpepSample.create({
      data: {
        organizationId,
        ticketId: session.ticketId,
        sampleKey,
        sampleType: 'quality',
        weightGrams: input?.weightGrams,
        custodyCode,
        status: 'in_custody',
        physicalLocation: input?.physicalLocation ?? 'Mesa calidad',
        notes: input?.notes,
        collectedBy: userId,
      },
    });

    await this.prisma.cpepSampleCustodyEvent.create({
      data: {
        organizationId,
        sampleId: sample.id,
        eventType: 'collected',
        toLocation: sample.physicalLocation,
        toStatus: sample.status,
        actorId: userId,
        notes: 'Muestra registrada en control de calidad',
      },
    });

    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: { sampleId: sample.id, status: 'sample_registered', step: 3 },
    });

    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: session.ticketId,
        eventKey: `sample-${sampleKey}`,
        action: `Muestra ${sampleKey} en custodia`,
        details: { custodyCode, location: sample.physicalLocation },
      },
    });

    await this.audit.log(organizationId, 'Sample', sampleKey, 'registered', userId, { custodyCode });
    return this.getSession(organizationId, sessionKey);
  }

  async addPhoto(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input: { photoKey: string; storageUrl?: string; caption?: string },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    await this.prisma.cpepPhoto.create({
      data: {
        ticketId: session.ticketId,
        photoKey: input.photoKey,
        photoType: 'quality',
        storageUrl: input.storageUrl,
        caption: input.caption,
      },
    });
    const photoKeys = [...session.photoKeys, input.photoKey];
    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: { photoKeys, status: 'photos_captured', step: Math.max(session.step, 4) },
    });
    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'photo_added', userId, input);
    return this.getSession(organizationId, sessionKey);
  }

  async recordParameters(
    organizationId: string,
    userId: string,
    sessionKey: string,
    params: QualityParameters & { observations?: string; inspectorComments?: string },
  ) {
    const session = await this.requireSession(organizationId, sessionKey);
    const parameters = {
      humidityPct: params.humidityPct,
      temperatureC: params.temperatureC,
      factor: params.factor,
      pasillaPct: params.pasillaPct,
      brocaPct: params.brocaPct,
      blackBeansPct: params.blackBeansPct,
      vinegarBeansPct: params.vinegarBeansPct,
      brokenBeansPct: params.brokenBeansPct,
      foreignMatterPct: params.foreignMatterPct,
      impuritiesPct: params.impuritiesPct,
      defectsPct: params.defectsPct ?? computeDefectsTotal(params),
      color: params.color,
      odor: params.odor,
      observations: params.observations,
      inspectorComments: params.inspectorComments,
    };

    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: {
        parameters: parameters as object,
        status: 'parameters_recorded',
        step: 5,
      },
    });
    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'parameters_recorded', userId, parameters);
    return this.getSession(organizationId, sessionKey);
  }

  async calculateAndApplyRules(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    const params = (session.parameters ?? {}) as QualityParameters & {
      observations?: string;
      inspectorComments?: string;
    };
    if (!Object.keys(params).length) {
      throw new BadRequestException('Sin parámetros de calidad registrados');
    }

    const thresholds = await this.resolveThresholds(organizationId, session.ticketId);
    let evaluation = evaluateQualityRules(params, thresholds, {
      observations: params.observations ?? params.inspectorComments,
    });

    const breResults = await this.applyBreRules(organizationId, userId, session, params, evaluation);
    evaluation = mergeBreActions(evaluation, breResults);

    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: {
        status: 'rules_applied',
        step: 7,
        qualityScore: evaluation.qualityScore,
        decision: evaluation.decision,
        decisionReason: evaluation.decisionReason,
        bonusesTotal: evaluation.bonusesTotal,
        penaltiesTotal: evaluation.penaltiesTotal,
        rulesApplied: evaluation.rulesApplied as object[],
        parameters: {
          ...params,
          defectsPct: evaluation.defectsTotalPct,
          grade: evaluation.grade,
        } as object,
      },
    });

    for (const alert of evaluation.alerts) {
      await this.prisma.cpepQualityAlert.create({
        data: {
          organizationId,
          sessionId: session.id,
          ticketId: session.ticketId,
          alertKey: `${alert.code}-${Date.now()}`,
          severity: alert.severity ?? 'warning',
          code: alert.code,
          message: alert.message,
          escalated: alert.action === 'escalate',
          inspectorId: userId,
        },
      });
    }

    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'rules_applied', userId, {
      decision: evaluation.decision,
      score: evaluation.qualityScore,
      rules: evaluation.rulesApplied,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeQuality',
      session.id,
      EVENT_TYPES.COFFEE_QUALITY_RULES_APPLIED,
      { sessionKey, decision: evaluation.decision, score: evaluation.qualityScore },
    );

    return this.getSession(organizationId, sessionKey);
  }

  async decide(
    organizationId: string,
    userId: string,
    sessionKey: string,
    input?: { decision?: QualityDecision; reason?: string; justification?: string },
  ) {
    let session = await this.requireSession(organizationId, sessionKey);
    if (session.status !== 'rules_applied' && session.status !== 'results_calculated' && !session.decision) {
      await this.calculateAndApplyRules(organizationId, userId, sessionKey);
      session = await this.requireSession(organizationId, sessionKey);
    }

    const decision = (input?.decision ?? session.decision ?? 'accepted') as QualityDecision;
    const reason = input?.reason ?? session.decisionReason ?? `Decisión ${decision}`;
    const params = (session.parameters ?? {}) as QualityParameters & {
      observations?: string;
      inspectorComments?: string;
      grade?: string;
    };

    const assessment = await this.prisma.cpepQualityAssessment.upsert({
      where: { ticketId: session.ticketId },
      update: {
        sessionId: session.id,
        humidityPct: params.humidityPct,
        temperatureC: params.temperatureC,
        factor: params.factor,
        pasillaPct: params.pasillaPct,
        brocaPct: params.brocaPct,
        blackBeansPct: params.blackBeansPct,
        vinegarBeansPct: params.vinegarBeansPct,
        brokenBeansPct: params.brokenBeansPct,
        foreignMatterPct: params.foreignMatterPct,
        impuritiesPct: params.impuritiesPct,
        defectsPct: params.defectsPct ?? computeDefectsTotal(params),
        color: params.color,
        odor: params.odor,
        grade: (params.grade ?? 'standard') as 'standard',
        qualityScore: session.qualityScore,
        decision,
        decisionReason: reason,
        inspectorComments: params.inspectorComments,
        observations: params.observations,
        bonusesTotal: session.bonusesTotal,
        penaltiesTotal: session.penaltiesTotal,
        rulesApplied: session.rulesApplied as object[],
        photoKeys: session.photoKeys,
        assessedBy: userId,
        assessedAt: new Date(),
        decidedAt: new Date(),
        requiresReview: decision === 'conditioned' || decision === 'requires_lab',
        escalated: false,
      },
      create: {
        organizationId,
        ticketId: session.ticketId,
        sessionId: session.id,
        humidityPct: params.humidityPct,
        temperatureC: params.temperatureC,
        factor: params.factor,
        pasillaPct: params.pasillaPct,
        brocaPct: params.brocaPct,
        blackBeansPct: params.blackBeansPct,
        vinegarBeansPct: params.vinegarBeansPct,
        brokenBeansPct: params.brokenBeansPct,
        foreignMatterPct: params.foreignMatterPct,
        impuritiesPct: params.impuritiesPct,
        defectsPct: params.defectsPct ?? computeDefectsTotal(params),
        color: params.color,
        odor: params.odor,
        grade: (params.grade ?? 'standard') as 'standard',
        qualityScore: session.qualityScore,
        decision,
        decisionReason: reason,
        inspectorComments: params.inspectorComments,
        observations: params.observations,
        bonusesTotal: session.bonusesTotal,
        penaltiesTotal: session.penaltiesTotal,
        rulesApplied: session.rulesApplied as object[],
        photoKeys: session.photoKeys,
        assessedBy: userId,
        assessedAt: new Date(),
        decidedAt: new Date(),
      },
    });

    await this.prisma.cpepQualityDecisionLog.create({
      data: {
        organizationId,
        sessionId: session.id,
        assessmentId: assessment.id,
        ticketId: session.ticketId,
        decision,
        previousDecision: session.decision,
        reason,
        justification: input?.justification,
        automatic: !input?.decision,
        rulesApplied: session.rulesApplied as object[],
        bonusesTotal: session.bonusesTotal,
        penaltiesTotal: session.penaltiesTotal,
        qualityScore: session.qualityScore,
        inspectorId: userId,
        results: params as object,
      },
    });

    if (session.sampleId) {
      await this.prisma.cpepSample.update({
        where: { id: session.sampleId },
        data: { status: decision === 'requires_lab' ? 'analyzing' : 'analyzed' },
      });
      await this.prisma.cpepSampleCustodyEvent.create({
        data: {
          organizationId,
          sampleId: session.sampleId,
          eventType: decision === 'requires_lab' ? 'sent_to_lab' : 'analyzed',
          fromStatus: 'in_custody',
          toStatus: decision === 'requires_lab' ? 'analyzing' : 'analyzed',
          actorId: userId,
          notes: reason,
        },
      });
    }

    const ticketStatus = ticketStatusForDecision(decision);
    await this.prisma.cpepReceptionTicket.update({
      where: { id: session.ticketId },
      data: { status: ticketStatus as 'quality_done' },
    });

    await this.prisma.cpepQualitySession.update({
      where: { id: session.id },
      data: {
        status: 'decided',
        step: 8,
        decision,
        decisionReason: reason,
        decidedAt: new Date(),
      },
    });

    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: session.ticketId,
        eventKey: `quality-decision-${Date.now()}`,
        action: `Calidad: ${decision}`,
        details: {
          score: session.qualityScore,
          bonuses: session.bonusesTotal,
          penalties: session.penaltiesTotal,
          reason,
        },
      },
    });

    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: session.ticketId } });
    await this.audit.log(organizationId, 'QualitySession', sessionKey, `decision_${decision}`, userId, {
      reason,
      justification: input?.justification,
      score: session.qualityScore,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeTicket',
      session.ticketId,
      EVENT_TYPES.COFFEE_QUALITY_RECORDED,
      { ticketKey: ticket?.ticketKey, decision, score: session.qualityScore },
    );
    await this.core.emitUserAction(
      organizationId,
      'CoffeeQuality',
      session.id,
      EVENT_TYPES.COFFEE_QUALITY_DECIDED,
      { sessionKey, ticketKey: ticket?.ticketKey, decision },
    );

    return this.routeDecision(organizationId, userId, sessionKey);
  }

  async routeDecision(organizationId: string, userId: string, sessionKey: string) {
    const session = await this.requireSession(organizationId, sessionKey);
    const decision = session.decision;
    if (!decision) throw new BadRequestException('Sesión sin decisión');

    if (decision === 'rejected') {
      await this.prisma.cpepQualitySession.update({
        where: { id: session.id },
        data: { status: 'rejected', step: 9, sentAt: new Date() },
      });
      await this.core.emitUserAction(
        organizationId,
        'CoffeeQuality',
        session.id,
        EVENT_TYPES.COFFEE_QUALITY_REJECTED,
        { sessionKey, reason: session.decisionReason },
      );
    } else if (decision === 'requires_lab') {
      await this.prisma.cpepQualitySession.update({
        where: { id: session.id },
        data: { status: 'decided', step: 9, sentAt: new Date() },
      });
      await this.core.emitUserAction(
        organizationId,
        'CoffeeQuality',
        session.id,
        EVENT_TYPES.COFFEE_QUALITY_LAB_REQUIRED,
        { sessionKey },
      );
    } else {
      await this.prisma.cpepReceptionTicket.update({
        where: { id: session.ticketId },
        data: { status: 'settlement_pending' },
      });
      await this.prisma.cpepQualitySession.update({
        where: { id: session.id },
        data: { status: 'sent_to_settlement', step: 9, sentAt: new Date() },
      });
      await this.core.emitUserAction(
        organizationId,
        'CoffeeQuality',
        session.id,
        EVENT_TYPES.COFFEE_SENT_TO_SETTLEMENT,
        { sessionKey },
      );
    }

    await this.audit.log(organizationId, 'QualitySession', sessionKey, 'routed', userId, { decision });
    return this.getSession(organizationId, sessionKey);
  }

  async reevaluate(
    organizationId: string,
    userId: string,
    ticketKey: string,
    input: CpepQualityInput & QualityParameters & { justification: string; decision?: QualityDecision },
  ) {
    if (!input.justification?.trim()) {
      throw new BadRequestException('Justificación obligatoria en reevaluación');
    }
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    const previous = ticket.quality;
    const session = await this.startSession(organizationId, userId, ticketKey);
    await this.identifyLot(organizationId, userId, session.sessionKey, {
      lotCode: ticket.lotCode ?? undefined,
      lotId: ticket.lotId ?? undefined,
      farmId: ticket.farmId ?? undefined,
      farmName: ticket.farmName ?? undefined,
    });
    await this.registerSample(organizationId, userId, session.sessionKey, {
      notes: `Reevaluación: ${input.justification}`,
    });
    await this.recordParameters(organizationId, userId, session.sessionKey, input);
    await this.calculateAndApplyRules(organizationId, userId, session.sessionKey);
    const decided = await this.decide(organizationId, userId, session.sessionKey, {
      decision: input.decision,
      reason: input.observations,
      justification: input.justification,
    });

    if (previous) {
      await this.prisma.cpepQualityAssessment.updateMany({
        where: { ticketId: ticket.id },
        data: { reevaluationOfId: previous.id, metadata: { previousDecision: previous.decision } },
      });
    }
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'quality_reevaluated', userId, {
      justification: input.justification,
      previousDecision: previous?.decision,
    });
    return decided;
  }

  /** Backward-compatible quick record used by existing endpoints */
  async record(organizationId: string, userId: string, ticketKey: string, input: CpepQualityInput) {
    const session = await this.startSession(organizationId, userId, ticketKey);
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    await this.identifyLot(organizationId, userId, session.sessionKey, {
      lotCode: ticket.lotCode ?? undefined,
      lotId: ticket.lotId ?? undefined,
      farmId: ticket.farmId ?? undefined,
      farmName: ticket.farmName ?? undefined,
    });
    await this.registerSample(organizationId, userId, session.sessionKey);
    await this.recordParameters(organizationId, userId, session.sessionKey, {
      ...input,
      inspectorComments: input.observations,
    });
    await this.calculateAndApplyRules(organizationId, userId, session.sessionKey);
    return this.decide(organizationId, userId, session.sessionKey, {
      reason: input.observations,
    });
  }

  async updateSampleCustody(
    organizationId: string,
    userId: string,
    sampleKey: string,
    input: { status?: string; physicalLocation?: string; notes?: string },
  ) {
    const sample = await this.prisma.cpepSample.findFirst({
      where: { sampleKey, ticket: { organizationId } },
    });
    if (!sample) throw new NotFoundException(`Muestra ${sampleKey} no encontrada`);

    const updated = await this.prisma.cpepSample.update({
      where: { id: sample.id },
      data: {
        status: (input.status as 'collected') ?? sample.status,
        physicalLocation: input.physicalLocation ?? sample.physicalLocation,
        notes: input.notes ?? sample.notes,
        reanalysisCount: input.status === 'reanalysis' ? sample.reanalysisCount + 1 : sample.reanalysisCount,
      },
    });

    await this.prisma.cpepSampleCustodyEvent.create({
      data: {
        organizationId,
        sampleId: sample.id,
        eventType: input.status ?? 'moved',
        fromLocation: sample.physicalLocation,
        toLocation: updated.physicalLocation,
        fromStatus: sample.status,
        toStatus: updated.status,
        actorId: userId,
        notes: input.notes,
      },
    });
    await this.audit.log(organizationId, 'Sample', sampleKey, 'custody_updated', userId, input);
    return updated;
  }

  async sampleHistory(organizationId: string, sampleKey: string) {
    const sample = await this.prisma.cpepSample.findFirst({
      where: { sampleKey, ticket: { organizationId } },
      include: {
        custodyEvents: { orderBy: { createdAt: 'asc' } },
        ticket: { select: { ticketKey: true, producerName: true, lotCode: true } },
      },
    });
    if (!sample) throw new NotFoundException(`Muestra ${sampleKey} no encontrada`);
    return sample;
  }

  listSamples(organizationId: string) {
    return this.prisma.cpepSample.findMany({
      where: { ticket: { organizationId } },
      include: {
        ticket: { select: { ticketKey: true, producerName: true, lotCode: true } },
        custodyEvents: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async quickEvaluate(
    organizationId: string,
    userId: string,
    ticketKey: string,
    input: QualityParameters & {
      observations?: string;
      inspectorComments?: string;
      photoKeys?: string[];
      decision?: QualityDecision;
    },
  ) {
    const session = await this.startSession(organizationId, userId, ticketKey);
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    await this.identifyLot(organizationId, userId, session.sessionKey, {
      lotCode: ticket.lotCode ?? undefined,
      farmName: ticket.farmName ?? undefined,
    });
    await this.registerSample(organizationId, userId, session.sessionKey);
    for (const photoKey of input.photoKeys ?? []) {
      await this.addPhoto(organizationId, userId, session.sessionKey, { photoKey });
    }
    await this.recordParameters(organizationId, userId, session.sessionKey, input);
    await this.calculateAndApplyRules(organizationId, userId, session.sessionKey);
    return this.decide(organizationId, userId, session.sessionKey, {
      decision: input.decision,
      reason: input.observations ?? input.inspectorComments,
    });
  }

  private async resolveThresholds(organizationId: string, ticketId: string): Promise<QualityThresholds> {
    const ticket = await this.prisma.cpepReceptionTicket.findUnique({ where: { id: ticketId } });
    const rules = await this.receptionRules.list(organizationId);
    const active = rules.find((r) => r.isActive) ?? rules[0];
    const humidityParam = await this.parameters.resolve(organizationId, 'humidity_ranges');
    const qualityParam = await this.parameters.resolve(organizationId, 'quality_ranges');
    const humidityValue = (humidityParam?.value ?? {}) as Record<string, number>;
    const qualityValue = (qualityParam?.value ?? {}) as Record<string, number>;

    void ticket;
    return {
      ...DEFAULT_QUALITY_THRESHOLDS,
      minHumidityPct: active?.minHumidityPct ?? humidityValue.min ?? DEFAULT_QUALITY_THRESHOLDS.minHumidityPct,
      maxHumidityPct: active?.maxHumidityPct ?? humidityValue.max ?? DEFAULT_QUALITY_THRESHOLDS.maxHumidityPct,
      minFactor: active?.minFactor ?? DEFAULT_QUALITY_THRESHOLDS.minFactor,
      maxFactor: active?.maxFactor ?? DEFAULT_QUALITY_THRESHOLDS.maxFactor,
      minQualityScore: active?.minQualityScore ?? qualityValue.min ?? DEFAULT_QUALITY_THRESHOLDS.minQualityScore,
      maxDefectsPct: qualityValue.maxDefects ?? DEFAULT_QUALITY_THRESHOLDS.maxDefectsPct,
    };
  }

  private async applyBreRules(
    organizationId: string,
    userId: string,
    session: { id: string; sessionKey: string; ticketId: string },
    params: QualityParameters,
    evaluation: ReturnType<typeof evaluateQualityRules>,
  ) {
    if (!this.bre) return [];
    try {
      const rules = await this.prisma.breBusinessRule.findMany({
        where: {
          organizationId,
          status: 'published',
          deletedAt: null,
          eventTypes: { hasSome: [EVENT_TYPES.COFFEE_QUALITY_RECORDED, EVENT_TYPES.COFFEE_QUALITY_RULES_APPLIED, 'CoffeeQualityEvaluated'] },
        },
        include: { decisionTable: true },
        orderBy: { priority: 'asc' },
        take: 50,
      });

      const results = [];
      for (const rule of rules) {
        const result = await this.bre.executeRule(rule, {
          eventType: EVENT_TYPES.COFFEE_QUALITY_RULES_APPLIED,
          payload: {
            sessionKey: session.sessionKey,
            ticketId: session.ticketId,
            parameters: params,
            evaluation,
          },
          actorId: userId,
          dryRun: true,
        });
        results.push({
          ruleKey: rule.ruleKey,
          matched: !!(result as { matched?: boolean }).matched || !!(result as { success?: boolean }).success,
          actions: ((rule.actions as Array<{ type?: string; config?: Record<string, unknown> }>) ?? []),
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  private async requireSession(organizationId: string, sessionKey: string) {
    const session = await this.prisma.cpepQualitySession.findFirst({
      where: { organizationId, sessionKey },
    });
    if (!session) throw new NotFoundException(`Sesión ${sessionKey} no encontrada`);
    return session;
  }
}
