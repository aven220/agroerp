import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeeConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cpepPriceConfig.findMany({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async upsert(
    organizationId: string,
    data: {
      configKey: string;
      name: string;
      basePricePerKg: number;
      bonusRules?: unknown[];
      penaltyRules?: unknown[];
      taxRatePct?: number;
      withholdingPct?: number;
    },
    userId?: string,
    reason?: string,
  ) {
    const existing = await this.prisma.cpepPriceConfig.findUnique({
      where: { organizationId_configKey: { organizationId, configKey: data.configKey } },
    });
    const row = await this.prisma.cpepPriceConfig.upsert({
      where: { organizationId_configKey: { organizationId, configKey: data.configKey } },
      update: {
        name: data.name,
        basePricePerKg: data.basePricePerKg,
        bonusRules: (data.bonusRules ?? []) as object,
        penaltyRules: (data.penaltyRules ?? []) as object,
        taxRatePct: data.taxRatePct ?? 0,
        withholdingPct: data.withholdingPct ?? 0,
        isActive: true,
      },
      create: {
        organizationId,
        configKey: data.configKey,
        name: data.name,
        basePricePerKg: data.basePricePerKg,
        bonusRules: (data.bonusRules ?? []) as object,
        penaltyRules: (data.penaltyRules ?? []) as object,
        taxRatePct: data.taxRatePct ?? 0,
        withholdingPct: data.withholdingPct ?? 0,
      },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'PriceConfig',
      entityKey: data.configKey,
      action: existing ? 'update' : 'create',
      version: 1,
      previousValue: existing ?? undefined,
      newValue: row,
      reason,
      userId,
    });
    return row;
  }

  async activePrice(organizationId: string, coffeeTypeKey?: string) {
    const config = await this.prisma.cpepPriceConfig.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!config) return null;
    if (coffeeTypeKey) {
      const byType = (config.bonusRules as unknown as Array<Record<string, unknown>>) ?? [];
      void byType;
    }
    return config;
  }
}
