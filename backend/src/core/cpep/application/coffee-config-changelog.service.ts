import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class CoffeeConfigChangelogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async record(data: {
    organizationId: string;
    entityType: string;
    entityKey: string;
    action: string;
    version: number;
    previousValue?: unknown;
    newValue?: unknown;
    reason?: string;
    purchaseCenterId?: string;
    userId?: string;
  }) {
    const row = await this.prisma.cpepConfigChangeLog.create({
      data: {
        organizationId: data.organizationId,
        entityType: data.entityType,
        entityKey: data.entityKey,
        action: data.action,
        version: data.version,
        ...(data.previousValue !== undefined ? { previousValue: data.previousValue as object } : {}),
        ...(data.newValue !== undefined ? { newValue: data.newValue as object } : {}),
        reason: data.reason,
        purchaseCenterId: data.purchaseCenterId,
        userId: data.userId,
      },
    });
    await this.core.emitUserAction(
      data.organizationId,
      'CoffeeConfig',
      row.id,
      EVENT_TYPES.COFFEE_CONFIG_CHANGED,
      { entityType: data.entityType, entityKey: data.entityKey, action: data.action, version: data.version },
    );
    return row;
  }

  findAll(organizationId: string, entityType?: string, entityKey?: string, limit = 200) {
    return this.prisma.cpepConfigChangeLog.findMany({
      where: {
        organizationId,
        ...(entityType ? { entityType } : {}),
        ...(entityKey ? { entityKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
