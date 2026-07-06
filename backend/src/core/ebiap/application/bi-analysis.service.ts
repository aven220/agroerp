import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BiQueryEngineService } from './bi-query-engine.service';
import { BiVisualQueryDefinition } from '@agroerp/shared';

@Injectable()
export class BiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryEngine: BiQueryEngineService,
  ) {}

  async trends(
    organizationId: string,
    dataSource: string,
    field: string,
    days = 30,
  ) {
    const since = new Date(Date.now() - days * 86400000);
    const query: BiVisualQueryDefinition = {
      dataSource: dataSource as BiVisualQueryDefinition['dataSource'],
      filters: [{ field: 'createdAt', operator: 'gte', value: since.toISOString() }],
      groupBy: ['createdAt'],
      aggregations: [{ field, fn: 'count', alias: 'value' }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    };
    return this.queryEngine.execute(organizationId, query);
  }

  async ranking(
    organizationId: string,
    dataSource: string,
    groupField: string,
    metricField: string,
    fn: 'count' | 'sum' | 'avg' = 'count',
    limit = 10,
  ) {
    const query: BiVisualQueryDefinition = {
      dataSource: dataSource as BiVisualQueryDefinition['dataSource'],
      groupBy: [groupField],
      aggregations: [{ field: metricField, fn, alias: 'value' }],
      orderBy: [{ field: 'value', direction: 'desc' }],
      limit,
    };
    return this.queryEngine.execute(organizationId, query);
  }

  async topN(organizationId: string, dataSource: string, groupField: string, n = 10) {
    return this.ranking(organizationId, dataSource, groupField, 'id', 'count', n);
  }

  async bottomN(organizationId: string, dataSource: string, groupField: string, n = 10) {
    const result = await this.ranking(organizationId, dataSource, groupField, 'id', 'count', n * 2);
    return { ...result, rows: [...result.rows].reverse().slice(0, n) };
  }

  async geographic(organizationId: string) {
    const byMunicipality = await this.prisma.producer.groupBy({
      by: ['municipalityCode'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    const lotsByFarm = await this.prisma.fieldLotProfile.groupBy({
      by: ['farmUnitId'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      _sum: { totalAreaHa: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return {
      producers: byMunicipality.map((r) => ({
        municipality: r.municipalityCode ?? 'N/A',
        count: r._count?.id ?? 0,
      })),
      lots: lotsByFarm.map((r) => ({
        farmUnitId: r.farmUnitId,
        count: r._count?.id ?? 0,
        areaHa: Number(r._sum?.totalAreaHa ?? 0),
      })),
    };
  }

  async financial(organizationId: string) {
    const [costs, operations] = await Promise.all([
      this.prisma.lotCostEntry.groupBy({
        by: ['costCategoryCode'],
        where: { organizationId },
        _sum: { amount: true },
      }),
      this.prisma.fieldOperation.aggregate({
        where: { organizationId },
        _sum: { laborCost: true, inputCost: true, equipmentCost: true },
        _count: { id: true },
      }),
    ]);
    return {
      costsByCategory: costs.map((c) => ({
        category: c.costCategoryCode,
        amount: Number(c._sum.amount ?? 0),
      })),
      operations: {
        count: operations._count.id,
        laborCost: Number(operations._sum.laborCost ?? 0),
        inputCost: Number(operations._sum.inputCost ?? 0),
        equipmentCost: Number(operations._sum.equipmentCost ?? 0),
      },
    };
  }

  async operational(organizationId: string) {
    const [workflows, forms, operations] = await Promise.all([
      this.prisma.workflowInstance.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.prisma.formSubmission.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.fieldOperation.count({ where: { organizationId } }),
    ]);
    return {
      workflows: workflows.map((w) => ({ status: w.status, count: w._count.id })),
      forms: forms.map((f) => ({ status: f.status, count: f._count.id })),
      fieldOperations: operations,
    };
  }

  async productivity(organizationId: string) {
    const twins = await this.prisma.lotDigitalTwin.findMany({
      where: { organizationId },
      select: {
        fieldLotId: true,
        productionYtdKg: true,
        avgYieldKgHa: true,
        marginPct: true,
        costPerHa: true,
      },
      orderBy: { productionYtdKg: 'desc' },
      take: 20,
    });
    return twins.map((t) => ({
      fieldLotId: t.fieldLotId,
      productionYtdKg: Number(t.productionYtdKg ?? 0),
      yieldKgHa: Number(t.avgYieldKgHa ?? 0),
      marginPct: Number(t.marginPct ?? 0),
      costPerHa: Number(t.costPerHa ?? 0),
    }));
  }

  async compareHistorical(
    organizationId: string,
    dataSource: string,
    groupField: string,
    period: 'previous_period' | 'previous_year' = 'previous_period',
  ) {
    const days = period === 'previous_year' ? 365 : 30;
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 86400000);
    const previousStart = new Date(currentStart.getTime() - days * 86400000);

    const currentQuery: BiVisualQueryDefinition = {
      dataSource: dataSource as BiVisualQueryDefinition['dataSource'],
      filters: [{ field: 'createdAt', operator: 'gte', value: currentStart.toISOString() }],
      groupBy: [groupField],
      aggregations: [{ field: 'id', fn: 'count', alias: 'current' }],
    };
    const previousQuery: BiVisualQueryDefinition = {
      dataSource: dataSource as BiVisualQueryDefinition['dataSource'],
      filters: [
        { field: 'createdAt', operator: 'gte', value: previousStart.toISOString() },
        { field: 'createdAt', operator: 'lt', value: currentStart.toISOString() },
      ],
      groupBy: [groupField],
      aggregations: [{ field: 'id', fn: 'count', alias: 'previous' }],
    };

    const [current, previous] = await Promise.all([
      this.queryEngine.execute(organizationId, currentQuery),
      this.queryEngine.execute(organizationId, previousQuery),
    ]);

    const prevMap = new Map(previous.rows.map((r) => [String(r[groupField]), Number(r.previous ?? 0)]));
    const comparison = current.rows.map((r) => {
      const key = String(r[groupField]);
      const cur = Number(r.current ?? 0);
      const prev = prevMap.get(key) ?? 0;
      const changePct = prev ? ((cur - prev) / prev) * 100 : null;
      return { [groupField]: key, current: cur, previous: prev, changePct };
    });

    return { period, comparison };
  }
}
