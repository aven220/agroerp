import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  ESCM_CATALOG_KEYS,
  ESCM_CHANNELS,
  ESCM_CURRENCIES,
  ESCM_CUSTOMER_TYPES,
  ESCM_DELIVERY_METHODS,
  ESCM_INCOTERMS,
  ESCM_PAYMENT_TERMS,
  ESCM_SEGMENTS,
  ESCM_TAXES,
  ESCM_WITHHOLDINGS,
} from '../domain/escm.catalogs';

@Injectable()
export class EscmCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  catalogKeys() {
    return [...ESCM_CATALOG_KEYS];
  }

  list(organizationId: string, catalogKey?: string, all = false) {
    return this.prisma.escmCatalogEntry.findMany({
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
    const row = await this.prisma.escmCatalogEntry.upsert({
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
      'EscmCatalog',
      row.id,
      EVENT_TYPES.ESCM_CATALOG_UPDATED,
      { catalogKey: input.catalogKey, entryKey: input.entryKey },
    );
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const seeds = [
      ...ESCM_CUSTOMER_TYPES.map((e, i) => ({ catalogKey: 'customer_type', ...e, sortOrder: i })),
      ...ESCM_SEGMENTS.map((e, i) => ({ catalogKey: 'segment', ...e, sortOrder: i })),
      ...ESCM_CHANNELS.map((e, i) => ({ catalogKey: 'sales_channel', ...e, sortOrder: i })),
      ...ESCM_CURRENCIES.map((e, i) => ({ catalogKey: 'currency', ...e, sortOrder: i })),
      ...ESCM_PAYMENT_TERMS.map((e, i) => ({ catalogKey: 'payment_term', ...e, sortOrder: i })),
      ...ESCM_DELIVERY_METHODS.map((e, i) => ({ catalogKey: 'delivery_method', ...e, sortOrder: i })),
      ...ESCM_INCOTERMS.map((e, i) => ({ catalogKey: 'incoterm', ...e, sortOrder: i })),
      ...ESCM_TAXES.map((e, i) => ({
        catalogKey: 'tax',
        entryKey: e.entryKey,
        name: e.name,
        sortOrder: i,
        metadata: e.metadata,
      })),
      ...ESCM_WITHHOLDINGS.map((e, i) => ({ catalogKey: 'withholding', ...e, sortOrder: i })),
      { catalogKey: 'discount_type', entryKey: 'percentage', name: 'Porcentaje', sortOrder: 0 },
      { catalogKey: 'discount_type', entryKey: 'amount', name: 'Monto fijo', sortOrder: 1 },
      { catalogKey: 'promotion_type', entryKey: 'seasonal', name: 'Temporada', sortOrder: 0 },
      { catalogKey: 'promotion_type', entryKey: 'volume', name: 'Volumen', sortOrder: 1 },
      { catalogKey: 'region', entryKey: 'ANDINA', name: 'Región Andina', sortOrder: 0 },
      { catalogKey: 'region', entryKey: 'PACIFICO', name: 'Región Pacífico', sortOrder: 1 },
      { catalogKey: 'season', entryKey: 'HARVEST', name: 'Cosecha', sortOrder: 0 },
      { catalogKey: 'season', entryKey: 'OFF_SEASON', name: 'Fuera de cosecha', sortOrder: 1 },
      { catalogKey: 'classification', entryKey: 'A', name: 'Clase A', sortOrder: 0 },
      { catalogKey: 'classification', entryKey: 'B', name: 'Clase B', sortOrder: 1 },
    ];
    let count = 0;
    for (const seed of seeds) {
      await this.upsert(organizationId, userId, seed);
      count += 1;
    }
    return { count };
  }
}
