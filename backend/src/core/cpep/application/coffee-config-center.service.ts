import { Injectable } from '@nestjs/common';
import { CoffeeCatalogService } from './coffee-catalog.service';
import { CoffeeParameterService } from './coffee-parameter.service';
import { CoffeeReceptionRulesService } from './coffee-reception-rules.service';
import { CoffeePurchaseCenterService } from './coffee-purchase-center.service';
import { CoffeeConfigService } from './coffee-config.service';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeeConfigCenterService {
  constructor(
    private readonly catalogs: CoffeeCatalogService,
    private readonly parameters: CoffeeParameterService,
    private readonly rules: CoffeeReceptionRulesService,
    private readonly centers: CoffeePurchaseCenterService,
    private readonly prices: CoffeeConfigService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  async dashboard(organizationId: string) {
    const [catalogKeys, catalogs, parameters, rules, centers, prices, changes] = await Promise.all([
      Promise.resolve(this.catalogs.catalogKeys()),
      this.catalogs.list(organizationId, undefined, false),
      this.parameters.list(organizationId),
      this.rules.list(organizationId),
      this.centers.list(organizationId, false),
      this.prices.list(organizationId),
      this.changelog.findAll(organizationId, undefined, undefined, 20),
    ]);

    const byCatalog = catalogs.reduce<Record<string, number>>((acc, c) => {
      acc[c.catalogKey] = (acc[c.catalogKey] ?? 0) + 1;
      return acc;
    }, {});

    return {
      catalogKeys,
      catalogCounts: byCatalog,
      totalCatalogEntries: catalogs.length,
      activeCatalogEntries: catalogs.filter((c) => c.isActive).length,
      parameters: parameters.length,
      receptionRules: rules.length,
      purchaseCenters: centers.length,
      priceConfigs: prices.length,
      recentChanges: changes,
    };
  }

  async seedAll(organizationId: string, userId: string) {
    const [catalogs, parameters, center] = await Promise.all([
      this.catalogs.seedDefaults(organizationId, userId),
      this.parameters.seedDefaults(organizationId, userId),
      this.centers.upsert(organizationId, userId, {
        centerKey: 'centro_01',
        name: 'Centro de compra principal',
        centerType: 'purchase',
        municipality: 'Demo',
      }, 'seed defaults'),
    ]);
    await this.rules.upsert(organizationId, userId, {
      ruleKey: 'default-schedule',
      name: 'Horario estándar',
      purchaseCenterId: center.id,
      openTime: '06:00',
      closeTime: '18:00',
      maxTicketsDay: 200,
      maxKgDay: 100000,
      minHumidityPct: 10,
      maxHumidityPct: 12.5,
      minFactor: 85,
      maxFactor: 100,
    }, 'seed defaults');
    await this.prices.upsert(organizationId, {
      configKey: 'default',
      name: 'Precio estándar',
      basePricePerKg: 12000,
      bonusRules: [{ code: 'premium', amount: 100 }],
      penaltyRules: [{ code: 'humidity', amount: 80 }],
      withholdingPct: 1.5,
    }, userId, 'seed defaults');
    return { catalogs, parameters, center: center.centerKey };
  }

  async mobileBundle(organizationId: string) {
    const [catalogs, parameters, rules, centers, prices] = await Promise.all([
      this.catalogs.list(organizationId, undefined, true),
      this.parameters.list(organizationId),
      this.rules.list(organizationId),
      this.centers.list(organizationId, true),
      this.prices.list(organizationId),
    ]);
    return {
      syncedAt: new Date().toISOString(),
      catalogs,
      parameters,
      receptionRules: rules.filter((r) => r.isActive),
      purchaseCenters: centers,
      priceConfigs: prices.filter((p) => p.isActive),
    };
  }
}
