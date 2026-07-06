import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeAiService } from './coffee-ai.service';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeStatsService } from './coffee-stats.service';
import { CoffeeOpsService } from './coffee-ops.service';
import { startOfDay } from '../domain/analytics.engine';

@Injectable()
export class CoffeeCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: CoffeeAiService,
    private readonly reception: CoffeeReceptionService,
    private readonly stats: CoffeeStatsService,
    private readonly ops: CoffeeOpsService,
  ) {}

  async dashboard(organizationId: string, userId?: string) {
    const start = startOfDay();

    const [
      ticketsToday,
      queue,
      weighedToday,
      qualityToday,
      settlementsToday,
      inventoryToday,
      kgToday,
      amountToday,
      suggestions,
      kpis,
      purchasesToday,
      operations,
      alerts,
    ] = await Promise.all([
      this.prisma.cpepReceptionTicket.count({ where: { organizationId, createdAt: { gte: start } } }),
      this.reception.listQueue(organizationId),
      this.prisma.cpepReceptionTicket.count({
        where: {
          organizationId,
          status: {
            in: ['weighed', 'quality_pending', 'quality_done', 'settlement_pending', 'settled', 'inventory_posted'],
          },
          createdAt: { gte: start },
        },
      }),
      this.prisma.cpepQualityAssessment.count({ where: { organizationId, assessedAt: { gte: start } } }),
      this.prisma.cpepSettlement.count({ where: { organizationId, createdAt: { gte: start }, voided: false } }),
      this.prisma.cpepInventoryMovement.count({ where: { organizationId, postedAt: { gte: start } } }),
      this.prisma.cpepReceptionTicket.aggregate({
        where: { organizationId, createdAt: { gte: start }, netWeightKg: { not: null } },
        _sum: { netWeightKg: true },
      }),
      this.prisma.cpepSettlement.aggregate({
        where: { organizationId, createdAt: { gte: start }, voided: false },
        _sum: { totalAmount: true },
      }),
      this.ai.analyze(organizationId),
      this.stats.kpis(organizationId, 30, userId),
      this.stats.purchasesToday(organizationId),
      this.ops.operationsCenter(organizationId, userId),
      this.ops.listAlerts(organizationId, true),
    ]);

    return {
      ticketsToday,
      queueLength: queue.length,
      weighedToday,
      qualityToday,
      settlementsToday,
      inventoryToday,
      kgToday: kgToday._sum.netWeightKg ?? 0,
      amountToday: amountToday._sum.totalAmount ?? 0,
      queue: queue.slice(0, 20),
      purchasesToday: purchasesToday.slice(0, 20),
      kpis,
      suggestions,
      operations,
      alerts: alerts.slice(0, 20),
    };
  }

  async executiveDashboard(organizationId: string, userId?: string) {
    const [kpis, statistics, analytics, suggestions] = await Promise.all([
      this.stats.kpis(organizationId, 30, userId),
      this.stats.statistics(organizationId, userId),
      this.stats.analytics(organizationId, userId),
      this.ai.analyze(organizationId),
    ]);
    return { kpis, statistics, analytics, suggestions };
  }

  async operationalDashboard(organizationId: string, userId?: string) {
    const [operations, alerts, purchasesToday] = await Promise.all([
      this.ops.operationsCenter(organizationId, userId),
      this.ops.evaluateAlerts(organizationId, userId),
      this.stats.purchasesToday(organizationId),
    ]);
    return { operations, alerts, purchasesToday };
  }
}
