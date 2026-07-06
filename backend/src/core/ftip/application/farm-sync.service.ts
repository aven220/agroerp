import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FarmsService } from './farms.service';
import { FarmTwinService } from './farm-twin.service';
import { SyncFarmsDto } from '../presentation/farms.dto';

@Injectable()
export class FarmSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly farms: FarmsService,
    private readonly twin: FarmTwinService,
  ) {}

  async syncBatch(
    organizationId: string,
    userId: string,
    dto: SyncFarmsDto,
    ctx?: RequestContext,
  ) {
    const results: Array<{
      externalId: string;
      status: 'created' | 'duplicate' | 'error';
      farmId?: string;
      error?: string;
    }> = [];

    for (const item of dto.items) {
      try {
        const existing = await this.prisma.farmUnit.findFirst({
          where: { organizationId, externalId: item.externalId },
        });
        if (existing) {
          results.push({ externalId: item.externalId, status: 'duplicate', farmId: existing.id });
          continue;
        }

        const farm = await this.farms.create(
          organizationId,
          userId,
          {
            ...item.data,
            externalId: item.externalId,
            boundaryGeo: item.boundaryGeo ?? item.data.boundaryGeo,
          },
          ctx,
        );

        await this.prisma.farmUnit.update({
          where: { id: farm.id },
          data: { syncStatus: 'synced' },
        });

        await this.core.emitFarmSynced(
          organizationId,
          farm.id,
          { externalId: item.externalId },
          { ctx: { ...ctx, userId, organizationId } },
        );

        results.push({ externalId: item.externalId, status: 'created', farmId: farm.id });
      } catch (err) {
        results.push({
          externalId: item.externalId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Sync error',
        });
      }
    }

    return { results };
  }

  async getBootstrap(organizationId: string, userId: string) {
    const farms = await this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { farmAdministratorId: userId },
          { producerLinks: { some: { producer: { assignedTechnicianId: userId } } } },
        ],
      },
      include: {
        producerLinks: { where: { unlinkedAt: null } },
        lots: { where: { deletedAt: null } },
      },
      take: 500,
    });
    return { farms, syncedAt: new Date().toISOString() };
  }
}
