import { Injectable, NotFoundException } from '@nestjs/common';
import { CpepReceptionRuleDefinition, EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { validateReceptionRules, type ReceptionContext } from '../domain/config-validation.engine';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeeReceptionRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cpepReceptionRule.findMany({
      where: { organizationId },
      include: { purchaseCenter: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsert(organizationId: string, userId: string, dto: CpepReceptionRuleDefinition, reason?: string) {
    const existing = await this.prisma.cpepReceptionRule.findUnique({
      where: { organizationId_ruleKey: { organizationId, ruleKey: dto.ruleKey } },
    });
    const row = await this.prisma.cpepReceptionRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey: dto.ruleKey } },
      update: {
        name: dto.name,
        purchaseCenterId: dto.purchaseCenterId,
        producerId: dto.producerId,
        coffeeTypeKey: dto.coffeeTypeKey,
        seasonKey: dto.seasonKey,
        scheduleCron: dto.scheduleCron,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        maxTicketsDay: dto.maxTicketsDay,
        maxKgDay: dto.maxKgDay,
        minHumidityPct: dto.minHumidityPct,
        maxHumidityPct: dto.maxHumidityPct,
        minFactor: dto.minFactor,
        maxFactor: dto.maxFactor,
        minQualityScore: dto.minQualityScore,
        maxQualityScore: dto.maxQualityScore,
        metadata: (dto.metadata ?? {}) as object,
        isActive: true,
        version: { increment: 1 },
        updatedBy: userId,
      },
      create: {
        organizationId,
        ruleKey: dto.ruleKey,
        name: dto.name,
        purchaseCenterId: dto.purchaseCenterId,
        producerId: dto.producerId,
        coffeeTypeKey: dto.coffeeTypeKey,
        seasonKey: dto.seasonKey,
        scheduleCron: dto.scheduleCron,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        maxTicketsDay: dto.maxTicketsDay,
        maxKgDay: dto.maxKgDay,
        minHumidityPct: dto.minHumidityPct,
        maxHumidityPct: dto.maxHumidityPct,
        minFactor: dto.minFactor,
        maxFactor: dto.maxFactor,
        minQualityScore: dto.minQualityScore,
        maxQualityScore: dto.maxQualityScore,
        metadata: (dto.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.changelog.record({
      organizationId,
      entityType: 'ReceptionRule',
      entityKey: dto.ruleKey,
      action: existing ? 'update' : 'create',
      version: row.version,
      previousValue: existing ?? undefined,
      newValue: row,
      reason,
      purchaseCenterId: dto.purchaseCenterId,
      userId,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeReceptionRule',
      row.id,
      EVENT_TYPES.COFFEE_RECEPTION_RULE_UPDATED,
      { ruleKey: dto.ruleKey },
    );
    return row;
  }

  async validate(organizationId: string, ctx: ReceptionContext) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [rules, ticketsToday, kgAgg] = await Promise.all([
      this.prisma.cpepReceptionRule.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.cpepReceptionTicket.count({ where: { organizationId, createdAt: { gte: startOfDay } } }),
      this.prisma.cpepReceptionTicket.aggregate({
        where: { organizationId, createdAt: { gte: startOfDay }, netWeightKg: { not: null } },
        _sum: { netWeightKg: true },
      }),
    ]);
    return validateReceptionRules(rules, {
      ...ctx,
      ticketsToday,
      kgToday: kgAgg._sum.netWeightKg ?? 0,
    });
  }

  async deactivate(organizationId: string, ruleKey: string, userId: string, reason?: string) {
    const existing = await this.prisma.cpepReceptionRule.findUnique({
      where: { organizationId_ruleKey: { organizationId, ruleKey } },
    });
    if (!existing) throw new NotFoundException('Regla no encontrada');
    const row = await this.prisma.cpepReceptionRule.update({
      where: { id: existing.id },
      data: { isActive: false, version: { increment: 1 }, updatedBy: userId },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'ReceptionRule',
      entityKey: ruleKey,
      action: 'deactivate',
      version: row.version,
      previousValue: existing,
      newValue: row,
      reason,
      userId,
    });
    return row;
  }
}
