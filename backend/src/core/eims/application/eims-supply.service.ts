import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsMovementService } from './eims-movement.service';
import {
  computeAvailableQty,
  computeReplenishmentQty,
  computeRotationRate,
  computeTransferSuggestion,
  evaluateStockAlerts,
  generateCalendarEventKey,
  generateProfileKey,
  generateSuggestionKey,
  generateSupplyAlertKey,
  movingAverageForecast,
  resolveEffectiveLevels,
  seasonalForecast,
  type EimsSuggestionTypeValue,
} from '../domain/eims-planning.engine';
@Injectable()
export class EimsSupplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly movements: EimsMovementService,
  ) {}

  async center(organizationId: string) {
    const [activeReservations, openSuggestions, openAlerts, rules, profiles, calendar] =
      await Promise.all([
        this.prisma.eimsReservation.count({
          where: { organizationId, status: { in: ['active', 'partial'] } },
        }),
        this.prisma.eimsSupplySuggestion.count({
          where: { organizationId, status: 'proposed' },
        }),
        this.prisma.eimsSupplyAlert.count({
          where: { organizationId, acknowledged: false, resolved: false },
        }),
        this.prisma.eimsSupplyRule.count({ where: { organizationId, isActive: true } }),
        this.prisma.eimsStockLevelProfile.count({ where: { organizationId, isActive: true } }),
        this.prisma.eimsSupplyCalendarEvent.count({
          where: { organizationId, scheduledAt: { gte: new Date() } },
        }),
      ]);
    const recentSuggestions = await this.prisma.eimsSupplySuggestion.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { item: { select: { name: true } } },
    });
    const recentAlerts = await this.prisma.eimsSupplyAlert.findMany({
      where: { organizationId, resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      activeReservations,
      openSuggestions,
      openAlerts,
      activeRules: rules,
      levelProfiles: profiles,
      upcomingCalendarEvents: calendar,
      recentSuggestions,
      recentAlerts,
    };
  }

  listLevels(organizationId: string, filters?: { itemKey?: string; warehouseKey?: string }) {
    return this.prisma.eimsStockLevelProfile.findMany({
      where: {
        organizationId,
        ...(filters?.itemKey ? { itemKey: filters.itemKey } : {}),
        ...(filters?.warehouseKey ? { warehouseKey: filters.warehouseKey } : {}),
      },
      include: { item: { select: { name: true } }, warehouse: { select: { name: true } } },
      orderBy: { itemKey: 'asc' },
    });
  }

  async upsertLevel(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      warehouseKey?: string;
      minStock?: number;
      maxStock?: number;
      safetyStock?: number;
      reorderPoint?: number;
      economicOrderQty?: number;
      coverageDays?: number;
      leadTimeDays?: number;
      seasonalityFactor?: number;
    },
  ) {
    const item = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey: input.itemKey },
    });
    if (!item) throw new NotFoundException(`Artículo ${input.itemKey} no encontrado`);
    let warehouseId: string | undefined;
    if (input.warehouseKey) {
      const wh = await this.prisma.eimsWarehouse.findFirst({
        where: { organizationId, warehouseKey: input.warehouseKey },
      });
      if (!wh) throw new NotFoundException(`Bodega ${input.warehouseKey} no encontrada`);
      warehouseId = wh.id;
    }
    const profileKey = generateProfileKey(input.itemKey, input.warehouseKey);
    const row = await this.prisma.eimsStockLevelProfile.upsert({
      where: { organizationId_profileKey: { organizationId, profileKey } },
      update: {
        minStock: input.minStock ?? item.minStock ?? 0,
        maxStock: input.maxStock ?? item.maxStock,
        safetyStock: input.safetyStock ?? input.minStock ?? 0,
        reorderPoint: input.reorderPoint ?? input.minStock ?? 0,
        economicOrderQty: input.economicOrderQty,
        coverageDays: input.coverageDays,
        leadTimeDays: input.leadTimeDays ?? 7,
        seasonalityFactor: input.seasonalityFactor ?? 1,
        updatedBy: userId,
      },
      create: {
        organizationId,
        profileKey,
        itemId: item.id,
        itemKey: input.itemKey,
        warehouseId,
        warehouseKey: input.warehouseKey,
        minStock: input.minStock ?? item.minStock ?? 0,
        maxStock: input.maxStock ?? item.maxStock,
        safetyStock: input.safetyStock ?? input.minStock ?? 0,
        reorderPoint: input.reorderPoint ?? input.minStock ?? 0,
        economicOrderQty: input.economicOrderQty,
        coverageDays: input.coverageDays,
        leadTimeDays: input.leadTimeDays ?? 7,
        seasonalityFactor: input.seasonalityFactor ?? 1,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'StockLevelProfile', profileKey, 'upserted', userId, input);
    await this.core.emitUserAction(
      organizationId,
      'EimsStockLevelProfile',
      row.id,
      EVENT_TYPES.EIMS_POLICY_UPDATED,
      { profileKey, itemKey: input.itemKey },
    );
    return row;
  }

  listRules(organizationId: string) {
    return this.prisma.eimsSupplyRule.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async upsertRule(
    organizationId: string,
    userId: string,
    input: {
      ruleKey?: string;
      name: string;
      ruleType: string;
      itemKey?: string;
      categoryKey?: string;
      warehouseKey?: string;
      priority?: number;
      autoExecute?: boolean;
      parameters?: Record<string, unknown>;
    },
  ) {
    const ruleKey = input.ruleKey ?? `RULE-${input.ruleType.toUpperCase()}-${Date.now()}`;
    const row = await this.prisma.eimsSupplyRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey } },
      update: {
        name: input.name,
        ruleType: input.ruleType as never,
        itemKey: input.itemKey,
        categoryKey: input.categoryKey,
        warehouseKey: input.warehouseKey,
        priority: input.priority ?? 100,
        autoExecute: input.autoExecute ?? false,
        parameters: (input.parameters ?? {}) as object,
      },
      create: {
        organizationId,
        ruleKey,
        name: input.name,
        ruleType: input.ruleType as never,
        itemKey: input.itemKey,
        categoryKey: input.categoryKey,
        warehouseKey: input.warehouseKey,
        priority: input.priority ?? 100,
        autoExecute: input.autoExecute ?? false,
        parameters: (input.parameters ?? {}) as object,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'SupplyRule', ruleKey, 'upserted', userId, input);
    return row;
  }

  listSuggestions(organizationId: string, status?: string) {
    return this.prisma.eimsSupplySuggestion.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: { item: { select: { name: true, uomKey: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async generateSuggestions(organizationId: string, userId: string) {
    const rules = await this.prisma.eimsSupplyRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: { priority: 'asc' },
    });
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId, onHandQty: { gte: 0 } },
      include: {
        item: true,
        warehouse: true,
      },
      take: 5000,
    });
    const profiles = await this.prisma.eimsStockLevelProfile.findMany({
      where: { organizationId, isActive: true },
    });
    const profileMap = new Map(
      profiles.map((p) => [`${p.itemKey}:${p.warehouseKey ?? ''}`, p]),
    );

    const suggestions = [];
    const warehouseStock = new Map<string, Array<{ itemKey: string; available: number; itemId: string; unitCost: number }>>();

    for (const balance of balances) {
      const whKey = balance.warehouse.warehouseKey;
      const profile = profileMap.get(`${balance.item.itemKey}:${whKey}`) ??
        profileMap.get(`${balance.item.itemKey}:`);
      const levels = resolveEffectiveLevels(
        {
          minStock: balance.item.minStock ?? 0,
          maxStock: balance.item.maxStock,
          safetyStock: balance.item.minStock ?? 0,
          reorderPoint: (balance.item.minStock ?? 0) * 2,
          leadTimeDays: 7,
        },
        profile,
      );

      const history = await this.getConsumptionHistory(
        organizationId,
        balance.itemId,
        whKey,
        90,
      );
      const dailyDemand = history.length
        ? movingAverageForecast(history, Math.min(30, history.length)) / 30
        : 0;

      const position = {
        onHandQty: balance.onHandQty,
        reservedQty: balance.reservedQty,
        availableQty: balance.availableQty,
      };
      const available = computeAvailableQty(position);
      const list = warehouseStock.get(whKey) ?? [];
      list.push({
        itemKey: balance.item.itemKey,
        available,
        itemId: balance.itemId,
        unitCost: balance.averageCost,
      });
      warehouseStock.set(whKey, list);

      let repl = computeReplenishmentQty(position, levels, dailyDemand);
      const activeRule = rules.find(
        (r) =>
          (!r.itemKey || r.itemKey === balance.item.itemKey) &&
          (!r.warehouseKey || r.warehouseKey === whKey) &&
          (!r.categoryKey || r.categoryKey === balance.item.categoryKey),
      );
      if (activeRule?.ruleType === 'seasonality') {
        const seasonal = seasonalForecast(history, levels.seasonalityFactor ?? 1);
        repl = computeReplenishmentQty(position, levels, seasonal / 30);
      }
      if (activeRule?.ruleType === 'demand_history' && dailyDemand > 0) {
        repl = computeReplenishmentQty(position, levels, dailyDemand);
      }

      if (repl.suggestedQty <= 0) continue;

      const suggestionKey = generateSuggestionKey('purchase', balance.item.itemKey, suggestions.length + 1);
      const suggestion = await this.prisma.eimsSupplySuggestion.upsert({
        where: { organizationId_suggestionKey: { organizationId, suggestionKey } },
        update: {
          suggestedQty: repl.suggestedQty,
          currentQty: available,
          targetQty: repl.targetQty,
          unitCost: balance.averageCost,
          totalCost: Number((repl.suggestedQty * balance.averageCost).toFixed(6)),
          reason: repl.reason,
          ruleKey: activeRule?.ruleKey,
          status: 'proposed',
        },
        create: {
          organizationId,
          suggestionKey,
          suggestionType: 'purchase',
          itemId: balance.itemId,
          itemKey: balance.item.itemKey,
          warehouseId: balance.warehouseId,
          warehouseKey: whKey,
          suggestedQty: repl.suggestedQty,
          currentQty: available,
          targetQty: repl.targetQty,
          unitCost: balance.averageCost,
          totalCost: Number((repl.suggestedQty * balance.averageCost).toFixed(6)),
          reason: repl.reason,
          ruleKey: activeRule?.ruleKey,
          priority: activeRule?.priority ?? 100,
        },
      });
      suggestions.push(suggestion);
    }

    for (const balance of balances) {
      const whKey = balance.warehouse.warehouseKey;
      const profile = profileMap.get(`${balance.item.itemKey}:${whKey}`) ??
        profileMap.get(`${balance.item.itemKey}:`);
      const levels = resolveEffectiveLevels(
        { minStock: balance.item.minStock ?? 0, reorderPoint: balance.item.minStock ?? 0, safetyStock: 0, leadTimeDays: 7 },
        profile,
      );
      const available = computeAvailableQty({
        onHandQty: balance.onHandQty,
        reservedQty: balance.reservedQty,
        availableQty: balance.availableQty,
      });
      if (available >= levels.minStock) continue;
      const needed = levels.reorderPoint - available;
      for (const [sourceWh, stocks] of warehouseStock) {
        if (sourceWh === whKey) continue;
        const source = stocks.find((s) => s.itemKey === balance.item.itemKey);
        if (!source || source.available <= levels.minStock) continue;
        const transfer = computeTransferSuggestion(
          { warehouseKey: sourceWh, availableQty: source.available },
          { warehouseKey: whKey, availableQty: available, neededQty: needed },
        );
        if (!transfer) continue;
        const suggestionKey = generateSuggestionKey('transfer', balance.item.itemKey, suggestions.length + 1);
        const suggestion = await this.prisma.eimsSupplySuggestion.create({
          data: {
            organizationId,
            suggestionKey,
            suggestionType: 'transfer',
            itemId: balance.itemId,
            itemKey: balance.item.itemKey,
            warehouseId: balance.warehouseId,
            warehouseKey: whKey,
            fromWarehouseKey: transfer.fromWarehouseKey,
            suggestedQty: transfer.suggestedQty,
            currentQty: available,
            targetQty: levels.reorderPoint,
            unitCost: balance.averageCost,
            totalCost: Number((transfer.suggestedQty * balance.averageCost).toFixed(6)),
            reason: `Traslado recomendado desde ${transfer.fromWarehouseKey}`,
            priority: 50,
          },
        });
        suggestions.push(suggestion);
        const transferRule = rules.find(
          (r) => r.autoExecute && (!r.itemKey || r.itemKey === balance.item.itemKey),
        );
        if (transferRule) {
          await this.acceptSuggestion(organizationId, userId, suggestion.suggestionKey);
        }
        break;
      }
    }

    await this.audit.log(organizationId, 'SupplySuggestions', 'batch', 'generated', userId, {
      count: suggestions.length,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsSupplySuggestion',
      'batch',
      EVENT_TYPES.EIMS_SUGGESTION_GENERATED,
      { count: suggestions.length },
    );
    return { count: suggestions.length, suggestions };
  }

  async acceptSuggestion(organizationId: string, userId: string, suggestionKey: string) {
    const suggestion = await this.prisma.eimsSupplySuggestion.findFirst({
      where: { organizationId, suggestionKey },
    });
    if (!suggestion) throw new NotFoundException(`Sugerencia ${suggestionKey} no encontrada`);
    if (suggestion.status !== 'proposed') {
      throw new BadRequestException(`Sugerencia en estado ${suggestion.status}`);
    }

    let documentKey = suggestion.documentKey;
    if (suggestion.suggestionType === 'transfer' && suggestion.fromWarehouseKey) {
      const movement = await this.movements.post(organizationId, userId, {
        movementType: 'transfer',
        itemKey: suggestion.itemKey,
        quantity: suggestion.suggestedQty,
        fromWarehouseKey: suggestion.fromWarehouseKey,
        toWarehouseKey: suggestion.warehouseKey,
        reason: suggestion.reason ?? 'Traslado por sugerencia de abastecimiento',
        documentKey: suggestionKey,
        documentType: 'supply_suggestion',
        source: 'supply_planning',
        sourceRef: suggestionKey,
      });
      documentKey = movement.movementKey;
    }

    const updated = await this.prisma.eimsSupplySuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: suggestion.suggestionType === 'purchase' ? 'accepted' : 'fulfilled',
        acceptedBy: userId,
        acceptedAt: new Date(),
        documentKey,
      },
    });

    await this.prisma.eimsSupplyCalendarEvent.create({
      data: {
        organizationId,
        eventKey: generateCalendarEventKey(suggestionKey),
        title: `Abastecimiento ${suggestion.itemKey}`,
        eventType: suggestion.suggestionType,
        scheduledAt: new Date(),
        itemKey: suggestion.itemKey,
        warehouseKey: suggestion.warehouseKey,
        suggestionKey,
        quantity: suggestion.suggestedQty,
        status: 'scheduled',
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'SupplySuggestion', suggestionKey, 'accepted', userId, {});
    await this.core.emitUserAction(
      organizationId,
      'EimsSupplySuggestion',
      suggestion.id,
      EVENT_TYPES.EIMS_SUGGESTION_ACCEPTED,
      { suggestionKey, suggestionType: suggestion.suggestionType },
    );
    return updated;
  }

  async rejectSuggestion(
    organizationId: string,
    userId: string,
    suggestionKey: string,
    reason: string,
  ) {
    const suggestion = await this.prisma.eimsSupplySuggestion.findFirst({
      where: { organizationId, suggestionKey },
    });
    if (!suggestion) throw new NotFoundException(`Sugerencia ${suggestionKey} no encontrada`);
    const updated = await this.prisma.eimsSupplySuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectReason: reason,
      },
    });
    await this.audit.log(organizationId, 'SupplySuggestion', suggestionKey, 'rejected', userId, {
      reason,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsSupplySuggestion',
      suggestion.id,
      EVENT_TYPES.EIMS_SUGGESTION_REJECTED,
      { suggestionKey, reason },
    );
    return updated;
  }

  listAlerts(organizationId: string, acknowledged?: boolean) {
    return this.prisma.eimsSupplyAlert.findMany({
      where: {
        organizationId,
        ...(acknowledged == null ? {} : { acknowledged }),
        resolved: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async evaluateAlerts(organizationId: string, userId: string) {
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: true, warehouse: true },
      take: 5000,
    });
    const profiles = await this.prisma.eimsStockLevelProfile.findMany({
      where: { organizationId, isActive: true },
    });
    const profileMap = new Map(
      profiles.map((p) => [`${p.itemKey}:${p.warehouseKey ?? ''}`, p]),
    );

    const created = [];
    for (const balance of balances) {
      const whKey = balance.warehouse.warehouseKey;
      const profile = profileMap.get(`${balance.item.itemKey}:${whKey}`) ??
        profileMap.get(`${balance.item.itemKey}:`);
      const levels = resolveEffectiveLevels(
        {
          minStock: balance.item.minStock ?? 0,
          maxStock: balance.item.maxStock,
          safetyStock: balance.item.minStock ?? 0,
          reorderPoint: (balance.item.minStock ?? 0) * 2,
          leadTimeDays: 7,
        },
        profile,
      );

      const lastMovement = await this.prisma.eimsMovement.findFirst({
        where: { organizationId, itemId: balance.itemId },
        orderBy: { postedAt: 'desc' },
      });
      const daysSince = lastMovement
        ? Math.floor((Date.now() - lastMovement.postedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 999;

      const nearestLot = await this.prisma.eimsStockLot.findFirst({
        where: {
          organizationId,
          itemId: balance.itemId,
          warehouseId: balance.warehouseId,
          expiryDate: { not: null },
          onHandQty: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });
      let expiryWithinDays: number | null = null;
      if (nearestLot?.expiryDate) {
        expiryWithinDays = Math.ceil(
          (nearestLot.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );
      }

      const expiredReservations = await this.prisma.eimsReservation.count({
        where: {
          organizationId,
          itemKey: balance.item.itemKey,
          warehouseKey: whKey,
          status: 'expired',
        },
      });

      const alerts = evaluateStockAlerts({
        itemKey: balance.item.itemKey,
        warehouseKey: whKey,
        position: {
          onHandQty: balance.onHandQty,
          reservedQty: balance.reservedQty,
          availableQty: balance.availableQty,
        },
        levels,
        daysSinceLastMovement: daysSince,
        expiryWithinDays,
        expiredReservations,
      });

      for (const a of alerts) {
        const alertKey = generateSupplyAlertKey(a.alertType, balance.item.itemKey, whKey);
        const row = await this.prisma.eimsSupplyAlert.upsert({
          where: { organizationId_alertKey: { organizationId, alertKey } },
          update: {
            severity: a.severity,
            title: a.title,
            message: a.message,
            currentQty: balance.availableQty,
            thresholdQty: levels.minStock,
          },
          create: {
            organizationId,
            alertKey,
            alertType: a.alertType,
            severity: a.severity,
            itemId: balance.itemId,
            itemKey: balance.item.itemKey,
            warehouseKey: whKey,
            title: a.title,
            message: a.message,
            currentQty: balance.availableQty,
            thresholdQty: levels.minStock,
          },
        });
        created.push(row);
        await this.core.emitUserAction(
          organizationId,
          'EimsSupplyAlert',
          row.id,
          EVENT_TYPES.EIMS_PLANNING_ALERT,
          { alertType: a.alertType, itemKey: balance.item.itemKey },
        );
      }
    }

    await this.audit.log(organizationId, 'SupplyAlerts', 'batch', 'evaluated', userId, {
      count: created.length,
    });
    return created;
  }

  async acknowledgeAlert(organizationId: string, userId: string, alertKey: string) {
    const alert = await this.prisma.eimsSupplyAlert.findFirst({
      where: { organizationId, alertKey },
    });
    if (!alert) throw new NotFoundException(`Alerta ${alertKey} no encontrada`);
    return this.prisma.eimsSupplyAlert.update({
      where: { id: alert.id },
      data: { acknowledged: true, acknowledgedBy: userId },
    });
  }

  listCalendar(organizationId: string, from?: string, to?: string) {
    return this.prisma.eimsSupplyCalendarEvent.findMany({
      where: {
        organizationId,
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
    });
  }

  async projection(organizationId: string, horizonDays = 90) {
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: { item: true, warehouse: true },
      take: 2000,
    });
    const lines = [];
    for (const b of balances) {
      const history = await this.getConsumptionHistory(organizationId, b.itemId, b.warehouse.warehouseKey, 60);
      const dailyDemand = history.length ? movingAverageForecast(history, 30) / 30 : 0;
      const available = computeAvailableQty({
        onHandQty: b.onHandQty,
        reservedQty: b.reservedQty,
        availableQty: b.availableQty,
      });
      const stockoutDays =
        dailyDemand > 0 ? Math.floor(available / dailyDemand) : available > 0 ? horizonDays + 1 : 0;
      const rotation = computeRotationRate(
        history.reduce((s, v) => s + v, 0),
        Math.max(available, 1),
        60,
      );
      lines.push({
        itemKey: b.item.itemKey,
        itemName: b.item.name,
        warehouseKey: b.warehouse.warehouseKey,
        availableQty: available,
        dailyDemand: Number(dailyDemand.toFixed(4)),
        stockoutInDays: stockoutDays,
        rotationRate: rotation,
        projectedQtyEnd: Number(Math.max(0, available - dailyDemand * horizonDays).toFixed(2)),
        value: Number((available * b.averageCost).toFixed(2)),
      });
    }
    return {
      horizonDays,
      generatedAt: new Date().toISOString(),
      totalValue: Number(lines.reduce((s, l) => s + l.value, 0).toFixed(2)),
      lines: lines.sort((a, b) => a.stockoutInDays - b.stockoutInDays),
    };
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
