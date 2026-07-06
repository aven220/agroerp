import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import {
  classifyVelocity,
  computeCoverageDays,
  computeInventoryAccuracy,
  computeOccupancy,
  computeServiceLevel,
  computeTurnover,
  detectAbnormalCost,
  formatExport,
  generateKpiKey,
  generateOpsAlertKey,
  generateQueryKey,
  generateReportKey,
  generateRunKey,
  generateSnapshotKey,
  groupByHour,
  summarizeBalances,
  trendSeries,
  EIMS_SYSTEM_REPORTS,
  type EimsOpsAlertTypeValue,
  type EimsReportFormatValue,
  type EimsReportTypeValue,
} from '../domain/eims-ops.engine';

type OpsPolicy = {
  itemKey: string;
  warehouseKey: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
};

@Injectable()
export class EimsOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  async operationsCenter(organizationId: string, userId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [balances, warehouses, movementsToday, policies, lots, reservations] = await Promise.all([
      this.prisma.eimsStockBalance.findMany({
        where: { organizationId },
        include: {
          item: { select: { itemKey: true, name: true, categoryKey: true } },
          warehouse: { select: { warehouseKey: true, name: true, metadata: true } },
        },
        take: 5000,
      }),
      this.prisma.eimsWarehouse.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.eimsMovement.findMany({
        where: { organizationId, status: 'confirmed', postedAt: { gte: startOfDay } },
        include: { item: { select: { itemKey: true } } },
        orderBy: { postedAt: 'asc' },
        take: 5000,
      }),
      this.loadOpsPolicies(organizationId),
      this.prisma.eimsStockLot.findMany({
        where: { organizationId, onHandQty: { gt: 0 } },
        include: { item: true, warehouse: true },
        take: 2000,
      }),
      this.prisma.eimsReservation.findMany({
        where: { organizationId, status: { in: ['active', 'partial'] } },
      }),
    ]);

    const summary = summarizeBalances(balances);
    const policyMap = new Map(policies.map((p) => [`${p.itemKey}|${p.warehouseKey}`, p]));
    let totalDemand = 0;
    let demandPoints = 0;
    for (const p of policies) {
      if (p.avgDailyDemand > 0) {
        totalDemand += p.avgDailyDemand;
        demandPoints += 1;
      }
    }
    const avgDailyDemand = demandPoints > 0 ? totalDemand / demandPoints : 0;
    const coverage = computeCoverageDays(summary.availableQty, avgDailyDemand);

    const exitToday = movementsToday
      .filter((m) =>
        ['exit', 'consumption', 'shrinkage', 'loss', 'donation', 'transformation'].includes(
          m.movementType,
        ),
      )
      .reduce((s, m) => s + Math.abs(m.quantity), 0);
    const turnover = computeTurnover(exitToday * 30, summary.totalQty || 1);

    const occupancyMap = warehouses.map((w) => {
      const used = balances
        .filter((b) => b.warehouse.warehouseKey === w.warehouseKey)
        .reduce((s, b) => s + b.onHandQty, 0);
      const meta = (w.metadata ?? {}) as { capacity?: number };
      const capacity = meta.capacity && meta.capacity > 0 ? meta.capacity : Math.max(used * 1.25, 1000);
      const occ = computeOccupancy(used, capacity);
      return {
        warehouseKey: w.warehouseKey,
        name: w.name,
        usedCapacity: used,
        totalCapacity: capacity,
        ...occ,
      };
    });

    const criticalItems = balances
      .filter((b) => {
        const policy = policyMap.get(`${b.item.itemKey}|${b.warehouse.warehouseKey}`);
        if (!policy) return b.availableQty <= 0;
        return b.availableQty <= policy.minStock || b.availableQty <= policy.reorderPoint;
      })
      .slice(0, 50)
      .map((b) => ({
        itemKey: b.item.itemKey,
        warehouseKey: b.warehouse.warehouseKey,
        availableQty: b.availableQty,
        onHandQty: b.onHandQty,
        totalCost: b.totalCost,
      }));

    const metrics = {
      totalQty: summary.totalQty,
      inventoryValue: summary.inventoryValue,
      availableQty: summary.availableQty,
      reservedQty: summary.reservedQty,
      blockedQty: summary.blockedQty,
      turnover,
      coverageDays: coverage,
      averageCost: summary.averageCost,
      movementsToday: movementsToday.length,
      movementsByHour: groupByHour(movementsToday.map((m) => m.postedAt)),
      warehouseOccupancy: occupancyMap,
      capacityUsed: occupancyMap.reduce((s, o) => s + o.usedCapacity, 0),
      capacityAvailable: occupancyMap.reduce((s, o) => s + o.availableCapacity, 0),
      criticalItems,
      activeReservations: reservations.length,
      lotsOnHand: lots.length,
      warehousesCount: warehouses.length,
      capturedAt: new Date().toISOString(),
    };

    const snapshotKey = generateSnapshotKey('live');
    await this.prisma.eimsOpsSnapshot.create({
      data: {
        organizationId,
        snapshotKey,
        metrics: metrics as object,
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsOpsSnapshot',
      snapshotKey,
      EVENT_TYPES.EIMS_OPS_SNAPSHOT,
      { snapshotKey },
    );

    if (userId) {
      await this.trackQuery(organizationId, userId, 'operations_center', {});
    }

    return metrics;
  }

  async kpis(organizationId: string, userId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const days30 = new Date();
    days30.setDate(days30.getDate() - 30);

    const [balances, movements, variances, policies, warehouses] = await Promise.all([
      this.prisma.eimsStockBalance.findMany({
        where: { organizationId },
        include: {
          item: { select: { itemKey: true, categoryKey: true } },
          warehouse: { select: { warehouseKey: true } },
        },
      }),
      this.prisma.eimsMovement.findMany({
        where: { organizationId, status: 'confirmed', postedAt: { gte: days30 } },
        include: { item: { select: { itemKey: true, categoryKey: true } } },
        take: 20000,
      }),
      this.prisma.eimsCountVariance.findMany({
        where: { organizationId, createdAt: { gte: days30 } },
        take: 2000,
      }),
      this.loadOpsPolicies(organizationId),
      this.prisma.eimsWarehouse.findMany({ where: { organizationId, isActive: true } }),
    ]);

    const summary = summarizeBalances(balances);
    const exits = movements.filter((m) =>
      ['exit', 'consumption', 'shrinkage', 'loss', 'donation'].includes(m.movementType),
    );
    const exitQty = exits.reduce((s, m) => s + Math.abs(m.quantity), 0);
    const losses = movements
      .filter((m) => m.movementType === 'loss')
      .reduce((s, m) => s + Math.abs(m.quantity), 0);
    const shrinkage = movements
      .filter((m) => m.movementType === 'shrinkage')
      .reduce((s, m) => s + Math.abs(m.quantity), 0);
    const adjustments = movements.filter((m) =>
      ['adjustment_positive', 'adjustment_negative'].includes(m.movementType),
    ).length;

    const avgDemand =
      policies.length > 0
        ? policies.reduce((s, p) => s + p.avgDailyDemand, 0) / policies.length
        : exitQty / 30;
    const turnover = computeTurnover(exitQty, summary.totalQty || 1);
    const coverageDays = computeCoverageDays(summary.availableQty, avgDemand);

    const stockouts = policies.filter((p) => {
      const bal = balances.find(
        (b) => b.item.itemKey === p.itemKey && b.warehouse.warehouseKey === p.warehouseKey,
      );
      return !bal || bal.availableQty <= 0;
    }).length;
    const serviceLevel = computeServiceLevel(policies.length - stockouts, stockouts);

    const accuracySamples = variances.map((v) =>
      computeInventoryAccuracy(v.systemQty, v.physicalQty),
    );
    const inventoryAccuracy =
      accuracySamples.length > 0
        ? Number(
            (accuracySamples.reduce((s, v) => s + v, 0) / accuracySamples.length).toFixed(2),
          )
        : 100;

    const valueByWarehouse: Record<string, number> = {};
    const valueByCategory: Record<string, number> = {};
    for (const b of balances) {
      valueByWarehouse[b.warehouse.warehouseKey] =
        (valueByWarehouse[b.warehouse.warehouseKey] ?? 0) + b.totalCost;
      const cat = b.item.categoryKey ?? 'uncategorized';
      valueByCategory[cat] = (valueByCategory[cat] ?? 0) + b.totalCost;
    }

    const noMovementItems = balances.filter((b) => {
      const hasExit = exits.some((m) => m.item.itemKey === b.item.itemKey);
      return b.onHandQty > 0 && !hasExit;
    }).length;

    const kpis = {
      turnover,
      coverageDays,
      serviceLevel,
      inventoryAccuracy,
      inventoryValue: summary.inventoryValue,
      averageCost: summary.averageCost,
      valueByWarehouse,
      valueByCompany: { [organizationId]: summary.inventoryValue },
      valueByCategory,
      averageStayDays: coverageDays,
      itemsWithoutMovement: noMovementItems,
      losses,
      shrinkage,
      adjustments,
      warehousesCount: warehouses.length,
      periodDays: 30,
    };

    const periodDate = startOfDay.toISOString().slice(0, 10);
    const kpiKey = generateKpiKey(periodDate);
    await this.prisma.eimsKpiSnapshot.upsert({
      where: { organizationId_kpiKey: { organizationId, kpiKey } },
      update: { kpis: kpis as object },
      create: {
        organizationId,
        kpiKey,
        periodDate: startOfDay,
        periodType: 'daily',
        kpis: kpis as object,
      },
    });

    if (userId) await this.trackQuery(organizationId, userId, 'kpis', {});
    return kpis;
  }

  async analytics(
    organizationId: string,
    userId?: string,
    filters?: { warehouseKey?: string; itemKey?: string; days?: number },
  ) {
    const days = filters?.days ?? 30;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const movements = await this.prisma.eimsMovement.findMany({
      where: {
        organizationId,
        status: 'confirmed',
        postedAt: { gte: from },
        ...(filters?.itemKey ? { item: { itemKey: filters.itemKey } } : {}),
        ...(filters?.warehouseKey
          ? {
              OR: [
                { fromWarehouse: { warehouseKey: filters.warehouseKey } },
                { toWarehouse: { warehouseKey: filters.warehouseKey } },
              ],
            }
          : {}),
      },
      include: {
        item: { select: { itemKey: true, categoryKey: true } },
        fromWarehouse: { select: { warehouseKey: true } },
        toWarehouse: { select: { warehouseKey: true } },
      },
      orderBy: { postedAt: 'asc' },
      take: 20000,
    });

    const byDay = new Map<string, { entries: number; exits: number; qtyIn: number; qtyOut: number; cost: number }>();
    const itemExit = new Map<string, number>();
    const costSeries: number[] = [];

    for (const m of movements) {
      const day = m.postedAt.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? { entries: 0, exits: 0, qtyIn: 0, qtyOut: 0, cost: 0 };
      const isEntry = ['entry', 'adjustment_positive', 'production', 'return'].includes(m.movementType);
      const isExit = ['exit', 'consumption', 'shrinkage', 'loss', 'donation', 'transformation'].includes(
        m.movementType,
      );
      if (isEntry) {
        bucket.entries += 1;
        bucket.qtyIn += Math.abs(m.quantity);
      }
      if (isExit) {
        bucket.exits += 1;
        bucket.qtyOut += Math.abs(m.quantity);
        itemExit.set(m.item.itemKey, (itemExit.get(m.item.itemKey) ?? 0) + Math.abs(m.quantity));
      }
      bucket.cost += m.totalCost;
      byDay.set(day, bucket);
      if (m.unitCost > 0) costSeries.push(m.unitCost);
    }

    const historicalTrends = trendSeries(
      [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, value: v.qtyOut })),
    );

    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: { select: { itemKey: true } }, warehouse: { select: { warehouseKey: true } } },
    });
    const stockTrend = balances.map((b) => ({
      itemKey: b.item.itemKey,
      warehouseKey: b.warehouse.warehouseKey,
      onHandQty: b.onHandQty,
      totalCost: b.totalCost,
    }));

    const ranked = [...itemExit.entries()]
      .map(([itemKey, qty]) => ({ itemKey, qty, velocity: classifyVelocity(qty / Math.max(1, days / 30)) }))
      .sort((a, b) => b.qty - a.qty);

    const result = {
      filters: filters ?? {},
      historicalTrends,
      consumption: historicalTrends,
      purchases: trendSeries(
        [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, value: v.qtyIn })),
      ),
      sales: historicalTrends,
      replenishment: await this.prisma.eimsSupplySuggestion.count({
        where: { organizationId, createdAt: { gte: from } },
      }),
      occupancy: await this.warehouseMap(organizationId),
      costVariation: trendSeries(
        [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, value: v.cost })),
      ),
      stockVariation: stockTrend.slice(0, 100),
      highRotation: ranked.filter((r) => r.velocity === 'high').slice(0, 20),
      lowRotation: ranked.filter((r) => r.velocity === 'low').slice(0, 20),
      immobilized: ranked.filter((r) => r.velocity === 'immobilized').slice(0, 20),
      abnormalCosts: costSeries.length
        ? detectAbnormalCost(costSeries[costSeries.length - 1], costSeries.slice(0, -1))
        : false,
    };

    if (userId) await this.trackQuery(organizationId, userId, 'analytics', filters ?? {});
    return result;
  }

  async warehouseMap(organizationId: string) {
    const warehouses = await this.prisma.eimsWarehouse.findMany({
      where: { organizationId, isActive: true },
    });
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { warehouse: { select: { warehouseKey: true } } },
    });
    return warehouses.map((w) => {
      const used = balances
        .filter((b) => b.warehouse.warehouseKey === w.warehouseKey)
        .reduce((s, b) => s + b.onHandQty, 0);
      const meta = (w.metadata ?? {}) as { capacity?: number };
      const capacity = meta.capacity && meta.capacity > 0 ? meta.capacity : Math.max(used * 1.25, 1000);
      const occ = computeOccupancy(used, capacity);
      return {
        warehouseKey: w.warehouseKey,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        usedCapacity: used,
        totalCapacity: capacity,
        ...occ,
      };
    });
  }

  async refreshOpsAlerts(organizationId: string, userId?: string) {
    const [balances, policies, lots, variances, adjustments, recentMoves, occupancy] =
      await Promise.all([
      this.prisma.eimsStockBalance.findMany({
        where: { organizationId },
        include: {
          item: { select: { itemKey: true } },
          warehouse: { select: { warehouseKey: true } },
        },
      }),
      this.loadOpsPolicies(organizationId),
      this.prisma.eimsStockLot.findMany({
        where: {
          organizationId,
          onHandQty: { gt: 0 },
          expiryDate: { lte: new Date(Date.now() + 30 * 86400000), gte: new Date() },
        },
        include: { item: true, warehouse: true },
      }),
      this.prisma.eimsCountVariance.findMany({
        where: { organizationId, requiresAdjustment: true, status: 'open' },
        include: { line: true },
        take: 200,
      }),
      this.prisma.eimsMovement.findMany({
        where: {
          organizationId,
          status: 'confirmed',
          movementType: { in: ['adjustment_positive', 'adjustment_negative'] },
          postedAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
        include: { item: { select: { itemKey: true } } },
        take: 500,
      }),
      this.prisma.eimsMovement.findMany({
        where: {
          organizationId,
          status: 'confirmed',
          postedAt: { gte: new Date(Date.now() - 90 * 86400000) },
        },
        select: { item: { select: { itemKey: true } } },
        take: 10000,
      }),
      this.warehouseMap(organizationId),
    ]);
    const movements = adjustments;
    const activeItems = new Set(recentMoves.map((m) => m.item.itemKey));

    const policyMap = new Map(policies.map((p) => [`${p.itemKey}|${p.warehouseKey}`, p]));
    const created: Array<{ alertKey: string; alertType: string }> = [];

    const upsertAlert = async (
      alertType: EimsOpsAlertTypeValue,
      ref: string,
      title: string,
      message: string,
      severity: string,
      itemKey?: string,
      warehouseKey?: string,
    ) => {
      const alertKey = generateOpsAlertKey(alertType, ref);
      await this.prisma.eimsOpsAlert.upsert({
        where: { organizationId_alertKey: { organizationId, alertKey } },
        update: { title, message, severity, acknowledged: false },
        create: {
          organizationId,
          alertKey,
          alertType,
          severity,
          title,
          message,
          itemKey,
          warehouseKey,
        },
      });
      created.push({ alertKey, alertType });
    };

    for (const b of balances) {
      const policy = policyMap.get(`${b.item.itemKey}|${b.warehouse.warehouseKey}`);
      if (policy && b.availableQty <= policy.minStock) {
        await upsertAlert(
          'critical_stock',
          `${b.item.itemKey}-${b.warehouse.warehouseKey}`,
          'Stock crítico',
          `${b.item.itemKey} en ${b.warehouse.warehouseKey} bajo mínimo`,
          'critical',
          b.item.itemKey,
          b.warehouse.warehouseKey,
        );
      }
      if (policy && policy.maxStock > 0 && b.onHandQty > policy.maxStock) {
        await upsertAlert(
          'overstock',
          `${b.item.itemKey}-${b.warehouse.warehouseKey}`,
          'Sobrestock',
          `${b.item.itemKey} supera máximo en ${b.warehouse.warehouseKey}`,
          'warning',
          b.item.itemKey,
          b.warehouse.warehouseKey,
        );
      }
    }

    for (const lot of lots) {
      await upsertAlert(
        'expiry',
        lot.lotKey,
        'Vencimiento próximo',
        `Lote ${lot.lotKey} vence ${lot.expiryDate?.toISOString().slice(0, 10)}`,
        'warning',
        lot.item.itemKey,
        lot.warehouse.warehouseKey,
      );
    }

    for (const o of occupancy) {
      if (o.saturated) {
        await upsertAlert(
          'warehouse_saturated',
          o.warehouseKey,
          'Bodega saturada',
          `${o.warehouseKey} al ${o.occupancyPct}%`,
          'critical',
          undefined,
          o.warehouseKey,
        );
      }
    }

    for (const b of balances) {
      if (b.onHandQty > 0 && !activeItems.has(b.item.itemKey)) {
        await upsertAlert(
          'immobilized',
          `${b.item.itemKey}-${b.warehouse.warehouseKey}`,
          'Inventario inmovilizado',
          `${b.item.itemKey} sin movimientos en 90 días`,
          'warning',
          b.item.itemKey,
          b.warehouse.warehouseKey,
        );
      }
    }

    const adjByItem = new Map<string, number>();
    for (const m of movements) {
      adjByItem.set(m.item.itemKey, (adjByItem.get(m.item.itemKey) ?? 0) + 1);
    }
    for (const [itemKey, count] of adjByItem) {
      if (count >= 5) {
        await upsertAlert(
          'unusual_adjustment',
          itemKey,
          'Ajustes inusuales',
          `${itemKey} con ${count} ajustes en 7 días`,
          'warning',
          itemKey,
        );
      }
    }

    for (const v of variances) {
      await upsertAlert(
        'count_difference',
        v.varianceKey,
        'Diferencia de conteo',
        `Variación ${v.varianceQty} en línea ${v.line.lineKey}`,
        'warning',
        v.line.itemKey,
        v.line.warehouseKey,
      );
    }

    const costs = movements.map((m) => m.unitCost).filter((c) => c > 0);
    if (costs.length > 3) {
      const latest = costs[costs.length - 1];
      if (detectAbnormalCost(latest, costs.slice(0, -1))) {
        await upsertAlert(
          'abnormal_cost',
          'global',
          'Costo anormal',
          `Costo unitario reciente ${latest} fuera de rango histórico`,
          'warning',
        );
      }
    }

    if (userId) {
      await this.audit.log(organizationId, 'OpsAlert', 'batch', 'refreshed', userId, {
        count: created.length,
      });
    }
    await this.core.emitUserAction(
      organizationId,
      'EimsOpsAlert',
      organizationId,
      EVENT_TYPES.EIMS_OPS_ALERT,
      { count: created.length },
    );
    return { count: created.length, alerts: created };
  }

  listOpsAlerts(organizationId: string, acknowledged?: boolean) {
    return this.prisma.eimsOpsAlert.findMany({
      where: {
        organizationId,
        ...(acknowledged == null ? {} : { acknowledged }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async acknowledgeOpsAlert(organizationId: string, userId: string, alertKey: string) {
    const alert = await this.prisma.eimsOpsAlert.findFirst({
      where: { organizationId, alertKey },
    });
    if (!alert) throw new NotFoundException(`Alerta ${alertKey} no encontrada`);
    return this.prisma.eimsOpsAlert.update({
      where: { id: alert.id },
      data: { acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() },
    });
  }

  async ensureSystemReports(organizationId: string, userId?: string) {
    let seq = 0;
    const created = [];
    for (const report of EIMS_SYSTEM_REPORTS) {
      seq += 1;
      const reportKey = generateReportKey(report.reportType, seq);
      const row = await this.prisma.eimsReportDefinition.upsert({
        where: {
          organizationId_reportKey: {
            organizationId,
            reportKey: `SYS-${report.reportType}`,
          },
        },
        update: { name: report.name },
        create: {
          organizationId,
          reportKey: `SYS-${report.reportType}`,
          name: report.name,
          reportType: report.reportType,
          columns: [],
          filters: {},
          isSystem: true,
          createdBy: userId,
        },
      });
      created.push(row);
    }
    return created;
  }

  listReportDefinitions(organizationId: string) {
    return this.prisma.eimsReportDefinition.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async saveReportDefinition(
    organizationId: string,
    userId: string,
    input: {
      reportKey?: string;
      name: string;
      reportType: string;
      columns?: string[];
      filters?: Record<string, unknown>;
      groupBy?: string[];
      sortBy?: string;
    },
  ) {
    const count = await this.prisma.eimsReportDefinition.count({ where: { organizationId } });
    const reportKey = input.reportKey ?? generateReportKey(input.reportType, count + 1);
    const row = await this.prisma.eimsReportDefinition.upsert({
      where: { organizationId_reportKey: { organizationId, reportKey } },
      update: {
        name: input.name,
        reportType: input.reportType,
        columns: (input.columns ?? []) as object,
        filters: (input.filters ?? {}) as object,
        groupBy: input.groupBy ?? [],
        sortBy: input.sortBy,
      },
      create: {
        organizationId,
        reportKey,
        name: input.name,
        reportType: input.reportType,
        columns: (input.columns ?? []) as object,
        filters: (input.filters ?? {}) as object,
        groupBy: input.groupBy ?? [],
        sortBy: input.sortBy,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'ReportDefinition', reportKey, 'saved', userId, {
      reportType: input.reportType,
    });
    return row;
  }

  async buildReportRows(
    organizationId: string,
    reportType: EimsReportTypeValue | string,
    filters?: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    const warehouseKey = filters?.warehouseKey as string | undefined;
    const itemKey = filters?.itemKey as string | undefined;

    switch (reportType) {
      case 'valued_inventory':
      case 'stock': {
        const balances = await this.prisma.eimsStockBalance.findMany({
          where: {
            organizationId,
            ...(itemKey ? { item: { itemKey } } : {}),
            ...(warehouseKey ? { warehouse: { warehouseKey } } : {}),
          },
          include: {
            item: { select: { itemKey: true, name: true, categoryKey: true } },
            warehouse: { select: { warehouseKey: true, name: true } },
            location: { select: { locationKey: true } },
          },
          take: 5000,
        });
        return balances.map((b) => ({
          itemKey: b.item.itemKey,
          itemName: b.item.name,
          categoryKey: b.item.categoryKey,
          warehouseKey: b.warehouse.warehouseKey,
          locationKey: b.location?.locationKey ?? '',
          onHandQty: b.onHandQty,
          reservedQty: b.reservedQty,
          blockedQty: b.blockedQty,
          availableQty: b.availableQty,
          averageCost: b.averageCost,
          totalCost: b.totalCost,
        }));
      }
      case 'kardex': {
        const rows = await this.prisma.eimsKardexEntry.findMany({
          where: {
            organizationId,
            ...(itemKey ? { item: { itemKey } } : {}),
            ...(warehouseKey ? { warehouse: { warehouseKey } } : {}),
          },
          include: {
            item: { select: { itemKey: true } },
            warehouse: { select: { warehouseKey: true } },
          },
          orderBy: { postedAt: 'asc' },
          take: 5000,
        });
        return rows.map((r) => ({
          movementKey: r.movementKey,
          itemKey: r.item.itemKey,
          warehouseKey: r.warehouse.warehouseKey,
          entryQty: r.entryQty,
          exitQty: r.exitQty,
          balanceQty: r.balanceQty,
          unitCost: r.unitCost,
          balanceCost: r.balanceCost,
          postedAt: r.postedAt.toISOString(),
        }));
      }
      case 'turnover':
      case 'coverage': {
        const kpis = await this.kpis(organizationId);
        const policies = await this.loadOpsPolicies(organizationId);
        const balances = await this.prisma.eimsStockBalance.findMany({
          where: { organizationId },
          include: {
            item: { select: { itemKey: true } },
            warehouse: { select: { warehouseKey: true } },
          },
        });
        return policies.map((p) => {
          const bal = balances.find(
            (b) => b.item.itemKey === p.itemKey && b.warehouse.warehouseKey === p.warehouseKey,
          );
          const onHand = bal?.onHandQty ?? 0;
          return {
            itemKey: p.itemKey,
            warehouseKey: p.warehouseKey,
            onHandQty: onHand,
            avgDailyDemand: p.avgDailyDemand,
            coverageDays: computeCoverageDays(onHand, p.avgDailyDemand),
            turnover: kpis.turnover,
            reorderPoint: p.reorderPoint,
          };
        });
      }
      case 'counts': {
        const sessions = await this.prisma.eimsCountSession.findMany({
          where: { organizationId },
          include: { _count: { select: { lines: true, variances: true } } },
          take: 500,
        });
        return sessions.map((s) => ({
          countKey: s.countKey,
          name: s.name,
          countType: s.countType,
          status: s.status,
          lines: s._count.lines,
          variances: s._count.variances,
          createdAt: s.createdAt.toISOString(),
        }));
      }
      case 'differences': {
        const variances = await this.prisma.eimsCountVariance.findMany({
          where: { organizationId },
          include: { line: true },
          take: 2000,
        });
        return variances.map((v) => ({
          varianceKey: v.varianceKey,
          itemKey: v.line.itemKey,
          warehouseKey: v.line.warehouseKey,
          systemQty: v.systemQty,
          physicalQty: v.physicalQty,
          varianceQty: v.varianceQty,
          varianceCost: v.varianceCost,
          withinTolerance: v.withinTolerance,
        }));
      }
      case 'expiry': {
        const lots = await this.prisma.eimsStockLot.findMany({
          where: { organizationId, expiryDate: { not: null }, onHandQty: { gt: 0 } },
          include: { item: true, warehouse: true },
          orderBy: { expiryDate: 'asc' },
          take: 2000,
        });
        return lots.map((l) => ({
          lotKey: l.lotKey,
          itemKey: l.item.itemKey,
          warehouseKey: l.warehouse.warehouseKey,
          onHandQty: l.onHandQty,
          expiryDate: l.expiryDate?.toISOString().slice(0, 10),
          status: l.status,
        }));
      }
      case 'reservations': {
        const reservations = await this.prisma.eimsReservation.findMany({
          where: { organizationId },
          take: 2000,
        });
        return reservations.map((r) => ({
          reservationKey: r.reservationKey,
          reservationType: r.reservationType,
          itemKey: r.itemKey,
          warehouseKey: r.warehouseKey,
          reservedQty: r.quantity - r.releasedQty,
          status: r.status,
          expiresAt: r.expiresAt?.toISOString() ?? '',
        }));
      }
      case 'replenishment': {
        const suggestions = await this.prisma.eimsSupplySuggestion.findMany({
          where: { organizationId },
          take: 2000,
        });
        return suggestions.map((s) => ({
          suggestionKey: s.suggestionKey,
          suggestionType: s.suggestionType,
          itemKey: s.itemKey,
          warehouseKey: s.warehouseKey,
          quantity: s.suggestedQty,
          reason: s.reason,
          status: s.status,
          priority: s.priority,
        }));
      }
      case 'movements':
      default: {
        const movements = await this.prisma.eimsMovement.findMany({
          where: {
            organizationId,
            status: 'confirmed',
            ...(itemKey ? { item: { itemKey } } : {}),
          },
          include: {
            item: { select: { itemKey: true } },
            fromWarehouse: { select: { warehouseKey: true } },
            toWarehouse: { select: { warehouseKey: true } },
          },
          orderBy: { postedAt: 'desc' },
          take: 2000,
        });
        return movements.map((m) => ({
          movementKey: m.movementKey,
          movementType: m.movementType,
          itemKey: m.item.itemKey,
          quantity: m.quantity,
          unitCost: m.unitCost,
          totalCost: m.totalCost,
          fromWarehouse: m.fromWarehouse?.warehouseKey ?? '',
          toWarehouse: m.toWarehouse?.warehouseKey ?? '',
          postedAt: m.postedAt.toISOString(),
        }));
      }
    }
  }

  async runReport(
    organizationId: string,
    userId: string,
    input: {
      reportKey?: string;
      reportType?: string;
      format?: EimsReportFormatValue;
      filters?: Record<string, unknown>;
      columns?: string[];
    },
  ) {
    await this.ensureSystemReports(organizationId, userId);
    let reportType = input.reportType ?? 'stock';
    let reportKey = input.reportKey ?? `SYS-${reportType}`;
    let definitionId: string | undefined;
    let columns = input.columns;

    if (input.reportKey) {
      const def = await this.prisma.eimsReportDefinition.findFirst({
        where: { organizationId, reportKey: input.reportKey },
      });
      if (def) {
        reportType = def.reportType;
        reportKey = def.reportKey;
        definitionId = def.id;
        const defCols = def.columns as string[];
        if (Array.isArray(defCols) && defCols.length) columns = defCols;
      }
    }

    const filters = {
      ...((input.filters ?? {}) as Record<string, unknown>),
    };
    const rows = await this.buildReportRows(organizationId, reportType, filters);
    const format = input.format ?? 'json';
    const title = `EIMS ${reportType}`;
    const exported = formatExport(format, title, rows, columns);
    const runKey = generateRunKey(reportKey);

    const run = await this.prisma.eimsReportRun.create({
      data: {
        organizationId,
        runKey,
        reportKey,
        definitionId,
        format,
        filters: filters as object,
        rowCount: rows.length,
        content: exported.content,
        contentType: exported.contentType,
        generatedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'ReportRun', runKey, 'generated', userId, {
      reportKey,
      format,
      rowCount: rows.length,
      filters,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsReportRun',
      run.id,
      EVENT_TYPES.EIMS_REPORT_GENERATED,
      { runKey, reportKey, format, rowCount: rows.length },
    );

    return {
      runKey,
      reportKey,
      format,
      rowCount: rows.length,
      contentType: exported.contentType,
      content: exported.content,
      rows: format === 'json' ? rows : undefined,
    };
  }

  listReportRuns(organizationId: string) {
    return this.prisma.eimsReportRun.findMany({
      where: { organizationId },
      orderBy: { generatedAt: 'desc' },
      take: 100,
      select: {
        runKey: true,
        reportKey: true,
        format: true,
        rowCount: true,
        contentType: true,
        generatedAt: true,
        generatedBy: true,
      },
    });
  }

  async getReportRun(organizationId: string, runKey: string) {
    const run = await this.prisma.eimsReportRun.findFirst({
      where: { organizationId, runKey },
    });
    if (!run) throw new NotFoundException(`Reporte ${runKey} no encontrado`);
    return run;
  }

  async executiveDashboard(organizationId: string, userId?: string) {
    const [ops, kpis, alerts, suggestions] = await Promise.all([
      this.operationsCenter(organizationId, userId),
      this.kpis(organizationId, userId),
      this.listOpsAlerts(organizationId, false),
      this.prisma.eimsSupplySuggestion.count({
        where: { organizationId, status: 'proposed' },
      }),
    ]);
    return {
      inventoryValue: ops.inventoryValue,
      totalQty: ops.totalQty,
      turnover: kpis.turnover,
      coverageDays: kpis.coverageDays,
      serviceLevel: kpis.serviceLevel,
      inventoryAccuracy: kpis.inventoryAccuracy,
      criticalItems: ops.criticalItems.length,
      openAlerts: alerts.length,
      openSuggestions: suggestions,
      valueByWarehouse: kpis.valueByWarehouse,
      valueByCategory: kpis.valueByCategory,
    };
  }

  async operationalDashboard(organizationId: string, userId?: string) {
    const [ops, analytics, alerts, map] = await Promise.all([
      this.operationsCenter(organizationId, userId),
      this.analytics(organizationId, userId, { days: 14 }),
      this.listOpsAlerts(organizationId, false),
      this.warehouseMap(organizationId),
    ]);
    return {
      ops,
      analytics,
      alerts: alerts.slice(0, 50),
      warehouseMap: map,
    };
  }

  async aiOpsInsights(organizationId: string) {
    const [kpis, analytics, ops] = await Promise.all([
      this.kpis(organizationId),
      this.analytics(organizationId, undefined, { days: 30 }),
      this.operationsCenter(organizationId),
    ]);
    return {
      demandPrediction: {
        coverageDays: kpis.coverageDays,
        turnover: kpis.turnover,
        trend: analytics.historicalTrends.slice(-7),
      },
      stockoutPrediction: ops.criticalItems.map((c) => ({
        ...c,
        risk: c.availableQty <= 0 ? 'immediate' : 'high',
      })),
      stockOptimization: {
        averageCost: kpis.averageCost,
        immobilized: analytics.immobilized,
        overstockCandidates: analytics.lowRotation,
      },
      purchaseOptimization: analytics.highRotation,
      anomalies: {
        abnormalCosts: analytics.abnormalCosts,
        unusualAlerts: (await this.listOpsAlerts(organizationId, false)).filter(
          (a) => a.alertType === 'unusual_adjustment' || a.alertType === 'abnormal_cost',
        ),
      },
      recommendations: ops.criticalItems.slice(0, 10).map((c) => ({
        action: 'replenish',
        itemKey: c.itemKey,
        warehouseKey: c.warehouseKey,
        reason: 'Stock crítico detectado en operations center',
      })),
      modelVersion: 'ops-rules-v1',
    };
  }

  private async loadOpsPolicies(organizationId: string): Promise<OpsPolicy[]> {
    const [profiles, items, balances] = await Promise.all([
      this.prisma.eimsStockLevelProfile.findMany({
        where: { organizationId, isActive: true },
      }),
      this.prisma.eimsItem.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, itemKey: true, minStock: true, maxStock: true },
      }),
      this.prisma.eimsStockBalance.findMany({
        where: { organizationId },
        select: { itemId: true, warehouse: { select: { warehouseKey: true } } },
        take: 5000,
      }),
    ]);
    const itemMap = new Map(items.map((i) => [i.itemKey, i]));
    const policies: OpsPolicy[] = [];
    const seen = new Set<string>();

    for (const p of profiles) {
      const wh = p.warehouseKey ?? '';
      const key = `${p.itemKey}|${wh}`;
      seen.add(key);
      const demand = await this.computeAvgDailyDemand(organizationId, p.itemId, wh);
      policies.push({
        itemKey: p.itemKey,
        warehouseKey: wh,
        minStock: p.minStock,
        maxStock: p.maxStock ?? 0,
        reorderPoint: p.reorderPoint,
        avgDailyDemand: demand,
      });
    }

    for (const b of balances) {
      const wh = b.warehouse.warehouseKey;
      const balItem = items.find((i) => i.id === b.itemId);
      if (!balItem) continue;
      const key = `${balItem.itemKey}|${wh}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mapped = itemMap.get(balItem.itemKey);
      if (!mapped) continue;
      const demand = await this.computeAvgDailyDemand(organizationId, b.itemId, wh);
      policies.push({
        itemKey: balItem.itemKey,
        warehouseKey: wh,
        minStock: mapped.minStock ?? 0,
        maxStock: mapped.maxStock ?? 0,
        reorderPoint: (mapped.minStock ?? 0) * 2,
        avgDailyDemand: demand,
      });
    }
    return policies;
  }

  private async computeAvgDailyDemand(
    organizationId: string,
    itemId: string,
    warehouseKey: string,
    days = 30,
  ): Promise<number> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const entries = await this.prisma.eimsKardexEntry.findMany({
      where: {
        organizationId,
        itemId,
        warehouse: { warehouseKey },
        postedAt: { gte: since },
        exitQty: { gt: 0 },
      },
      take: 500,
    });
    if (!entries.length) return 0;
    const total = entries.reduce((s, e) => s + e.exitQty, 0);
    return Number((total / days).toFixed(6));
  }

  private async trackQuery(
    organizationId: string,
    userId: string,
    queryType: string,
    filters: Record<string, unknown>,
  ) {
    const queryKey = generateQueryKey(queryType);
    await this.prisma.eimsAnalyticsQuery.create({
      data: {
        organizationId,
        queryKey,
        queryType,
        filters: filters as object,
        accessedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'AnalyticsQuery', queryKey, 'accessed', userId, {
      queryType,
      filters,
    });
  }
}
