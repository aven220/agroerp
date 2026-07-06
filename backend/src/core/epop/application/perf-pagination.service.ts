import { Injectable } from '@nestjs/common';
import { EpopPaginationParams } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { buildPaginatedResult, normalizePagination } from '../domain/pagination.engine';

@Injectable()
export class PerfPaginationService {
  constructor(private readonly prisma: PrismaService) {}

  async paginatePerfMetrics(organizationId: string, params?: EpopPaginationParams, kind?: string) {
    const { page, pageSize, skip } = normalizePagination(params);
    const where = {
      organizationId,
      ...(kind ? { kind: kind as 'response_time' } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.epopPerfMetric.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.epopPerfMetric.count({ where }),
    ]);
    const nextCursor = items.length ? items[items.length - 1].id : undefined;
    return buildPaginatedResult(items, total, page, pageSize, nextCursor);
  }

  async paginateSlowQueries(organizationId: string, params?: EpopPaginationParams) {
    const { page, pageSize, skip } = normalizePagination(params);
    const where = { organizationId };
    const [items, total] = await Promise.all([
      this.prisma.epopSlowQuery.findMany({
        where,
        orderBy: { durationMs: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.epopSlowQuery.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, pageSize);
  }

  async streamMetrics(organizationId: string, limit = 1000) {
    const items = await this.prisma.epopPerfMetric.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        metricKey: true,
        kind: true,
        value: true,
        moduleKey: true,
        recordedAt: true,
      },
    });
    return {
      format: 'ndjson',
      count: items.length,
      stream: items.map((i) => JSON.stringify(i)).join('\n'),
    };
  }
}
