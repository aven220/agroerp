import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BiVisualQueryDefinition } from '@agroerp/shared';
import { EintStatus } from '@agroerp/prisma-eint-client';
import { BiKpiService } from '@/core/ebiap/application/bi-kpi.service';
import { BiQueryEngineService } from '@/core/ebiap/application/bi-query-engine.service';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { computeTrend, EINT_KPI_CATEGORIES, generateEintKey } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintBiService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly kpis: BiKpiService,
    private readonly queryEngine: BiQueryEngineService,
    private readonly audit: EintAuditService,
  ) {}

  kpiCategories() {
    return EINT_KPI_CATEGORIES;
  }

  listBindings(organizationId: string, category?: string) {
    return this.prisma.eintKpiBinding.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: { kpiKey: 'asc' },
    });
  }

  async createBinding(
    organizationId: string,
    kpiKey: string,
    name: string,
    category: string,
    moduleRef: string,
    formula?: string,
    targetValue?: number,
  ) {
    const existing = await this.prisma.eintKpiBinding.findFirst({ where: { organizationId, kpiKey } });
    if (existing) throw new BadRequestException(`KPI ${kpiKey} ya existe`);
    return this.prisma.eintKpiBinding.create({
      data: { organizationId, kpiKey, name, category, moduleRef, formula, targetValue, status: 'active' },
    });
  }

  async listEbiapKpis(organizationId: string) {
    return this.kpis.findAll(organizationId);
  }

  async executeQuery(organizationId: string, userId: string, query: BiVisualQueryDefinition) {
    const start = Date.now();
    const result = await this.queryEngine.execute(organizationId, query);
    const seq = await this.prisma.eintQueryLog.count({ where: { organizationId } });
    await this.prisma.eintQueryLog.create({
      data: {
        organizationId,
        queryKey: generateEintKey('QRY', seq + 1),
        source: query.dataSource,
        durationMs: Date.now() - start,
        rowCount: result.rowCount,
        userId,
        success: true,
      },
    });
    await this.audit.log(organizationId, 'EintQuery', query.dataSource, 'query_executed', userId, { rowCount: result.rowCount });
    return result;
  }

  async compare(organizationId: string, values: number[]) {
    return { trend: computeTrend(values), values };
  }

  queryLogs(organizationId: string, limit = 100) {
    return this.prisma.eintQueryLog.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: limit });
  }
}
