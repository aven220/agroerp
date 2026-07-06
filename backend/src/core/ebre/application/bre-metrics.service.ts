import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 86_400_000);

    const [
      totalRules,
      publishedRules,
      executions24h,
      failures24h,
      avgDuration,
      simulations24h,
    ] = await Promise.all([
      this.prisma.breBusinessRule.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.breBusinessRule.count({ where: { organizationId, status: 'published', deletedAt: null } }),
      this.prisma.breRuleExecution.count({ where: { organizationId, executedAt: { gte: since24h } } }),
      this.prisma.breRuleExecution.count({
        where: { organizationId, executedAt: { gte: since24h }, status: 'failed' },
      }),
      this.prisma.breRuleExecution.aggregate({
        where: { organizationId, executedAt: { gte: since24h } },
        _avg: { durationMs: true },
      }),
      this.prisma.breRuleSimulation.count({ where: { organizationId, createdAt: { gte: since24h } } }),
    ]);

    const topRules = await this.prisma.breRuleExecution.groupBy({
      by: ['ruleKey'],
      where: { organizationId, executedAt: { gte: since24h } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return {
      totalRules,
      publishedRules,
      executions24h,
      failures24h,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      simulations24h,
      openConflicts: 0,
      topRules: topRules.map((r) => ({ ruleKey: r.ruleKey, count: r._count.id })),
      successRatePct: executions24h
        ? Math.round(((executions24h - failures24h) / executions24h) * 100)
        : 100,
    };
  }
}
