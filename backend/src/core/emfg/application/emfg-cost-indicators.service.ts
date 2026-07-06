import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateCostIndicators } from '../domain/emfg-cost.engine';

@Injectable()
export class EmfgCostIndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const [orders, variances, wipOpen, lots] = await Promise.all([
      this.prisma.emfgCostOrderSummary.findMany({ where: { organizationId }, take: 500 }),
      this.prisma.emfgCostVariance.findMany({ where: { organizationId }, take: 1000 }),
      this.prisma.emfgCostWipRecord.count({ where: { organizationId, status: 'open' } }),
      this.prisma.emfgCostLotSummary.findMany({ where: { organizationId }, take: 200 }),
    ]);

    const indicators = aggregateCostIndicators({ orders, variances });

    return {
      indicators,
      wipOpenCount: wipOpen,
      lotSummaries: lots,
      recentOrders: orders.slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }

  history(organizationId: string, limit = 100) {
    return this.prisma.emfgCostCalculation.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }
}
