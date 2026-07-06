import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EimsCatalogService } from './eims-catalog.service';
import { EimsParameterService } from './eims-parameter.service';
import { EimsWarehouseService } from './eims-warehouse.service';
import { EimsLocationService } from './eims-location.service';
import { EimsItemService } from './eims-item.service';
import { EimsAuditService } from './eims-audit.service';

@Injectable()
export class EimsConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogs: EimsCatalogService,
    private readonly parameters: EimsParameterService,
    private readonly warehouses: EimsWarehouseService,
    private readonly locations: EimsLocationService,
    private readonly items: EimsItemService,
    private readonly audit: EimsAuditService,
  ) {}

  async center(organizationId: string) {
    const [
      catalogs,
      parameters,
      warehouses,
      items,
      audits,
      lotsCount,
      alertsCount,
      transformsCount,
      countsOpen,
      countsPendingApproval,
      activeReservations,
      openSuggestions,
      openSupplyAlerts,
      openOpsAlerts,
    ] = await Promise.all([
      this.catalogs.list(organizationId),
      this.parameters.list(organizationId),
      this.warehouses.list(organizationId),
      this.items.list(organizationId),
      this.audit.findAll(organizationId, 50),
      this.prisma.eimsStockLot.count({ where: { organizationId } }),
      this.prisma.eimsExpiryAlert.count({ where: { organizationId, acknowledged: false } }),
      this.prisma.eimsLotTransformation.count({ where: { organizationId } }),
      this.prisma.eimsCountSession.count({
        where: {
          organizationId,
          status: { in: ['scheduled', 'in_progress', 'counting', 'reconciling'] },
        },
      }),
      this.prisma.eimsCountSession.count({
        where: { organizationId, status: 'pending_approval' },
      }),
      this.prisma.eimsReservation.count({
        where: { organizationId, status: { in: ['active', 'partial'] } },
      }),
      this.prisma.eimsSupplySuggestion.count({
        where: { organizationId, status: 'proposed' },
      }),
      this.prisma.eimsSupplyAlert.count({
        where: { organizationId, acknowledged: false, resolved: false },
      }),
      this.prisma.eimsOpsAlert.count({
        where: { organizationId, acknowledged: false },
      }),
    ]);
    return {
      catalogKeys: this.catalogs.catalogKeys(),
      catalogsCount: catalogs.length,
      parametersCount: parameters.length,
      warehousesCount: warehouses.length,
      itemsCount: items.length,
      lotsCount,
      alertsCount,
      transformsCount,
      countsOpen,
      countsPendingApproval,
      activeReservations,
      openSuggestions,
      openSupplyAlerts,
      openOpsAlerts,
      warehouses: warehouses.slice(0, 20),
      items: items.slice(0, 20),
      recentAudit: audits,
    };
  }

  async seed(organizationId: string, userId: string) {
    const catalogs = await this.catalogs.seedDefaults(organizationId, userId);
    const parameters = await this.parameters.seedDefaults(organizationId, userId);

    await this.warehouses.upsert(organizationId, userId, {
      warehouseKey: 'WH-MAIN',
      name: 'Bodega principal',
      warehouseType: 'warehouse',
      municipality: 'Principal',
      responsibleName: 'Jefe de bodega',
    });
    await this.warehouses.upsert(organizationId, userId, {
      warehouseKey: 'ACOPIO-01',
      name: 'Centro de acopio 01',
      warehouseType: 'collection_center',
    });
    await this.warehouses.upsert(organizationId, userId, {
      warehouseKey: 'SILO-01',
      name: 'Silo 01',
      warehouseType: 'silo',
    });

    await this.locations.upsert(organizationId, userId, {
      warehouseKey: 'WH-MAIN',
      name: 'Pasillo A',
      locationType: 'aisle',
      aisle: 'A',
    });
    await this.locations.upsert(organizationId, userId, {
      warehouseKey: 'WH-MAIN',
      name: 'Estantería A-01',
      locationType: 'shelf',
      aisle: 'A',
      shelf: '01',
      parentKey: 'WH-MAIN-A',
    });
    await this.locations.upsert(organizationId, userId, {
      warehouseKey: 'WH-MAIN',
      name: 'Posición A-01-1-1',
      locationType: 'position',
      aisle: 'A',
      shelf: '01',
      level: '1',
      position: '1',
      parentKey: 'WH-MAIN-A-01',
    });

    await this.items.upsert(organizationId, userId, {
      itemKey: 'CAF-PERG-001',
      name: 'Café pergamino estándar',
      itemTypeKey: 'coffee_parchment',
      categoryKey: 'coffee',
      uomKey: 'kg',
      trackLot: true,
      trackExpiry: false,
      weight: 1,
      presentationKey: 'bag_70kg',
      defaultLocationKey: 'WH-MAIN-A-01-1-1',
    });
    await this.items.upsert(organizationId, userId, {
      itemKey: 'CAF-VERDE-001',
      name: 'Café verde excelso',
      itemTypeKey: 'coffee_green',
      categoryKey: 'coffee',
      uomKey: 'kg',
      trackLot: true,
    });
    await this.items.upsert(organizationId, userId, {
      itemKey: 'FER-NPK-001',
      name: 'Fertilizante NPK',
      itemTypeKey: 'fertilizer',
      categoryKey: 'inputs',
      uomKey: 'kg',
      trackLot: true,
      trackExpiry: true,
      shelfLifeDays: 365,
    });

    await this.audit.log(organizationId, 'Config', 'seed', 'seeded', userId, {
      catalogs: catalogs.count,
      parameters: parameters.count,
    });

    await this.seedSupplyRules(organizationId, userId);

    return { catalogs, parameters, seeded: true };
  }

  async seedSupplyRules(organizationId: string, userId: string) {
    const rules = [
      { name: 'Reorden mín-máx global', ruleType: 'min_max', priority: 10 },
      { name: 'Demanda histórica', ruleType: 'demand_history', priority: 20 },
      { name: 'Estacionalidad', ruleType: 'seasonality', priority: 30, parameters: { factor: 1.2 } },
    ];
    for (const r of rules) {
      await this.prisma.eimsSupplyRule.upsert({
        where: {
          organizationId_ruleKey: {
            organizationId,
            ruleKey: `RULE-SEED-${r.ruleType.toUpperCase()}`,
          },
        },
        update: { isActive: true },
        create: {
          organizationId,
          ruleKey: `RULE-SEED-${r.ruleType.toUpperCase()}`,
          name: r.name,
          ruleType: r.ruleType as never,
          priority: r.priority,
          parameters: ((r as { parameters?: object }).parameters ?? {}) as object,
          createdBy: userId,
        },
      });
    }
  }
}
