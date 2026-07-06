import { Injectable, NotFoundException } from '@nestjs/common';
import { EmfgScheduleMode } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  autoScheduleOperations,
  detectScheduleConflicts,
  generateEmfgKey,
} from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCapacityService } from './emfg-capacity.service';

@Injectable()
export class EmfgSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly capacity: EmfgCapacityService,
  ) {}

  listSchedule(organizationId: string, workCenterKey?: string) {
    return this.prisma.emfgScheduleEntry.findMany({
      where: { organizationId, ...(workCenterKey ? { workCenterKey } : {}) },
      orderBy: { startAt: 'asc' },
    });
  }

  listConflicts(organizationId: string, resolved?: boolean) {
    return this.prisma.emfgScheduleConflict.findMany({
      where: { organizationId, ...(resolved !== undefined ? { resolved } : { resolved: false }) },
      orderBy: { detectedAt: 'desc' },
    });
  }

  listRescheduleLogs(organizationId: string, orderKey?: string) {
    return this.prisma.emfgRescheduleLog.findMany({
      where: { organizationId, ...(orderKey ? { orderKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async scheduleManual(organizationId: string, userId: string, payload: {
    orderKey: string; orderOpKey?: string; workCenterKey: string;
    startAt: string; endAt: string; loadMinutes?: number;
  }) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey: payload.orderKey } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const seq = await this.prisma.emfgScheduleEntry.count({ where: { organizationId } });
    const scheduleKey = generateEmfgKey('SCH', seq + 1);
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    const loadMinutes = payload.loadMinutes ?? (endAt.getTime() - startAt.getTime()) / 60_000;

    const entry = await this.prisma.emfgScheduleEntry.create({
      data: {
        organizationId,
        scheduleKey,
        orderKey: payload.orderKey,
        orderOpKey: payload.orderOpKey,
        workCenterKey: payload.workCenterKey,
        mode: 'manual',
        startAt,
        endAt,
        loadMinutes,
        createdBy: userId,
      },
    });

    if (payload.orderOpKey) {
      await this.prisma.emfgProductionOrderOperation.updateMany({
        where: { organizationId, orderOpKey: payload.orderOpKey },
        data: { plannedStart: startAt, plannedEnd: endAt },
      });
    }

    await this.detectAndStoreConflicts(organizationId);
    await this.capacity.refreshAvailableCapacity(organizationId, payload.workCenterKey);
    await this.audit.log(organizationId, 'EmfgScheduleEntry', scheduleKey, 'scheduled', userId, { mode: 'manual' });
    await this.core.emitUserAction(organizationId, 'EmfgScheduleEntry', scheduleKey, EVENT_TYPES.EMFG_SCHEDULE_CREATED, { scheduleKey });
    return entry;
  }

  async scheduleAutomatic(organizationId: string, userId: string, orderKey: string, horizonStart?: string) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { operations: { orderBy: { sequence: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const start = horizonStart ? new Date(horizonStart) : order.plannedStart ?? new Date();
    const slots = autoScheduleOperations(
      order.operations.map((op) => ({
        orderOpKey: op.orderOpKey,
        workCenterKey: op.workCenterKey,
        runMinutes: op.runMinutes,
        sequence: op.sequence,
      })),
      start,
    );

    const created = [];
    for (const slot of slots) {
      const seq = await this.prisma.emfgScheduleEntry.count({ where: { organizationId } });
      const scheduleKey = generateEmfgKey('SCH', seq + 1);
      const entry = await this.prisma.emfgScheduleEntry.create({
        data: {
          organizationId,
          scheduleKey,
          orderKey,
          orderOpKey: slot.orderOpKey,
          workCenterKey: slot.workCenterKey,
          mode: 'automatic',
          startAt: slot.startAt,
          endAt: slot.endAt,
          loadMinutes: slot.loadMinutes,
          createdBy: userId,
        },
      });
      await this.prisma.emfgProductionOrderOperation.updateMany({
        where: { organizationId, orderOpKey: slot.orderOpKey },
        data: { plannedStart: slot.startAt, plannedEnd: slot.endAt },
      });
      created.push(entry);
      await this.capacity.refreshAvailableCapacity(organizationId, slot.workCenterKey);
    }

    await this.prisma.emfgProductionOrder.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: {
        status: order.status === 'draft' ? 'planned' : order.status,
        plannedStart: slots[0]?.startAt,
        plannedEnd: slots[slots.length - 1]?.endAt,
      },
    });

    await this.detectAndStoreConflicts(organizationId);
    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'scheduled', userId, { mode: 'automatic', slots: created.length });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_SCHEDULE_AUTO, { count: created.length });
    return { orderKey, entries: created };
  }

  async reschedule(organizationId: string, userId: string, orderKey: string, payload: {
    newStart: string; newEnd: string; reason?: string;
  }) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const seq = await this.prisma.emfgRescheduleLog.count({ where: { organizationId } });
    const logKey = generateEmfgKey('RSC', seq + 1);
    await this.prisma.emfgRescheduleLog.create({
      data: {
        organizationId,
        logKey,
        orderKey,
        previousStart: order.plannedStart,
        previousEnd: order.plannedEnd,
        newStart: new Date(payload.newStart),
        newEnd: new Date(payload.newEnd),
        reason: payload.reason,
        userId,
      },
    });

    await this.prisma.emfgProductionOrder.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: { plannedStart: new Date(payload.newStart), plannedEnd: new Date(payload.newEnd) },
    });

    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'rescheduled', userId, { reason: payload.reason });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ORDER_RESCHEDULED, { logKey });
    return this.prisma.emfgProductionOrder.findUnique({ where: { organizationId_orderKey: { organizationId, orderKey } } });
  }

  private async detectAndStoreConflicts(organizationId: string) {
    const entries = await this.prisma.emfgScheduleEntry.findMany({ where: { organizationId } });
    const workCenters = await this.prisma.emfgWorkCenter.findMany({ where: { organizationId } });
    const capacityByCenter = Object.fromEntries(workCenters.map((w) => [w.workCenterKey, w.installedCapacity]));

    const conflicts = detectScheduleConflicts(
      entries.map((e) => ({
        scheduleKey: e.scheduleKey,
        workCenterKey: e.workCenterKey,
        startAt: e.startAt,
        endAt: e.endAt,
        loadMinutes: e.loadMinutes,
      })),
      capacityByCenter,
    );

    for (const c of conflicts) {
      const seq = await this.prisma.emfgScheduleConflict.count({ where: { organizationId } });
      await this.prisma.emfgScheduleConflict.create({
        data: {
          organizationId,
          conflictKey: generateEmfgKey('CNF', seq + 1),
          conflictType: c.conflictType === 'overlap' ? 'overlap' : 'capacity_overload',
          workCenterKey: c.workCenterKey,
          scheduleKey: c.scheduleKey,
          severity: c.severity,
          message: c.message,
        },
      });
    }
    return conflicts;
  }
}
