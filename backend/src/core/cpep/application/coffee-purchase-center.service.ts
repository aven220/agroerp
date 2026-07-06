import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeePurchaseCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  list(organizationId: string, activeOnly = true) {
    return this.prisma.cpepPurchaseCenter.findMany({
      where: { organizationId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    data: {
      centerKey: string;
      name: string;
      centerType?: string;
      address?: string;
      municipality?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
    reason?: string,
  ) {
    const existing = await this.prisma.cpepPurchaseCenter.findUnique({
      where: { organizationId_centerKey: { organizationId, centerKey: data.centerKey } },
    });
    const row = await this.prisma.cpepPurchaseCenter.upsert({
      where: { organizationId_centerKey: { organizationId, centerKey: data.centerKey } },
      update: {
        name: data.name,
        centerType: data.centerType ?? 'purchase',
        address: data.address,
        municipality: data.municipality,
        metadata: (data.metadata ?? {}) as object,
        isActive: data.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        centerKey: data.centerKey,
        name: data.name,
        centerType: data.centerType ?? 'purchase',
        address: data.address,
        municipality: data.municipality,
        metadata: (data.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'PurchaseCenter',
      entityKey: data.centerKey,
      action: existing ? 'update' : 'create',
      version: 1,
      previousValue: existing ?? undefined,
      newValue: row,
      reason,
      purchaseCenterId: row.id,
      userId,
    });
    return row;
  }

  async deactivate(organizationId: string, centerKey: string, userId: string, reason?: string) {
    const existing = await this.prisma.cpepPurchaseCenter.findUnique({
      where: { organizationId_centerKey: { organizationId, centerKey } },
    });
    if (!existing) throw new NotFoundException('Centro de compra no encontrado');
    const row = await this.prisma.cpepPurchaseCenter.update({
      where: { id: existing.id },
      data: { isActive: false, updatedBy: userId },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'PurchaseCenter',
      entityKey: centerKey,
      action: 'deactivate',
      version: 1,
      previousValue: existing,
      newValue: row,
      reason,
      purchaseCenterId: row.id,
      userId,
    });
    return row;
  }
}
