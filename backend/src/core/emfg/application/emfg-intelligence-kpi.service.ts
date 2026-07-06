import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgAuditService } from './emfg-audit.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { aggregateProductionKpis } from '../domain/emfg-intelligence.engine';

@Injectable()
export class EmfgIntelligenceKpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  async aggregate(organizationId: string, userId?: string) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [orders, shiftCaps, operations] = await Promise.all([
      this.prisma.emfgProductionOrder.findMany({
        where: { organizationId, createdAt: { gte: periodStart } },
      }),
      this.prisma.emfgResourceShiftCapacity.findMany({
        where: { organizationId },
        orderBy: { computedAt: 'desc' },
        take: 200,
      }),
      this.prisma.emfgProductionOrderOperation.findMany({
        where: { organizationId },
        take: 1000,
      }),
    ]);

    const capacities = shiftCaps.map((c) => ({
      entityKey: c.entityKey,
      entityType: c.entityType,
      installedMinutes: c.installedMinutes,
      utilizedMinutes: c.utilizedMinutes,
    }));

    const indicators = aggregateProductionKpis({ orders, capacities, operations });

    const byLine = new Map<string, { planned: number; produced: number }>();
    const byCenter = new Map<string, { planned: number; produced: number }>();
    for (const o of orders) {
      if (o.lineKey) {
        const cur = byLine.get(o.lineKey) ?? { planned: 0, produced: 0 };
        cur.planned += o.plannedQty;
        cur.produced += o.producedQty;
        byLine.set(o.lineKey, cur);
      }
      const cc = byCenter.get(o.centerKey) ?? { planned: 0, produced: 0 };
      cc.planned += o.plannedQty;
      cc.produced += o.producedQty;
      byCenter.set(o.centerKey, cc);
    }

    const productionByLine = [...byLine.entries()].map(([lineKey, v]) => ({
      lineKey,
      plannedQty: v.planned,
      producedQty: v.produced,
      compliancePct: v.planned > 0 ? Math.round((v.produced / v.planned) * 10000) / 100 : 0,
    }));
    const productionByPlant = [...byCenter.entries()].map(([centerKey, v]) => ({
      centerKey,
      plannedQty: v.planned,
      producedQty: v.produced,
      compliancePct: v.planned > 0 ? Math.round((v.produced / v.planned) * 10000) / 100 : 0,
    }));

    const seq = await this.prisma.emfgIntelligenceKpiSnapshot.count({ where: { organizationId } });
    const snapshot = await this.prisma.emfgIntelligenceKpiSnapshot.create({
      data: {
        organizationId,
        snapshotKey: generateEmfgKey('KPI', seq + 1),
        periodStart,
        periodEnd,
        indicators: {
          ...indicators,
          productionByLine,
          productionByPlant,
        },
      },
    });

    await this.audit.log(organizationId, 'EmfgIntelligenceKpi', snapshot.snapshotKey, 'kpi_aggregated', userId);

    return { snapshot, indicators: snapshot.indicators };
  }

  async current(organizationId: string) {
    const latest = await this.prisma.emfgIntelligenceKpiSnapshot.findFirst({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
    });
    if (latest) return latest.indicators;

    const result = await this.aggregate(organizationId);
    return result.indicators;
  }

  history(organizationId: string, limit = 50) {
    return this.prisma.emfgIntelligenceKpiSnapshot.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }
}
