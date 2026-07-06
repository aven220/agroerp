import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { DEFAULT_EMFG_CENTER } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCapacityService } from './emfg-capacity.service';
import { EmfgCalendarService } from './emfg-calendar.service';
import { EmfgMasterPlanService } from './emfg-master-plan.service';
import { EmfgBomService } from './emfg-bom.service';
import { EmfgRoutingService } from './emfg-routing.service';
import { EmfgOrderService } from './emfg-order.service';
import { EmfgSchedulerService } from './emfg-scheduler.service';

@Injectable()
export class EmfgCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly capacity: EmfgCapacityService,
    private readonly calendar: EmfgCalendarService,
    private readonly masterPlan: EmfgMasterPlanService,
    private readonly bom: EmfgBomService,
    private readonly routing: EmfgRoutingService,
    private readonly orders: EmfgOrderService,
    private readonly scheduler: EmfgSchedulerService,
  ) {}

  async center(organizationId: string) {
    const [
      orderCount, openOrders, bomCount, routingCount, planCount,
      conflictCount, centerCount, scheduleCount,
    ] = await Promise.all([
      this.prisma.emfgProductionOrder.count({ where: { organizationId } }),
      this.prisma.emfgProductionOrder.count({ where: { organizationId, status: { in: ['released', 'in_progress', 'planned'] } } }),
      this.prisma.emfgBom.count({ where: { organizationId, isActive: true } }),
      this.prisma.emfgRouting.count({ where: { organizationId, isActive: true } }),
      this.prisma.emfgMasterPlan.count({ where: { organizationId, status: 'active' } }),
      this.prisma.emfgScheduleConflict.count({ where: { organizationId, resolved: false } }),
      this.prisma.emfgProductionCenter.count({ where: { organizationId, isActive: true } }),
      this.prisma.emfgScheduleEntry.count({ where: { organizationId } }),
    ]);

    const capacity = await this.capacity.capacitySummary(organizationId);
    const recentOrders = await this.prisma.emfgProductionOrder.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return {
      orderCount, openOrders, bomCount, routingCount, planCount,
      conflictCount, centerCount, scheduleCount, capacity, recentOrders,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.emfgProductionCenter.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    const cal = await this.calendar.create(organizationId, userId, { name: 'Calendario Productivo', isDefault: true });
    const center = await this.capacity.upsertCenter(organizationId, userId, {
      ...DEFAULT_EMFG_CENTER,
      calendarKey: cal?.calendarKey,
    });
    const line = await this.capacity.upsertLine(organizationId, userId, {
      centerKey: center.centerKey,
      code: 'LN-01',
      name: 'Línea 1',
      installedCapacity: 240,
    });
    const wc = await this.capacity.upsertWorkCenter(organizationId, userId, {
      centerKey: center.centerKey,
      code: 'WC-01',
      name: 'Centro Trabajo Principal',
      installedCapacity: 160,
    });
    await this.capacity.upsertMachine(organizationId, userId, {
      workCenterKey: wc.workCenterKey,
      code: 'MC-01',
      name: 'Mezcladora Industrial',
    });

    const itemKey = 'FG-COFFEE-001';
    await this.bom.seedDefaults(organizationId, userId, itemKey);
    await this.routing.seedDefaults(organizationId, userId, itemKey, wc.workCenterKey);

    const plan = await this.masterPlan.create(organizationId, userId, {
      name: 'Plan Maestro Demo',
      horizonDays: 90,
      calendarKey: cal?.calendarKey,
    });
    await this.masterPlan.addLine(organizationId, userId, plan.planKey, {
      itemKey,
      plannedQty: 1000,
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });

    await this.audit.log(organizationId, 'EmfgConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async mobileSync(organizationId: string) {
    const [center, orderList, conflicts, schedule] = await Promise.all([
      this.center(organizationId),
      this.orders.list(organizationId, { status: undefined }),
      this.scheduler.listConflicts(organizationId, false),
      this.scheduler.listSchedule(organizationId),
    ]);
    return {
      center,
      orders: orderList.filter((o) => ['released', 'in_progress', 'paused', 'suspended', 'planned'].includes(o.status)),
      conflicts,
      schedule,
      syncedAt: new Date().toISOString(),
    };
  }

  async loadCheck(organizationId: string) {
    const start = Date.now();
    await this.center(organizationId);
    return { ok: true, elapsedMs: Date.now() - start };
  }
}
