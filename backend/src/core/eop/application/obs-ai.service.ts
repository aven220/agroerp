import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ObsAiService {
  constructor(private readonly prisma: PrismaService) {}

  record(organizationId: string, data: {
    modelKey: string; provider: string; tokensIn?: number; tokensOut?: number;
    costUsd?: number; durationMs: number; success?: boolean; qualityScore?: number;
    errorMessage?: string; attributes?: Record<string, unknown>;
  }) {
    return this.prisma.eopAiUsageMetric.create({
      data: {
        organizationId,
        modelKey: data.modelKey,
        provider: data.provider,
        tokensIn: data.tokensIn ?? 0,
        tokensOut: data.tokensOut ?? 0,
        costUsd: data.costUsd ?? 0,
        durationMs: data.durationMs,
        success: data.success ?? true,
        qualityScore: data.qualityScore,
        errorMessage: data.errorMessage,
        attributes: (data.attributes ?? {}) as object,
      },
    });
  }

  async summary(organizationId: string, sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const rows = await this.prisma.eopAiUsageMetric.findMany({
      where: { organizationId, recordedAt: { gte: since } },
    });
    return {
      requests: rows.length,
      tokensIn: rows.reduce((s, r) => s + r.tokensIn, 0),
      tokensOut: rows.reduce((s, r) => s + r.tokensOut, 0),
      costUsd: rows.reduce((s, r) => s + r.costUsd, 0),
      avgDurationMs: rows.length ? rows.reduce((s, r) => s + r.durationMs, 0) / rows.length : 0,
      errorRate: rows.length ? rows.filter((r) => !r.success).length / rows.length : 0,
      avgQuality: rows.filter((r) => r.qualityScore != null).length
        ? rows.filter((r) => r.qualityScore != null).reduce((s, r) => s + (r.qualityScore ?? 0), 0)
          / rows.filter((r) => r.qualityScore != null).length
        : null,
    };
  }

  list(organizationId: string, limit = 100) {
    return this.prisma.eopAiUsageMetric.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
