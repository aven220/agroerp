import { BadRequestException, Injectable } from '@nestjs/common';
import { BiQueryAggregation, BiQueryFilter, BiVisualQueryDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BiQueryEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(organizationId: string, query: BiVisualQueryDefinition) {
    const start = Date.now();
    const rows = await this.fetchRows(organizationId, query);
    const aggregated = this.applyAggregations(rows, query);
    const sorted = this.applyOrder(aggregated, query);
    const limited = query.limit ? sorted.slice(0, query.limit) : sorted;

    return {
      dataSource: query.dataSource,
      rowCount: limited.length,
      columns: this.inferColumns(limited),
      rows: limited,
      durationMs: Date.now() - start,
    };
  }

  async preview(organizationId: string, query: BiVisualQueryDefinition) {
    return this.execute(organizationId, { ...query, limit: query.limit ?? 100 });
  }

  private async fetchRows(organizationId: string, query: BiVisualQueryDefinition) {
    const baseWhere = { organizationId, deletedAt: null as Date | null };

    switch (query.dataSource) {
      case 'producers':
        return this.prisma.producer.findMany({
          where: this.applyFilters({ ...baseWhere }, query.filters),
          select: {
            id: true,
            producerNumber: true,
            legalName: true,
            lifecycleStatus: true,
            municipalityCode: true,
            categoryCode: true,
            qualityScore: true,
            riskScore: true,
            registeredAt: true,
            activatedAt: true,
          },
          take: 10000,
        });
      case 'farms':
        return this.prisma.farmUnit.findMany({
          where: this.applyFilters({ organizationId, deletedAt: null }, query.filters),
          select: {
            id: true,
            farmCode: true,
            farmName: true,
            status: true,
            municipalityCode: true,
            totalAreaHa: true,
            agriculturalAreaHa: true,
            registeredAt: true,
          },
          take: 10000,
        });
      case 'lots':
        return this.prisma.fieldLotProfile.findMany({
          where: this.applyFilters({ organizationId, deletedAt: null }, query.filters),
          select: {
            id: true,
            lotCode: true,
            lotName: true,
            status: true,
            lotTypeCode: true,
            totalAreaHa: true,
            createdAt: true,
          },
          take: 10000,
        });
      case 'form_submissions':
        return this.prisma.formSubmission.findMany({
          where: this.applyFilters({ organizationId, deletedAt: null }, query.filters),
          select: {
            id: true,
            formId: true,
            status: true,
            syncStatus: true,
            createdAt: true,
          },
          take: 10000,
        });
      case 'workflows':
        return this.prisma.workflowInstance.findMany({
          where: { organizationId, ...(query.filters ? {} : {}) },
          select: {
            id: true,
            currentState: true,
            status: true,
            priority: true,
            startedAt: true,
            completedAt: true,
          },
          take: 10000,
        });
      case 'events':
        return this.prisma.event.findMany({
          where: { organizationId },
          select: {
            id: true,
            eventType: true,
            aggregateType: true,
            occurredAt: true,
          },
          orderBy: { occurredAt: 'desc' },
          take: 5000,
        });
      case 'lot_twins':
        return this.prisma.lotDigitalTwin.findMany({
          where: { organizationId },
          select: {
            fieldLotId: true,
            productionYtdKg: true,
            marginPct: true,
            costPerHa: true,
            ndviLatest: true,
            lastRefreshedAt: true,
          },
          take: 10000,
        });
      case 'farm_twins':
        return this.prisma.farmDigitalTwin.findMany({
          where: { organizationId },
          select: {
            farmUnitId: true,
            totalAreaHa: true,
            productionYtdKg: true,
            avgYieldKgHa: true,
            lastRefreshedAt: true,
          },
          take: 10000,
        });
      case 'kpi_history':
        return this.prisma.biKpiHistory.findMany({
          where: { kpi: { organizationId } },
          select: {
            id: true,
            kpiId: true,
            value: true,
            targetValue: true,
            variancePct: true,
            capturedAt: true,
          },
          orderBy: { capturedAt: 'desc' },
          take: 5000,
        });
      case 'notifications':
        return this.prisma.notificationMessage.findMany({
          where: { organizationId, deletedAt: null },
          select: {
            id: true,
            title: true,
            alertSeverity: true,
            channel: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
      default:
        throw new BadRequestException(`Fuente de datos no soportada: ${query.dataSource}`);
    }
  }

  private applyFilters(
    where: Record<string, unknown>,
    filters?: BiQueryFilter[],
  ): Record<string, unknown> {
    if (!filters?.length) return where;
    const result = { ...where };
    for (const f of filters) {
      switch (f.operator) {
        case 'eq':
          result[f.field] = f.value;
          break;
        case 'neq':
          result[f.field] = { not: f.value };
          break;
        case 'gt':
          result[f.field] = { gt: f.value };
          break;
        case 'gte':
          result[f.field] = { gte: f.value };
          break;
        case 'lt':
          result[f.field] = { lt: f.value };
          break;
        case 'lte':
          result[f.field] = { lte: f.value };
          break;
        case 'in':
          result[f.field] = { in: f.value };
          break;
        case 'contains':
          result[f.field] = { contains: f.value, mode: 'insensitive' };
          break;
        default:
          break;
      }
    }
    return result;
  }

  private applyAggregations(
    rows: Record<string, unknown>[],
    query: BiVisualQueryDefinition,
  ) {
    if (!query.groupBy?.length || !query.aggregations?.length) {
      return rows.map((r) => this.serializeRow(r));
    }

    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = query.groupBy!.map((g) => String(row[g] ?? '')).join('|');
      const bucket = groups.get(key) ?? [];
      bucket.push(row);
      groups.set(key, bucket);
    }

    const result: Record<string, unknown>[] = [];
    for (const [, items] of groups) {
      const out: Record<string, unknown> = {};
      for (const g of query.groupBy!) out[g] = items[0][g];
      for (const agg of query.aggregations!) {
        out[agg.alias] = this.aggregateFn(items, agg);
      }
      result.push(out);
    }
    return result;
  }

  private aggregateFn(items: Record<string, unknown>[], agg: BiQueryAggregation) {
    const values = items
      .map((i) => i[agg.field])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => Number(v));

    switch (agg.fn) {
      case 'count':
        return agg.field === 'id' || agg.field === '*' ? items.length : values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min':
        return values.length ? Math.min(...values) : 0;
      case 'max':
        return values.length ? Math.max(...values) : 0;
      default:
        return items.length;
    }
  }

  private applyOrder(rows: Record<string, unknown>[], query: BiVisualQueryDefinition) {
    if (!query.orderBy?.length) return rows;
    return [...rows].sort((a, b) => {
      for (const o of query.orderBy!) {
        const av = a[o.field];
        const bv = b[o.field];
        if (av === bv) continue;
        const cmp = av! > bv! ? 1 : -1;
        return o.direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }

  private serializeRow(row: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) out[k] = v.toISOString();
      else if (typeof v === 'object' && v !== null && 'toNumber' in v) {
        out[k] = Number(v);
      } else out[k] = v;
    }
    return out;
  }

  private inferColumns(rows: Record<string, unknown>[]) {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map((key) => ({ key, label: key }));
  }
}
