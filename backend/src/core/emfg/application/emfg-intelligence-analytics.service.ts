import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgAuditService } from './emfg-audit.service';
import { aggregateAnalytics } from '../domain/emfg-intelligence.engine';

@Injectable()
export class EmfgIntelligenceAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  async analyze(organizationId: string, userId?: string, filters?: Record<string, unknown>) {
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      shiftCaps,
      maintenanceLogs,
      equipment,
      costSummaries,
      consumptions,
      orders,
      executions,
      inspections,
    ] = await Promise.all([
      this.prisma.emfgResourceShiftCapacity.findMany({
        where: { organizationId },
        orderBy: { computedAt: 'desc' },
        take: 200,
      }),
      this.prisma.emfgResourceMaintenanceLog.findMany({
        where: { organizationId, startedAt: { gte: periodStart } },
        take: 500,
      }),
      this.prisma.emfgEquipmentProfile.findMany({ where: { organizationId } }),
      this.prisma.emfgCostOrderSummary.findMany({ where: { organizationId }, take: 500 }),
      this.prisma.emfgMaterialConsumption.findMany({
        where: { organizationId, consumedAt: { gte: periodStart } },
        take: 2000,
      }),
      this.prisma.emfgProductionOrder.findMany({
        where: { organizationId, createdAt: { gte: periodStart } },
        take: 500,
      }),
      this.prisma.emfgOrderExecution.findMany({
        where: { organizationId, createdAt: { gte: periodStart } },
        take: 1000,
      }),
      this.prisma.emfgQmsInspection.findMany({
        where: { organizationId, createdAt: { gte: periodStart } },
        take: 500,
      }),
    ]);

    const capacities = shiftCaps.map((c) => ({
      entityKey: c.entityKey,
      entityType: c.entityType,
      installedMinutes: c.installedMinutes,
      utilizedMinutes: c.utilizedMinutes,
    }));

    const downtimes = maintenanceLogs.map((m) => ({
      entityKey: m.equipmentKey,
      downtimeMinutes: m.downtimeMinutes,
      reason: m.technicalNotes,
    }));

    const equipmentWithDowntime = equipment.map((e) => {
      const dt = maintenanceLogs
        .filter((m) => m.equipmentKey === e.equipmentKey)
        .reduce((s, m) => s + m.downtimeMinutes, 0);
      return { equipmentKey: e.equipmentKey, name: e.name, availabilityStatus: e.availabilityStatus, downtimeMinutes: dt };
    });

    const costByItem = new Map<string, { marginActual: number; actualUnitCost: number; count: number }>();
    for (const c of costSummaries) {
      const cur = costByItem.get(c.itemKey) ?? { marginActual: 0, actualUnitCost: 0, count: 0 };
      cur.marginActual += c.marginActual;
      cur.actualUnitCost += c.actualUnitCost;
      cur.count += 1;
      costByItem.set(c.itemKey, cur);
    }
    const costData = [...costByItem.entries()].map(([itemKey, v]) => ({
      itemKey,
      marginActual: v.count ? v.marginActual / v.count : 0,
      actualUnitCost: v.count ? v.actualUnitCost / v.count : 0,
    }));

    const operatorMap = new Map<string, { producedQty: number; elapsedMinutes: number }>();
    for (const ex of executions) {
      if (!ex.operatorKey) continue;
      const cur = operatorMap.get(ex.operatorKey) ?? { producedQty: 0, elapsedMinutes: 0 };
      cur.elapsedMinutes += ex.elapsedMinutes;
      operatorMap.set(ex.operatorKey, cur);
    }
    for (const o of orders) {
      if (!o.responsibleKey) continue;
      const cur = operatorMap.get(o.responsibleKey) ?? { producedQty: 0, elapsedMinutes: 0 };
      cur.producedQty += o.producedQty;
      operatorMap.set(o.responsibleKey, cur);
    }

    const supplierMap = new Map<string, { pass: number; total: number }>();
    for (const insp of inspections) {
      const meta = insp.metadata as Record<string, unknown>;
      const supplierKey = insp.supplierKey ?? String(meta?.supplierKey ?? 'internal');
      const cur = supplierMap.get(supplierKey) ?? { pass: 0, total: 0 };
      cur.total += 1;
      if (insp.result === 'pass') cur.pass += 1;
      supplierMap.set(supplierKey, cur);
    }

    const analytics = aggregateAnalytics({
      capacities,
      downtimes,
      equipment: equipmentWithDowntime,
      costSummaries: costData,
      consumptions: consumptions.map((c) => ({ componentKey: c.componentKey, quantity: c.quantity })),
      operatorEfficiency: [...operatorMap.entries()].map(([operatorKey, v]) => ({
        operatorKey,
        producedQty: v.producedQty,
        elapsedMinutes: v.elapsedMinutes,
        efficiencyPct: v.elapsedMinutes > 0 ? Math.round((v.producedQty / v.elapsedMinutes) * 10000) / 100 : 0,
      })),
      shiftEfficiency: shiftCaps.map((s) => ({
        shiftKey: s.shiftName,
        producedQty: s.utilizedMinutes,
        plannedQty: s.installedMinutes,
        efficiencyPct: s.utilizationPct,
      })),
      workCenterEfficiency: shiftCaps
        .filter((s) => s.entityType === 'work_center')
        .map((s) => ({ workCenterKey: s.entityKey, utilizationPct: s.utilizationPct })),
      supplierQuality: [...supplierMap.entries()].map(([supplierKey, v]) => ({
        supplierKey,
        passRate: v.total > 0 ? Math.round((v.pass / v.total) * 10000) / 100 : 0,
        inspectionCount: v.total,
      })),
    });

    await this.audit.log(organizationId, 'EmfgIntelligenceAnalytics', 'panel', 'intelligence_queried', userId, {
      filters: filters ?? {},
    });

    return { analytics, generatedAt: new Date().toISOString() };
  }
}
