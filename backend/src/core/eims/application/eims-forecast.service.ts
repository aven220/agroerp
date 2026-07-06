import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import {
  computeAvailableQty,
  computeRotationRate,
  detectDemandAnomaly,
  generateForecastKey,
  generateScenarioKey,
  movingAverageForecast,
  projectStockoutDate,
  seasonalForecast,
  simulateScenario,
} from '../domain/eims-planning.engine';

@Injectable()
export class EimsForecastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  listForecasts(organizationId: string, filters?: { itemKey?: string; warehouseKey?: string }) {
    return this.prisma.eimsDemandForecast.findMany({
      where: {
        organizationId,
        ...(filters?.itemKey ? { itemKey: filters.itemKey } : {}),
        ...(filters?.warehouseKey ? { warehouseKey: filters.warehouseKey } : {}),
      },
      include: { item: { select: { name: true, uomKey: true } } },
      orderBy: { periodStart: 'desc' },
      take: 500,
    });
  }

  async generateForecasts(organizationId: string, userId: string, horizonDays = 90) {
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: true, warehouse: true },
      take: 2000,
    });
    const created = [];
    const periodStart = new Date();
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getDate() + horizonDays);

    for (const b of balances) {
      const history = await this.getConsumptionHistory(
        organizationId,
        b.itemId,
        b.warehouse.warehouseKey,
        90,
      );
      const monthlyForecast = movingAverageForecast(history, Math.min(30, history.length || 1));
      const seasonal = seasonalForecast(history, 1);
      const forecastQty = Number(((monthlyForecast + seasonal) / 2).toFixed(4));
      const rotation = computeRotationRate(
        history.reduce((s, v) => s + v, 0),
        Math.max(b.onHandQty, 1),
        90,
      );
      const anomaly = detectDemandAnomaly(history);
      const aiScore = anomaly ? 0.85 : 0.55;
      const forecastKey = generateForecastKey(
        b.item.itemKey,
        periodStart.toISOString().slice(0, 10),
      );

      const row = await this.prisma.eimsDemandForecast.upsert({
        where: { organizationId_forecastKey: { organizationId, forecastKey } },
        update: {
          forecastQty,
          rotationRate: rotation,
          seasonalityIndex: seasonal / Math.max(monthlyForecast, 0.001),
          aiScore,
          method: anomaly ? 'anomaly_adjusted' : 'moving_average',
          confidence: anomaly ? 0.7 : 0.85,
        },
        create: {
          organizationId,
          forecastKey,
          itemId: b.itemId,
          itemKey: b.item.itemKey,
          warehouseKey: b.warehouse.warehouseKey,
          periodStart,
          periodEnd,
          forecastQty,
          rotationRate: rotation,
          seasonalityIndex: seasonal / Math.max(monthlyForecast, 0.001),
          aiScore,
          method: anomaly ? 'anomaly_adjusted' : 'moving_average',
          confidence: anomaly ? 0.7 : 0.85,
        },
      });
      created.push(row);
    }

    await this.audit.log(organizationId, 'DemandForecast', 'batch', 'generated', userId, {
      count: created.length,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsDemandForecast',
      'batch',
      EVENT_TYPES.EIMS_AI_INSIGHT,
      { type: 'forecast_generated', count: created.length },
    );
    return { count: created.length, forecasts: created };
  }

  listScenarios(organizationId: string) {
    return this.prisma.eimsPlanningScenario.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createScenario(
    organizationId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      horizonDays?: number;
      parameters?: Record<string, unknown>;
    },
  ) {
    const scenarioKey = generateScenarioKey(input.name);
    return this.prisma.eimsPlanningScenario.create({
      data: {
        organizationId,
        scenarioKey,
        name: input.name,
        description: input.description,
        baseDate: new Date(),
        horizonDays: input.horizonDays ?? 90,
        parameters: (input.parameters ?? {}) as object,
        createdBy: userId,
      },
    });
  }

  async simulateScenario(organizationId: string, userId: string, scenarioKey: string) {
    const scenario = await this.prisma.eimsPlanningScenario.findFirst({
      where: { organizationId, scenarioKey },
    });
    if (!scenario) throw new NotFoundException(`Escenario ${scenarioKey} no encontrado`);

    const params = (scenario.parameters ?? {}) as Record<string, unknown>;
    const demandMultiplier = Number(params.demandMultiplier ?? 1);
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: true, warehouse: true },
      take: 2000,
    });

    const items = [];
    for (const b of balances) {
      const history = await this.getConsumptionHistory(
        organizationId,
        b.itemId,
        b.warehouse.warehouseKey,
        60,
      );
      const dailyDemand = history.length ? movingAverageForecast(history, 30) / 30 : 0;
      items.push({
        itemKey: b.item.itemKey,
        availableQty: computeAvailableQty({
          onHandQty: b.onHandQty,
          reservedQty: b.reservedQty,
          availableQty: b.availableQty,
        }),
        dailyDemand,
        leadTimeDays: 7,
        unitCost: b.averageCost,
      });
    }

    const results = simulateScenario({
      items,
      horizonDays: scenario.horizonDays,
      demandMultiplier,
    });

    const updated = await this.prisma.eimsPlanningScenario.update({
      where: { id: scenario.id },
      data: {
        results: results as object,
        status: 'simulated',
        simulatedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'PlanningScenario', scenarioKey, 'simulated', userId, {
      stockouts: results.stockouts,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsPlanningScenario',
      scenario.id,
      EVENT_TYPES.EIMS_SCENARIO_SIMULATED,
      { scenarioKey, stockouts: results.stockouts },
    );
    return updated;
  }

  listAiInsights(organizationId: string) {
    return this.prisma.eimsAiInsight.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async refreshAiInsights(organizationId: string, userId: string) {
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: true, warehouse: true },
      take: 500,
    });
    const created = [];

    for (const b of balances) {
      const history = await this.getConsumptionHistory(
        organizationId,
        b.itemId,
        b.warehouse.warehouseKey,
        60,
      );
      const dailyDemand = history.length ? movingAverageForecast(history, 30) / 30 : 0;
      const available = computeAvailableQty({
        onHandQty: b.onHandQty,
        reservedQty: b.reservedQty,
        availableQty: b.availableQty,
      });
      const stockout = projectStockoutDate(available, dailyDemand);

      if (detectDemandAnomaly(history)) {
        const insightKey = `ANOM-${b.item.itemKey}-${Date.now()}`;
        const row = await this.prisma.eimsAiInsight.create({
          data: {
            organizationId,
            insightKey,
            insightType: 'demand_anomaly',
            itemKey: b.item.itemKey,
            warehouseKey: b.warehouse.warehouseKey,
            title: `Anomalía de consumo — ${b.item.name}`,
            summary: `Consumo atípico detectado para ${b.item.itemKey} en ${b.warehouse.warehouseKey}`,
            score: 0.88,
            payload: { history: history.slice(-10) },
          },
        });
        created.push(row);
        await this.core.emitUserAction(
          organizationId,
          'EimsAiInsight',
          row.id,
          EVENT_TYPES.EIMS_AI_INSIGHT,
          { insightType: 'demand_anomaly', itemKey: b.item.itemKey },
        );
      }

      if (stockout && stockout.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000) {
        const insightKey = `PUR-${b.item.itemKey}-${Date.now()}`;
        const row = await this.prisma.eimsAiInsight.create({
          data: {
            organizationId,
            insightKey,
            insightType: 'purchase_recommendation',
            itemKey: b.item.itemKey,
            warehouseKey: b.warehouse.warehouseKey,
            title: `Compra recomendada — ${b.item.name}`,
            summary: `Agotamiento proyectado antes de 30 días. Demanda diaria ${dailyDemand.toFixed(2)}`,
            score: 0.75,
            payload: { stockoutDate: stockout.toISOString(), dailyDemand },
          },
        });
        created.push(row);
      }

      const rotation = computeRotationRate(
        history.reduce((s, v) => s + v, 0),
        Math.max(available, 1),
        60,
      );
      if (rotation > 0 && rotation < 2 && available > 0) {
        const insightKey = `OPT-${b.item.itemKey}-${Date.now()}`;
        const row = await this.prisma.eimsAiInsight.create({
          data: {
            organizationId,
            insightKey,
            insightType: 'inventory_optimization',
            itemKey: b.item.itemKey,
            warehouseKey: b.warehouse.warehouseKey,
            title: `Optimización de inventario — ${b.item.name}`,
            summary: `Rotación baja (${rotation.toFixed(2)}). Revisar niveles mín/máx.`,
            score: 0.65,
            payload: { rotationRate: rotation },
          },
        });
        created.push(row);
      }
    }

    await this.audit.log(organizationId, 'AiInsight', 'batch', 'refreshed', userId, {
      count: created.length,
    });
    return { count: created.length, insights: created };
  }

  async planner(organizationId: string) {
    const [forecasts, scenarios, insights] = await Promise.all([
      this.prisma.eimsDemandForecast.findMany({
        where: { organizationId },
        orderBy: { periodStart: 'desc' },
        take: 50,
        include: { item: { select: { name: true } } },
      }),
      this.prisma.eimsPlanningScenario.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.eimsAiInsight.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { forecasts, scenarios, insights };
  }

  private async getConsumptionHistory(
    organizationId: string,
    itemId: string,
    warehouseKey: string,
    days: number,
  ): Promise<number[]> {
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
      orderBy: { postedAt: 'asc' },
      take: 500,
    });
    if (entries.length) return entries.map((e) => e.exitQty);
    const movements = await this.prisma.eimsMovement.findMany({
      where: {
        organizationId,
        itemId,
        status: 'confirmed',
        postedAt: { gte: since },
        movementType: { in: ['exit', 'consumption', 'transfer'] },
        OR: [
          { fromWarehouse: { warehouseKey } },
          { toWarehouse: { warehouseKey } },
        ],
      },
      orderBy: { postedAt: 'asc' },
      take: 200,
    });
    return movements.map((m) => Math.abs(m.quantity));
  }
}
