import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsMovementService } from './eims-movement.service';
import {
  canTransition,
  computeVariance,
  generateActKey,
  generateAdjustmentKey,
  generateApprovalKey,
  generateAssignmentKey,
  generateCaptureKey,
  generateCountKey,
  generateCountLineKey,
  generatePhotoKey,
  generateVarianceKey,
  isWithinTolerance,
  proposeAdjustment,
  resolvePhysicalQty,
  summarizeCountSession,
  validateCountPlan,
  type EimsCountCaptureMethodValue,
  type EimsCountCaptureRoundValue,
  type EimsCountStatusValue,
  type EimsCountTypeValue,
} from '../domain/eims-count.engine';

export interface PlanCountInput {
  countKey?: string;
  name: string;
  countType: EimsCountTypeValue;
  scheduledStart?: string;
  scheduledEnd?: string;
  warehouseKeys?: string[];
  locationKeys?: string[];
  itemKeys?: string[];
  categoryKeys?: string[];
  lotKeys?: string[];
  toleranceQtyPct?: number;
  toleranceCostPct?: number;
  toleranceQtyAbs?: number;
  requireSecondCount?: boolean;
  requireThirdCount?: boolean;
  approvalLevels?: number;
  freezeMovements?: boolean;
  notes?: string;
  assignees?: Array<{
    userId: string;
    userName?: string;
    roleKey?: string;
    warehouseKeys?: string[];
    locationKeys?: string[];
    itemKeys?: string[];
  }>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EimsCountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly movements: EimsMovementService,
  ) {}

  list(organizationId: string, filters?: { status?: string; countType?: string; q?: string }) {
    return this.prisma.eimsCountSession.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.countType ? { countType: filters.countType as never } : {}),
        ...(filters?.q
          ? {
              OR: [
                { countKey: { contains: filters.q, mode: 'insensitive' } },
                { name: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        assignments: true,
        _count: { select: { lines: true, captures: true, variances: true, adjustments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async center(organizationId: string) {
    const [sessions, open, pendingApproval, closed, variances, adjustments] = await Promise.all([
      this.prisma.eimsCountSession.count({ where: { organizationId } }),
      this.prisma.eimsCountSession.count({
        where: { organizationId, status: { in: ['scheduled', 'in_progress', 'counting', 'reconciling'] } },
      }),
      this.prisma.eimsCountSession.count({ where: { organizationId, status: 'pending_approval' } }),
      this.prisma.eimsCountSession.count({ where: { organizationId, status: 'closed' } }),
      this.prisma.eimsCountVariance.count({ where: { organizationId, requiresAdjustment: true, status: 'open' } }),
      this.prisma.eimsCountAdjustment.count({
        where: { organizationId, status: { in: ['proposed', 'pending_approval'] } },
      }),
    ]);
    const recent = await this.list(organizationId);
    return {
      sessionsCount: sessions,
      openCount: open,
      pendingApprovalCount: pendingApproval,
      closedCount: closed,
      openVariances: variances,
      pendingAdjustments: adjustments,
      recent: recent.slice(0, 20),
    };
  }

  async getOne(organizationId: string, countKey: string) {
    const session = await this.prisma.eimsCountSession.findFirst({
      where: { organizationId, countKey },
      include: {
        assignments: true,
        lines: { orderBy: { lineKey: 'asc' }, take: 2000 },
        captures: { orderBy: { capturedAt: 'desc' }, take: 500 },
        variances: { orderBy: { createdAt: 'desc' } },
        adjustments: { include: { approvals: true }, orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { decidedAt: 'desc' } },
        closureActs: { orderBy: { closedAt: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException(`Conteo ${countKey} no encontrado`);
    return {
      ...session,
      summary: summarizeCountSession(session.lines),
    };
  }

  async plan(organizationId: string, userId: string, input: PlanCountInput) {
    const planError = validateCountPlan(input);
    if (planError) throw new BadRequestException(planError);

    const countKey = input.countKey?.trim() || generateCountKey(input.countType);
    const existing = await this.prisma.eimsCountSession.findFirst({
      where: { organizationId, countKey },
    });
    if (existing) throw new BadRequestException(`El conteo ${countKey} ya existe`);

    const status: EimsCountStatusValue = input.scheduledStart ? 'scheduled' : 'draft';
    const session = await this.prisma.eimsCountSession.create({
      data: {
        organizationId,
        countKey,
        name: input.name,
        countType: input.countType,
        status,
        scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : undefined,
        scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : undefined,
        warehouseKeys: input.warehouseKeys ?? [],
        locationKeys: input.locationKeys ?? [],
        itemKeys: input.itemKeys ?? [],
        categoryKeys: input.categoryKeys ?? [],
        lotKeys: input.lotKeys ?? [],
        toleranceQtyPct: input.toleranceQtyPct ?? 0,
        toleranceCostPct: input.toleranceCostPct ?? 0,
        toleranceQtyAbs: input.toleranceQtyAbs ?? 0,
        requireSecondCount: input.requireSecondCount ?? true,
        requireThirdCount: input.requireThirdCount ?? false,
        approvalLevels: input.approvalLevels ?? 1,
        freezeMovements: input.freezeMovements ?? false,
        notes: input.notes,
        plannedBy: userId,
        metadata: (input.metadata ?? {}) as object,
      },
    });

    if (input.assignees?.length) {
      let seq = 0;
      for (const a of input.assignees) {
        seq += 1;
        await this.prisma.eimsCountAssignment.create({
          data: {
            organizationId,
            sessionId: session.id,
            assignmentKey: generateAssignmentKey(countKey, a.userId, seq),
            userId: a.userId,
            userName: a.userName,
            roleKey: a.roleKey ?? 'counter',
            warehouseKeys: a.warehouseKeys ?? [],
            locationKeys: a.locationKeys ?? [],
            itemKeys: a.itemKeys ?? [],
          },
        });
      }
    }

    await this.audit.log(organizationId, 'CountSession', countKey, 'planned', userId, {
      countType: input.countType,
      status,
      warehouses: input.warehouseKeys,
      assignees: input.assignees?.map((a) => a.userId),
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountSession',
      session.id,
      EVENT_TYPES.EIMS_COUNT_PLANNED,
      { countKey, countType: input.countType, status },
    );
    return this.getOne(organizationId, countKey);
  }

  async assign(
    organizationId: string,
    userId: string,
    countKey: string,
    assignees: PlanCountInput['assignees'],
  ) {
    const session = await this.requireSession(organizationId, countKey);
    if (!assignees?.length) throw new BadRequestException('Se requieren responsables');
    let seq = await this.prisma.eimsCountAssignment.count({ where: { sessionId: session.id } });
    const created = [];
    for (const a of assignees) {
      seq += 1;
      created.push(
        await this.prisma.eimsCountAssignment.create({
          data: {
            organizationId,
            sessionId: session.id,
            assignmentKey: generateAssignmentKey(countKey, a.userId, seq),
            userId: a.userId,
            userName: a.userName,
            roleKey: a.roleKey ?? 'counter',
            warehouseKeys: a.warehouseKeys ?? [],
            locationKeys: a.locationKeys ?? [],
            itemKeys: a.itemKeys ?? [],
          },
        }),
      );
    }
    await this.audit.log(organizationId, 'CountSession', countKey, 'assigned', userId, {
      assignees: assignees.map((a) => a.userId),
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountSession',
      session.id,
      EVENT_TYPES.EIMS_COUNT_ASSIGNED,
      { countKey, count: created.length },
    );
    return created;
  }

  async start(organizationId: string, userId: string, countKey: string) {
    const session = await this.requireSession(organizationId, countKey);
    await this.transition(session.id, session.status, 'in_progress');
    await this.generateLines(organizationId, session);
    await this.prisma.eimsCountSession.update({
      where: { id: session.id },
      data: { startedAt: new Date(), status: 'counting' },
    });
    await this.audit.log(organizationId, 'CountSession', countKey, 'started', userId, {});
    await this.core.emitUserAction(
      organizationId,
      'EimsCountSession',
      session.id,
      EVENT_TYPES.EIMS_COUNT_STARTED,
      { countKey },
    );
    return this.getOne(organizationId, countKey);
  }

  private async generateLines(
    organizationId: string,
    session: {
      id: string;
      countKey: string;
      countType: string;
      warehouseKeys: string[];
      locationKeys: string[];
      itemKeys: string[];
      categoryKeys: string[];
      lotKeys: string[];
    },
  ) {
    const existing = await this.prisma.eimsCountLine.count({ where: { sessionId: session.id } });
    if (existing > 0) return;

    if (session.countType === 'lot' || session.lotKeys.length > 0) {
      const lots = await this.prisma.eimsStockLot.findMany({
        where: {
          organizationId,
          onHandQty: { gt: 0 },
          ...(session.lotKeys.length ? { lotKey: { in: session.lotKeys } } : {}),
          ...(session.warehouseKeys.length
            ? { warehouse: { warehouseKey: { in: session.warehouseKeys } } }
            : {}),
          ...(session.itemKeys.length ? { item: { itemKey: { in: session.itemKeys } } } : {}),
          ...(session.categoryKeys.length
            ? { item: { categoryKey: { in: session.categoryKeys } } }
            : {}),
        },
        include: {
          item: true,
          warehouse: true,
          location: true,
        },
        take: 5000,
      });
      let seq = 0;
      for (const lot of lots) {
        seq += 1;
        await this.prisma.eimsCountLine.create({
          data: {
            organizationId,
            sessionId: session.id,
            lineKey: generateCountLineKey(session.countKey, seq),
            itemId: lot.itemId,
            itemKey: lot.item.itemKey,
            itemName: lot.item.name,
            warehouseId: lot.warehouseId,
            warehouseKey: lot.warehouse.warehouseKey,
            locationId: lot.locationId,
            locationKey: lot.location?.locationKey,
            stockLotId: lot.id,
            lotKey: lot.lotKey,
            categoryKey: lot.item.categoryKey,
            uomKey: lot.item.uomKey,
            systemQty: lot.onHandQty,
            systemUnitCost: lot.unitCost,
            systemCost: Number((lot.onHandQty * lot.unitCost).toFixed(6)),
          },
        });
      }
      return;
    }

    const balances = await this.prisma.eimsStockBalance.findMany({
      where: {
        organizationId,
        onHandQty: { gt: 0 },
        ...(session.warehouseKeys.length
          ? { warehouse: { warehouseKey: { in: session.warehouseKeys } } }
          : {}),
        ...(session.locationKeys.length
          ? { location: { locationKey: { in: session.locationKeys } } }
          : {}),
        ...(session.itemKeys.length ? { item: { itemKey: { in: session.itemKeys } } } : {}),
        ...(session.categoryKeys.length
          ? { item: { categoryKey: { in: session.categoryKeys } } }
          : {}),
      },
      include: {
        item: true,
        warehouse: true,
        location: true,
      },
      take: 5000,
    });

    let seq = 0;
    for (const balance of balances) {
      seq += 1;
      await this.prisma.eimsCountLine.create({
        data: {
          organizationId,
          sessionId: session.id,
          lineKey: generateCountLineKey(session.countKey, seq),
          itemId: balance.itemId,
          itemKey: balance.item.itemKey,
          itemName: balance.item.name,
          warehouseId: balance.warehouseId,
          warehouseKey: balance.warehouse.warehouseKey,
          locationId: balance.locationId,
          locationKey: balance.location?.locationKey,
          categoryKey: balance.item.categoryKey,
          uomKey: balance.item.uomKey,
          systemQty: balance.onHandQty,
          systemUnitCost: balance.averageCost,
          systemCost: balance.totalCost,
        },
      });
    }
  }

  async capture(
    organizationId: string,
    userId: string,
    countKey: string,
    input: {
      lineKey?: string;
      itemKey?: string;
      warehouseKey?: string;
      locationKey?: string;
      lotKey?: string;
      scannedCode?: string;
      quantity: number;
      round?: EimsCountCaptureRoundValue;
      method?: EimsCountCaptureMethodValue;
      offline?: boolean;
      deviceKey?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      photoUrl?: string;
      captureKey?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const session = await this.requireSession(organizationId, countKey);
    if (!['in_progress', 'counting', 'reconciling'].includes(session.status)) {
      throw new BadRequestException(`Conteo ${countKey} no admite capturas en estado ${session.status}`);
    }

    let line = input.lineKey
      ? await this.prisma.eimsCountLine.findFirst({
          where: { organizationId, sessionId: session.id, lineKey: input.lineKey },
        })
      : null;

    if (!line && input.scannedCode) {
      line = await this.resolveLineByCode(organizationId, session.id, input.scannedCode);
    }
    if (!line && (input.itemKey || input.lotKey)) {
      line = await this.prisma.eimsCountLine.findFirst({
        where: {
          organizationId,
          sessionId: session.id,
          ...(input.itemKey ? { itemKey: input.itemKey } : {}),
          ...(input.warehouseKey ? { warehouseKey: input.warehouseKey } : {}),
          ...(input.locationKey ? { locationKey: input.locationKey } : {}),
          ...(input.lotKey ? { lotKey: input.lotKey } : {}),
        },
      });
    }
    if (!line) throw new NotFoundException('Línea de conteo no encontrada');

    const round = input.round ?? 'first';
    const prior = await this.prisma.eimsCountCapture.count({
      where: { lineId: line.id, round },
    });
    const captureKey =
      input.captureKey ?? generateCaptureKey(line.lineKey, round, prior + 1);

    const existingCapture = await this.prisma.eimsCountCapture.findFirst({
      where: { organizationId, captureKey },
    });
    if (existingCapture) {
      return existingCapture;
    }

    const capture = await this.prisma.eimsCountCapture.create({
      data: {
        organizationId,
        sessionId: session.id,
        lineId: line.id,
        captureKey,
        round,
        method: input.method ?? (input.offline ? 'offline' : input.scannedCode ? 'qr' : 'manual'),
        quantity: input.quantity,
        scannedCode: input.scannedCode,
        capturedBy: userId,
        offline: input.offline ?? false,
        deviceKey: input.deviceKey,
        latitude: input.latitude,
        longitude: input.longitude,
        notes: input.notes,
        photoUrl: input.photoUrl,
        metadata: (input.metadata ?? {}) as object,
      },
    });

    await this.prisma.eimsCountLine.update({
      where: { id: line.id },
      data: {
        physicalQty: input.quantity,
        status: 'counted',
        countRoundUsed: round,
      },
    });

    if (session.status === 'in_progress') {
      await this.prisma.eimsCountSession.update({
        where: { id: session.id },
        data: { status: 'counting' },
      });
    }

    await this.audit.log(organizationId, 'CountCapture', captureKey, 'captured', userId, {
      countKey,
      lineKey: line.lineKey,
      quantity: input.quantity,
      round,
      method: capture.method,
      offline: capture.offline,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountCapture',
      capture.id,
      EVENT_TYPES.EIMS_COUNT_CAPTURED,
      { countKey, lineKey: line.lineKey, quantity: input.quantity, round },
    );
    return capture;
  }

  async captureBatch(
    organizationId: string,
    userId: string,
    countKey: string,
    captures: Array<Parameters<EimsCountService['capture']>[3]>,
  ) {
    const results = [];
    for (const row of captures) {
      results.push(await this.capture(organizationId, userId, countKey, row));
    }
    return { count: results.length, captures: results };
  }

  private async resolveLineByCode(organizationId: string, sessionId: string, code: string) {
    const item = await this.prisma.eimsItem.findFirst({
      where: {
        organizationId,
        OR: [{ itemKey: code }, { qrCode: code }, { barcode: code }],
      },
    });
    if (item) {
      const line = await this.prisma.eimsCountLine.findFirst({
        where: { organizationId, sessionId, itemKey: item.itemKey },
      });
      if (line) return line;
    }
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: {
        organizationId,
        OR: [
          { lotKey: code },
          { qrCode: code },
          { barcode: code },
          { serialNumber: code },
        ],
      },
    });
    if (lot) {
      return this.prisma.eimsCountLine.findFirst({
        where: { organizationId, sessionId, lotKey: lot.lotKey },
      });
    }
    return this.prisma.eimsCountLine.findFirst({
      where: {
        organizationId,
        sessionId,
        OR: [{ itemKey: code }, { lotKey: code }, { lineKey: code }],
      },
    });
  }

  async reconcile(organizationId: string, userId: string, countKey: string) {
    const session = await this.requireSession(organizationId, countKey);
    const lines = await this.prisma.eimsCountLine.findMany({
      where: { sessionId: session.id },
      include: { captures: { orderBy: { capturedAt: 'asc' } } },
    });

    const variances = [];
    for (const line of lines) {
      const resolved = resolvePhysicalQty(
        line.captures.map((c) => ({
          round: c.round as EimsCountCaptureRoundValue,
          quantity: c.quantity,
          capturedAt: c.capturedAt,
        })),
        {
          requireSecond: session.requireSecondCount,
          requireThird: session.requireThirdCount,
        },
      );
      const physicalQty = resolved.physicalQty ?? line.physicalQty ?? line.systemQty;
      const { varianceQty, variancePct, varianceCost } = computeVariance(
        line.systemQty,
        physicalQty,
        line.systemUnitCost,
      );
      const withinTolerance = isWithinTolerance(
        varianceQty,
        variancePct,
        varianceCost,
        line.systemCost,
        {
          qtyPct: session.toleranceQtyPct,
          costPct: session.toleranceCostPct,
          qtyAbs: session.toleranceQtyAbs,
        },
      );
      const proposal = proposeAdjustment(varianceQty);
      const requiresAdjustment = !withinTolerance && proposal.adjustmentType != null;

      await this.prisma.eimsCountLine.update({
        where: { id: line.id },
        data: {
          physicalQty,
          finalQty: physicalQty,
          varianceQty,
          variancePct,
          varianceCost,
          withinTolerance,
          countRoundUsed: resolved.roundUsed,
          status: 'reconciled',
        },
      });

      const varianceKey = generateVarianceKey(line.lineKey);
      const variance = await this.prisma.eimsCountVariance.upsert({
        where: { organizationId_varianceKey: { organizationId, varianceKey } },
        update: {
          systemQty: line.systemQty,
          physicalQty,
          varianceQty,
          variancePct,
          unitCost: line.systemUnitCost,
          varianceCost,
          withinTolerance,
          requiresAdjustment,
          proposedAdjustmentType: proposal.adjustmentType,
          proposedQty: proposal.quantity,
          status: requiresAdjustment ? 'open' : 'closed',
        },
        create: {
          organizationId,
          sessionId: session.id,
          lineId: line.id,
          varianceKey,
          systemQty: line.systemQty,
          physicalQty,
          varianceQty,
          variancePct,
          unitCost: line.systemUnitCost,
          varianceCost,
          withinTolerance,
          requiresAdjustment,
          proposedAdjustmentType: proposal.adjustmentType,
          proposedQty: proposal.quantity,
          status: requiresAdjustment ? 'open' : 'closed',
        },
      });
      variances.push(variance);

      if (requiresAdjustment && proposal.adjustmentType) {
        const adjustmentKey = generateAdjustmentKey(line.lineKey);
        await this.prisma.eimsCountAdjustment.upsert({
          where: { organizationId_adjustmentKey: { organizationId, adjustmentKey } },
          update: {
            quantity: proposal.quantity,
            unitCost: line.systemUnitCost,
            totalCost: Number((proposal.quantity * line.systemUnitCost).toFixed(6)),
            adjustmentType: proposal.adjustmentType,
            status: 'proposed',
            varianceId: variance.id,
          },
          create: {
            organizationId,
            sessionId: session.id,
            lineId: line.id,
            varianceId: variance.id,
            adjustmentKey,
            adjustmentType: proposal.adjustmentType,
            quantity: proposal.quantity,
            unitCost: line.systemUnitCost,
            totalCost: Number((proposal.quantity * line.systemUnitCost).toFixed(6)),
            status: 'proposed',
            justification: 'Propuesta automática por diferencia de conteo físico',
            requestedBy: userId,
            requiredLevels: session.approvalLevels,
          },
        });
      }
    }

    const openAdjustments = await this.prisma.eimsCountAdjustment.count({
      where: { sessionId: session.id, status: { in: ['proposed', 'pending_approval'] } },
    });
    const nextStatus: EimsCountStatusValue =
      openAdjustments > 0 ? 'pending_approval' : 'approved';

    await this.prisma.eimsCountSession.update({
      where: { id: session.id },
      data: { status: nextStatus, completedAt: new Date() },
    });

    await this.audit.log(organizationId, 'CountSession', countKey, 'reconciled', userId, {
      variances: variances.length,
      openAdjustments,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountSession',
      session.id,
      EVENT_TYPES.EIMS_COUNT_RECONCILED,
      { countKey, variances: variances.length },
    );
    return this.getOne(organizationId, countKey);
  }

  async requestApproval(
    organizationId: string,
    userId: string,
    countKey: string,
    adjustmentKey: string,
    justification?: string,
  ) {
    const session = await this.requireSession(organizationId, countKey);
    const adjustment = await this.prisma.eimsCountAdjustment.findFirst({
      where: { organizationId, adjustmentKey, sessionId: session.id },
    });
    if (!adjustment) throw new NotFoundException(`Ajuste ${adjustmentKey} no encontrado`);
    if (!justification?.trim() && !adjustment.justification) {
      throw new BadRequestException('Justificación requerida');
    }
    const updated = await this.prisma.eimsCountAdjustment.update({
      where: { id: adjustment.id },
      data: {
        status: 'pending_approval',
        justification: justification ?? adjustment.justification,
        requestedBy: userId,
        requestedAt: new Date(),
        currentLevel: 0,
      },
    });
    await this.prisma.eimsCountSession.update({
      where: { id: session.id },
      data: { status: 'pending_approval' },
    });
    await this.audit.log(organizationId, 'CountAdjustment', adjustmentKey, 'approval_requested', userId, {
      justification: updated.justification,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountAdjustment',
      adjustment.id,
      EVENT_TYPES.EIMS_COUNT_APPROVAL_REQUESTED,
      { countKey, adjustmentKey },
    );
    return updated;
  }

  async requestAllApprovals(organizationId: string, userId: string, countKey: string) {
    const session = await this.requireSession(organizationId, countKey);
    const adjustments = await this.prisma.eimsCountAdjustment.findMany({
      where: { sessionId: session.id, status: 'proposed' },
    });
    const results = [];
    for (const adj of adjustments) {
      results.push(
        await this.requestApproval(organizationId, userId, countKey, adj.adjustmentKey),
      );
    }
    return { count: results.length, adjustments: results };
  }

  async approve(
    organizationId: string,
    userId: string,
    countKey: string,
    adjustmentKey: string,
    input?: { comments?: string; decision?: 'approved' | 'rejected'; rejectedReason?: string },
  ) {
    const session = await this.requireSession(organizationId, countKey);
    const adjustment = await this.prisma.eimsCountAdjustment.findFirst({
      where: { organizationId, adjustmentKey, sessionId: session.id },
      include: { line: true },
    });
    if (!adjustment) throw new NotFoundException(`Ajuste ${adjustmentKey} no encontrado`);
    if (!['proposed', 'pending_approval'].includes(adjustment.status)) {
      throw new BadRequestException(`Ajuste en estado ${adjustment.status} no admite aprobación`);
    }

    const decision = input?.decision ?? 'approved';
    const level = adjustment.currentLevel + 1;
    await this.prisma.eimsCountApproval.create({
      data: {
        organizationId,
        sessionId: session.id,
        adjustmentId: adjustment.id,
        approvalKey: generateApprovalKey(adjustmentKey, level),
        level,
        decision,
        decidedBy: userId,
        comments: input?.comments,
      },
    });

    if (decision === 'rejected') {
      const rejected = await this.prisma.eimsCountAdjustment.update({
        where: { id: adjustment.id },
        data: {
          status: 'rejected',
          rejectedReason: input?.rejectedReason ?? input?.comments ?? 'Rechazado',
          currentLevel: level,
        },
      });
      await this.audit.log(organizationId, 'CountAdjustment', adjustmentKey, 'rejected', userId, {
        level,
        reason: rejected.rejectedReason,
      });
      return rejected;
    }

    if (level < adjustment.requiredLevels) {
      const pending = await this.prisma.eimsCountAdjustment.update({
        where: { id: adjustment.id },
        data: { status: 'pending_approval', currentLevel: level },
      });
      await this.audit.log(organizationId, 'CountAdjustment', adjustmentKey, 'level_approved', userId, {
        level,
        requiredLevels: adjustment.requiredLevels,
      });
      return pending;
    }

    const approved = await this.prisma.eimsCountAdjustment.update({
      where: { id: adjustment.id },
      data: { status: 'approved', currentLevel: level },
    });
    await this.audit.log(organizationId, 'CountAdjustment', adjustmentKey, 'approved', userId, {
      level,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountAdjustment',
      adjustment.id,
      EVENT_TYPES.EIMS_COUNT_APPROVED,
      { countKey, adjustmentKey },
    );
    return this.postAdjustment(organizationId, userId, countKey, adjustmentKey);
  }

  async approveAll(organizationId: string, userId: string, countKey: string, comments?: string) {
    const session = await this.requireSession(organizationId, countKey);
    const adjustments = await this.prisma.eimsCountAdjustment.findMany({
      where: {
        sessionId: session.id,
        status: { in: ['proposed', 'pending_approval'] },
      },
    });
    const results = [];
    for (const adj of adjustments) {
      results.push(
        await this.approve(organizationId, userId, countKey, adj.adjustmentKey, {
          comments,
          decision: 'approved',
        }),
      );
    }
    return { count: results.length, adjustments: results };
  }

  async postAdjustment(
    organizationId: string,
    userId: string,
    countKey: string,
    adjustmentKey: string,
  ) {
    const session = await this.requireSession(organizationId, countKey);
    const adjustment = await this.prisma.eimsCountAdjustment.findFirst({
      where: { organizationId, adjustmentKey, sessionId: session.id },
      include: { line: true },
    });
    if (!adjustment) throw new NotFoundException(`Ajuste ${adjustmentKey} no encontrado`);
    if (adjustment.status === 'posted') return adjustment;
    if (adjustment.status !== 'approved' && adjustment.status !== 'proposed') {
      throw new BadRequestException(`Ajuste ${adjustmentKey} no está aprobado`);
    }

    const line = adjustment.line;
    const movement = await this.movements.post(organizationId, userId, {
      movementType: adjustment.adjustmentType as 'adjustment_positive' | 'adjustment_negative',
      itemKey: line.itemKey,
      quantity: adjustment.quantity,
      ...(adjustment.adjustmentType === 'adjustment_positive'
        ? { toWarehouseKey: line.warehouseKey, toLocationKey: line.locationKey ?? undefined }
        : { fromWarehouseKey: line.warehouseKey, fromLocationKey: line.locationKey ?? undefined }),
      lotKey: line.lotKey ?? undefined,
      unitCost: adjustment.unitCost,
      reasonKey: 'count_diff',
      reason: adjustment.justification,
      documentKey: countKey,
      documentType: 'physical_count',
      source: 'physical_count',
      sourceRef: adjustmentKey,
      metadata: { countKey, lineKey: line.lineKey, adjustmentKey },
    });

    const posted = await this.prisma.eimsCountAdjustment.update({
      where: { id: adjustment.id },
      data: {
        status: 'posted',
        movementKey: movement.movementKey,
        postedAt: new Date(),
        postedBy: userId,
      },
    });
    if (adjustment.varianceId) {
      await this.prisma.eimsCountVariance.update({
        where: { id: adjustment.varianceId },
        data: { status: 'adjusted' },
      });
    }
    await this.audit.log(organizationId, 'CountAdjustment', adjustmentKey, 'posted', userId, {
      movementKey: movement.movementKey,
      quantity: adjustment.quantity,
      adjustmentType: adjustment.adjustmentType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountAdjustment',
      adjustment.id,
      EVENT_TYPES.EIMS_COUNT_ADJUSTMENT_POSTED,
      { countKey, adjustmentKey, movementKey: movement.movementKey },
    );
    return posted;
  }

  async close(organizationId: string, userId: string, countKey: string, notes?: string) {
    const session = await this.requireSession(organizationId, countKey);
    const pending = await this.prisma.eimsCountAdjustment.count({
      where: {
        sessionId: session.id,
        status: { in: ['proposed', 'pending_approval', 'approved'] },
      },
    });
    if (pending > 0) {
      throw new BadRequestException(`Hay ${pending} ajustes pendientes antes del cierre`);
    }

    const lines = await this.prisma.eimsCountLine.findMany({ where: { sessionId: session.id } });
    const variances = await this.prisma.eimsCountVariance.findMany({
      where: { sessionId: session.id },
    });
    const adjustments = await this.prisma.eimsCountAdjustment.findMany({
      where: { sessionId: session.id, status: 'posted' },
    });
    const summary = summarizeCountSession(lines);
    const actKey = generateActKey(countKey);
    const act = await this.prisma.eimsCountClosureAct.create({
      data: {
        organizationId,
        sessionId: session.id,
        actKey,
        title: `Acta de cierre ${countKey}`,
        summary: summary as object,
        linesCounted: summary.countedLines,
        variancesFound: variances.filter((v) => v.varianceQty !== 0).length,
        adjustmentsPosted: adjustments.length,
        totalVarianceCost: summary.totalVarianceCost,
        documentKey: `DOC-${actKey}`,
        closedBy: userId,
        notes,
      },
    });

    await this.prisma.eimsCountSession.update({
      where: { id: session.id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: userId,
        documentKey: act.documentKey,
      },
    });

    await this.audit.log(organizationId, 'CountSession', countKey, 'closed', userId, {
      actKey,
      summary,
      notes,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsCountSession',
      session.id,
      EVENT_TYPES.EIMS_COUNT_CLOSED,
      { countKey, actKey },
    );
    return { session: await this.getOne(organizationId, countKey), act };
  }

  async addPhoto(
    organizationId: string,
    userId: string,
    countKey: string,
    input: {
      lineKey?: string;
      storageUrl?: string;
      caption?: string;
      offline?: boolean;
      photoKey?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const session = await this.requireSession(organizationId, countKey);
    const count = await this.prisma.eimsCountIncidentPhoto.count({
      where: { sessionId: session.id },
    });
    const photoKey = input.photoKey ?? generatePhotoKey(countKey, count + 1);
    const photo = await this.prisma.eimsCountIncidentPhoto.create({
      data: {
        organizationId,
        sessionId: session.id,
        photoKey,
        lineKey: input.lineKey,
        storageUrl: input.storageUrl,
        caption: input.caption,
        capturedBy: userId,
        offline: input.offline ?? false,
        metadata: (input.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'CountPhoto', photoKey, 'created', userId, {
      countKey,
      lineKey: input.lineKey,
    });
    return photo;
  }

  differences(organizationId: string, countKey: string) {
    return this.prisma.eimsCountVariance.findMany({
      where: { organizationId, session: { countKey }, varianceQty: { not: 0 } },
      include: { line: true },
      orderBy: { varianceCost: 'desc' },
    });
  }

  reconciliationPanel(organizationId: string, countKey: string) {
    return this.prisma.eimsCountLine.findMany({
      where: { organizationId, session: { countKey } },
      include: {
        captures: { orderBy: { capturedAt: 'asc' } },
        variances: true,
        adjustments: { include: { approvals: true } },
      },
      orderBy: { lineKey: 'asc' },
    });
  }

  history(organizationId: string) {
    return this.prisma.eimsCountSession.findMany({
      where: { organizationId },
      include: {
        closureActs: true,
        _count: { select: { lines: true, adjustments: true, variances: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  closureActs(organizationId: string, countKey?: string) {
    return this.prisma.eimsCountClosureAct.findMany({
      where: {
        organizationId,
        ...(countKey ? { session: { countKey } } : {}),
      },
      include: { session: { select: { countKey: true, name: true, countType: true } } },
      orderBy: { closedAt: 'desc' },
      take: 100,
    });
  }

  private async requireSession(organizationId: string, countKey: string) {
    const session = await this.prisma.eimsCountSession.findFirst({
      where: { organizationId, countKey },
    });
    if (!session) throw new NotFoundException(`Conteo ${countKey} no encontrado`);
    return session;
  }

  private async transition(
    sessionId: string,
    from: string,
    to: EimsCountStatusValue,
  ) {
    if (!canTransition(from as EimsCountStatusValue, to)) {
      throw new BadRequestException(`Transición inválida ${from} → ${to}`);
    }
    return this.prisma.eimsCountSession.update({
      where: { id: sessionId },
      data: { status: to },
    });
  }
}
