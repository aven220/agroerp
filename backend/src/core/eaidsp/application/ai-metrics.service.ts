import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiExplainability, AiServiceType } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(organizationId: string, userId: string) {
    const quota = await this.getOrCreateQuota(organizationId, 'user', userId);
    if (quota.dailyUsed >= quota.dailyLimit) {
      throw new ForbiddenException('Límite diario de consultas IA alcanzado');
    }
    if (quota.monthlyUsed >= quota.monthlyLimit) {
      throw new ForbiddenException('Límite mensual de consultas IA alcanzado');
    }
  }

  async incrementQuota(organizationId: string, userId: string) {
    const quota = await this.getOrCreateQuota(organizationId, 'user', userId);
    await this.prisma.aiUsageQuota.update({
      where: { id: quota.id },
      data: { dailyUsed: quota.dailyUsed + 1, monthlyUsed: quota.monthlyUsed + 1 },
    });
  }

  async logRequest(data: {
    organizationId: string;
    userId?: string;
    serviceType: AiServiceType;
    providerType: string;
    modelKey: string;
    moduleContext?: string;
    tokensIn: number;
    tokensOut: number;
    estimatedCost?: number;
    latencyMs: number;
    confidence?: number;
    explainability: AiExplainability;
    status?: string;
  }) {
    return this.prisma.aiRequestLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        serviceType: data.serviceType,
        providerType: data.providerType,
        modelKey: data.modelKey,
        moduleContext: data.moduleContext,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        estimatedCost: data.estimatedCost,
        latencyMs: data.latencyMs,
        confidence: data.confidence,
        explainability: data.explainability as object,
        status: data.status ?? 'success',
      },
    });
  }

  async getDashboard(organizationId: string) {
    const dayAgo = new Date(Date.now() - 24 * 3600000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600000);

    const [total24h, totalMonth, byService, byModel, byUser, avgLatency, successRate] =
      await Promise.all([
        this.prisma.aiRequestLog.count({ where: { organizationId, createdAt: { gte: dayAgo } } }),
        this.prisma.aiRequestLog.count({ where: { organizationId, createdAt: { gte: monthAgo } } }),
        this.prisma.aiRequestLog.groupBy({
          by: ['serviceType'],
          where: { organizationId, createdAt: { gte: monthAgo } },
          _count: { id: true },
        }),
        this.prisma.aiRequestLog.groupBy({
          by: ['modelKey'],
          where: { organizationId, createdAt: { gte: monthAgo } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        this.prisma.aiRequestLog.groupBy({
          by: ['userId'],
          where: { organizationId, createdAt: { gte: monthAgo } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        this.prisma.aiRequestLog.aggregate({
          where: { organizationId, createdAt: { gte: monthAgo } },
          _avg: { latencyMs: true },
        }),
        this.prisma.aiRequestLog.groupBy({
          by: ['status'],
          where: { organizationId, createdAt: { gte: monthAgo } },
          _count: { id: true },
        }),
      ]);

    const costAgg = await this.prisma.aiRequestLog.aggregate({
      where: { organizationId, createdAt: { gte: monthAgo } },
      _sum: { estimatedCost: true },
    });

    const totalRequests = successRate.reduce((s, r) => s + r._count.id, 0);
    const successes = successRate.find((r) => r.status === 'success')?._count.id ?? 0;

    return {
      kpis: {
        requests24h: total24h,
        requestsMonth: totalMonth,
        estimatedCostMonth: Number(costAgg._sum.estimatedCost ?? 0),
        avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
        successRatePct: totalRequests ? Math.round((successes / totalRequests) * 100) : 100,
      },
      byService: byService.map((s) => ({ service: s.serviceType, count: s._count.id })),
      byModel: byModel.map((m) => ({ model: m.modelKey, count: m._count.id })),
      byUser: byUser.map((u) => ({ userId: u.userId, count: u._count.id })),
    };
  }

  private async getOrCreateQuota(organizationId: string, scope: string, scopeRef?: string) {
    const existing = await this.prisma.aiUsageQuota.findFirst({
      where: { organizationId, scope, scopeRef: scopeRef ?? null },
    });
    if (existing) {
      if (existing.resetAt < new Date()) {
        return this.prisma.aiUsageQuota.update({
          where: { id: existing.id },
          data: { dailyUsed: 0, resetAt: new Date(Date.now() + 24 * 3600000) },
        });
      }
      return existing;
    }
    return this.prisma.aiUsageQuota.create({
      data: {
        organizationId,
        scope,
        scopeRef,
        resetAt: new Date(Date.now() + 24 * 3600000),
      },
    });
  }
}
