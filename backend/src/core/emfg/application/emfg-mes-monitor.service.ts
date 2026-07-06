import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateMonitorStats, computeAdvancePct, computeYieldPct } from '../domain/emfg-mes.engine';

@Injectable()
export class EmfgMesMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string, centerKey?: string) {
    const orders = await this.prisma.emfgProductionOrder.findMany({
      where: {
        organizationId,
        ...(centerKey ? { centerKey } : {}),
        status: { in: ['released', 'in_progress', 'paused', 'suspended', 'completed'] },
      },
      include: { materials: true, operations: true },
      orderBy: [{ priority: 'desc' }, { plannedStart: 'asc' }],
      take: 500,
    });

    const stats = aggregateMonitorStats(orders);
    const activeOrders = orders
      .filter((o) => o.status === 'in_progress')
      .map((o) => ({
        orderKey: o.orderKey,
        orderNumber: o.orderNumber,
        itemKey: o.itemKey,
        status: o.status,
        plannedQty: o.plannedQty,
        producedQty: o.producedQty,
        advancePct: computeAdvancePct(o.producedQty, o.plannedQty),
        yieldPct: computeYieldPct(o.producedQty, o.plannedQty),
        elapsedMinutes: o.elapsedMinutes,
        operationsTotal: o.operations.length,
        operationsDone: o.operations.filter((op) => op.status === 'completed').length,
      }));

    const stoppedOrders = orders
      .filter((o) => ['paused', 'suspended'].includes(o.status))
      .map((o) => ({
        orderKey: o.orderKey,
        orderNumber: o.orderNumber,
        status: o.status,
        advancePct: computeAdvancePct(o.producedQty, o.plannedQty),
      }));

    const recentFinished = orders
      .filter((o) => o.status === 'completed')
      .slice(0, 20)
      .map((o) => ({
        orderKey: o.orderKey,
        orderNumber: o.orderNumber,
        producedQty: o.producedQty,
        scrapQty: o.scrapQty,
        yieldPct: computeYieldPct(o.producedQty, o.plannedQty),
        actualEnd: o.actualEnd,
      }));

    return {
      stats,
      activeOrders,
      stoppedOrders,
      recentFinished,
      generatedAt: new Date().toISOString(),
    };
  }

  orderTracking(organizationId: string, orderKey: string) {
    return this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: {
        materials: true,
        operations: { orderBy: { sequence: 'asc' } },
        progress: { orderBy: { recordedAt: 'desc' }, take: 50 },
        executions: { orderBy: { createdAt: 'desc' } },
        consumptions: { orderBy: { consumedAt: 'desc' }, take: 50 },
        outputs: { orderBy: { recordedAt: 'desc' }, take: 50 },
        lots: { include: { serials: true } },
        traceability: { orderBy: { recordedAt: 'asc' } },
      },
    });
  }
}
