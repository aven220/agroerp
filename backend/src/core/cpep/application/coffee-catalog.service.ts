import { Injectable, NotFoundException } from '@nestjs/common';
import { CPEP_CATALOG_KEYS, CpepCatalogEntryDefinition, EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeeCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  catalogKeys() {
    return [...CPEP_CATALOG_KEYS];
  }

  list(organizationId: string, catalogKey?: string, activeOnly = true) {
    return this.prisma.cpepCatalogEntry.findMany({
      where: {
        organizationId,
        ...(catalogKey ? { catalogKey } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ catalogKey: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    dto: CpepCatalogEntryDefinition,
    reason?: string,
  ) {
    const existing = await this.prisma.cpepCatalogEntry.findUnique({
      where: {
        organizationId_catalogKey_entryKey: {
          organizationId,
          catalogKey: dto.catalogKey,
          entryKey: dto.entryKey,
        },
      },
    });

    const entry = await this.prisma.cpepCatalogEntry.upsert({
      where: {
        organizationId_catalogKey_entryKey: {
          organizationId,
          catalogKey: dto.catalogKey,
          entryKey: dto.entryKey,
        },
      },
      update: {
        name: dto.name,
        description: dto.description,
        code: dto.code,
        sortOrder: dto.sortOrder ?? 0,
        metadata: (dto.metadata ?? {}) as object,
        isActive: dto.isActive ?? true,
        version: { increment: 1 },
        updatedBy: userId,
      },
      create: {
        organizationId,
        catalogKey: dto.catalogKey,
        entryKey: dto.entryKey,
        name: dto.name,
        description: dto.description,
        code: dto.code,
        sortOrder: dto.sortOrder ?? 0,
        metadata: (dto.metadata ?? {}) as object,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.changelog.record({
      organizationId,
      entityType: 'CatalogEntry',
      entityKey: `${dto.catalogKey}:${dto.entryKey}`,
      action: existing ? 'update' : 'create',
      version: entry.version,
      previousValue: existing ?? undefined,
      newValue: entry,
      reason,
      userId,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeCatalog',
      entry.id,
      EVENT_TYPES.COFFEE_CATALOG_UPDATED,
      { catalogKey: dto.catalogKey, entryKey: dto.entryKey },
    );
    return entry;
  }

  async deactivate(organizationId: string, catalogKey: string, entryKey: string, userId: string, reason?: string) {
    const existing = await this.prisma.cpepCatalogEntry.findUnique({
      where: { organizationId_catalogKey_entryKey: { organizationId, catalogKey, entryKey } },
    });
    if (!existing) throw new NotFoundException('Entrada de catálogo no encontrada');
    const entry = await this.prisma.cpepCatalogEntry.update({
      where: { id: existing.id },
      data: { isActive: false, version: { increment: 1 }, updatedBy: userId },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'CatalogEntry',
      entityKey: `${catalogKey}:${entryKey}`,
      action: 'deactivate',
      version: entry.version,
      previousValue: existing,
      newValue: entry,
      reason,
      userId,
    });
    return entry;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const defaults: Array<{ catalogKey: string; entryKey: string; name: string; code?: string }> = [
      { catalogKey: 'coffee_type', entryKey: 'pergamino', name: 'Pergamino', code: 'PER' },
      { catalogKey: 'coffee_type', entryKey: 'cereza', name: 'Cereza', code: 'CER' },
      { catalogKey: 'coffee_type', entryKey: 'excelso', name: 'Excelso', code: 'EXC' },
      { catalogKey: 'variety', entryKey: 'castillo', name: 'Castillo' },
      { catalogKey: 'variety', entryKey: 'colombia', name: 'Colombia' },
      { catalogKey: 'variety', entryKey: 'cenicafe1', name: 'Cenicafé 1' },
      { catalogKey: 'coffee_state', entryKey: 'seco', name: 'Seco' },
      { catalogKey: 'coffee_state', entryKey: 'humedo', name: 'Húmedo' },
      { catalogKey: 'presentation', entryKey: 'saco_70', name: 'Saco 70 kg' },
      { catalogKey: 'unit_of_measure', entryKey: 'kg', name: 'Kilogramo', code: 'KG' },
      { catalogKey: 'packaging_type', entryKey: 'saco_yute', name: 'Saco de yute' },
      { catalogKey: 'destination_warehouse', entryKey: 'acopio_principal', name: 'Acopio principal' },
      { catalogKey: 'purchase_center', entryKey: 'centro_01', name: 'Centro de compra 01' },
      { catalogKey: 'collection_center', entryKey: 'acopio_01', name: 'Centro de acopio 01' },
      { catalogKey: 'scale', entryKey: 'scale-warehouse-01', name: 'Balanza acopio principal' },
      { catalogKey: 'rejection_reason', entryKey: 'humedad_alta', name: 'Humedad alta' },
      { catalogKey: 'defect_type', entryKey: 'broca', name: 'Broca' },
      { catalogKey: 'defect_type', entryKey: 'pasilla', name: 'Pasilla' },
      { catalogKey: 'humidity_type', entryKey: 'estufa', name: 'Humedad estufa' },
      { catalogKey: 'analysis_type', entryKey: 'fisico', name: 'Análisis físico' },
      { catalogKey: 'payment_type', entryKey: 'contado', name: 'Contado' },
      { catalogKey: 'payment_type', entryKey: 'parcial', name: 'Pago parcial' },
      { catalogKey: 'bank', entryKey: 'bancolombia', name: 'Bancolombia' },
      { catalogKey: 'payment_method', entryKey: 'transferencia', name: 'Transferencia' },
      { catalogKey: 'currency', entryKey: 'COP', name: 'Peso colombiano', code: 'COP' },
      { catalogKey: 'tax', entryKey: 'iva_0', name: 'IVA 0%' },
      { catalogKey: 'withholding', entryKey: 'retefuente_15', name: 'Retefuente 1.5%' },
      { catalogKey: 'bonus', entryKey: 'premium_quality', name: 'Bonificación premium' },
      { catalogKey: 'penalty', entryKey: 'humidity_penalty', name: 'Castigo por humedad' },
      { catalogKey: 'discount_concept', entryKey: 'transporte', name: 'Descuento transporte' },
      { catalogKey: 'authorized_vehicle', entryKey: 'camion', name: 'Camión' },
      { catalogKey: 'carrier', entryKey: 'propia', name: 'Flota propia' },
    ];
    const created = [];
    for (const d of defaults) {
      created.push(await this.upsert(organizationId, userId, d, 'seed defaults'));
    }
    return { seeded: created.length };
  }
}
