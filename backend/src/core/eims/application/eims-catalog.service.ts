import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import {
  EIMS_ADJUSTMENT_REASONS,
  EIMS_CATALOG_KEYS,
  EIMS_DEFAULT_STATUSES,
  EIMS_DEFAULT_UOMS,
  EIMS_ITEM_TYPES,
  EIMS_LOCATION_TYPES,
  EIMS_LOSS_REASONS,
  EIMS_MOVEMENT_TYPES,
  EIMS_WAREHOUSE_TYPES,
} from '../domain/eims.catalogs';

@Injectable()
export class EimsCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  catalogKeys() {
    return [...EIMS_CATALOG_KEYS];
  }

  list(organizationId: string, catalogKey?: string, all = false) {
    return this.prisma.eimsCatalogEntry.findMany({
      where: {
        organizationId,
        ...(catalogKey ? { catalogKey } : {}),
        ...(all ? {} : { isActive: true }),
      },
      orderBy: [{ catalogKey: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      catalogKey: string;
      entryKey: string;
      name: string;
      description?: string;
      code?: string;
      parentKey?: string;
      sortOrder?: number;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const row = await this.prisma.eimsCatalogEntry.upsert({
      where: {
        organizationId_catalogKey_entryKey: {
          organizationId,
          catalogKey: input.catalogKey,
          entryKey: input.entryKey,
        },
      },
      update: {
        name: input.name,
        description: input.description,
        code: input.code,
        parentKey: input.parentKey,
        sortOrder: input.sortOrder ?? 0,
        metadata: (input.metadata ?? {}) as object,
        isActive: input.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        catalogKey: input.catalogKey,
        entryKey: input.entryKey,
        name: input.name,
        description: input.description,
        code: input.code,
        parentKey: input.parentKey,
        sortOrder: input.sortOrder ?? 0,
        metadata: (input.metadata ?? {}) as object,
        isActive: input.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Catalog', `${input.catalogKey}:${input.entryKey}`, 'upsert', userId);
    await this.core.emitUserAction(
      organizationId,
      'EimsCatalog',
      row.id,
      EVENT_TYPES.EIMS_CATALOG_UPDATED,
      { catalogKey: input.catalogKey, entryKey: input.entryKey },
    );
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const seeds: Array<{
      catalogKey: string;
      entryKey: string;
      name: string;
      code?: string;
      sortOrder?: number;
      parentKey?: string;
    }> = [
      ...EIMS_ITEM_TYPES.map((e, i) => ({ catalogKey: 'item_type', ...e, sortOrder: i })),
      ...EIMS_WAREHOUSE_TYPES.map((e, i) => ({ catalogKey: 'warehouse_type', ...e, sortOrder: i })),
      ...EIMS_LOCATION_TYPES.map((e, i) => ({ catalogKey: 'location_type', ...e, sortOrder: i })),
      ...EIMS_DEFAULT_UOMS.map((e, i) => ({ catalogKey: 'uom', ...e, sortOrder: i })),
      ...EIMS_DEFAULT_STATUSES.map((e, i) => ({ catalogKey: 'item_status', ...e, sortOrder: i })),
      ...EIMS_MOVEMENT_TYPES.map((e, i) => ({ catalogKey: 'movement_type', ...e, sortOrder: i })),
      ...EIMS_ADJUSTMENT_REASONS.map((e, i) => ({ catalogKey: 'adjustment_reason', ...e, sortOrder: i })),
      ...EIMS_LOSS_REASONS.map((e, i) => ({ catalogKey: 'loss_reason', ...e, sortOrder: i })),
      { catalogKey: 'storage_type', entryKey: 'bulk', name: 'Granel', sortOrder: 0 },
      { catalogKey: 'storage_type', entryKey: 'pallet', name: 'Estiba', sortOrder: 1 },
      { catalogKey: 'storage_type', entryKey: 'rack', name: 'Rack', sortOrder: 2 },
      { catalogKey: 'lot_type', entryKey: 'purchase', name: 'Lote de compra', sortOrder: 0 },
      { catalogKey: 'lot_type', entryKey: 'production', name: 'Lote de producción', sortOrder: 1 },
      { catalogKey: 'category', entryKey: 'coffee', name: 'Café', sortOrder: 0 },
      { catalogKey: 'category', entryKey: 'inputs', name: 'Insumos', sortOrder: 1 },
      { catalogKey: 'category', entryKey: 'assets', name: 'Activos', sortOrder: 2 },
      { catalogKey: 'subcategory', entryKey: 'coffee_export', name: 'Café exportación', parentKey: 'coffee', sortOrder: 0 },
      { catalogKey: 'brand', entryKey: 'generic', name: 'Genérico', sortOrder: 0 },
      { catalogKey: 'presentation', entryKey: 'bulk', name: 'Granel', sortOrder: 0 },
      { catalogKey: 'presentation', entryKey: 'bag_70kg', name: 'Saco 70kg', sortOrder: 1 },
    ];

    const created = [];
    for (const seed of seeds) {
      created.push(
        await this.upsert(organizationId, userId, {
          catalogKey: seed.catalogKey,
          entryKey: seed.entryKey,
          name: seed.name,
          code: seed.code,
          parentKey: (seed as { parentKey?: string }).parentKey,
          sortOrder: seed.sortOrder,
        }),
      );
    }
    return { count: created.length };
  }
}
