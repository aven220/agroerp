import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EATP_INPUT_CATEGORIES, generateEatpKey } from '../domain/eatp.engine';

@Injectable()
export class EatpInputService {
  constructor(
    private readonly mainPrisma: PrismaService,
    private readonly prisma: EatpPrismaService,
  ) {}

  categories() {
    return EATP_INPUT_CATEGORIES;
  }

  async listInventoryItems(organizationId: string, search?: string) {
    return this.mainPrisma.eimsItem.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { internalCode: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      take: 100,
      orderBy: { name: 'asc' },
    });
  }

  listBindings(organizationId: string, category?: string) {
    return this.prisma.eatpInputBinding.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bindInput(
    organizationId: string,
    category: string,
    data: { eimsItemId?: string; itemCode?: string; unitCode?: string; taskId?: string; quantity?: number },
  ) {
    const count = await this.prisma.eatpInputBinding.count({ where: { organizationId } });
    const bindingKey = generateEatpKey('INP', count + 1);
    return this.prisma.eatpInputBinding.create({
      data: {
        organizationId,
        bindingKey,
        category,
        eimsItemId: data.eimsItemId,
        itemCode: data.itemCode,
        unitCode: data.unitCode,
        taskId: data.taskId,
        quantity: data.quantity ?? 0,
      },
    });
  }
}
