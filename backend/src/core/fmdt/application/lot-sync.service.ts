import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { LotsService } from './lots.service';
import { LotOperationsService } from './lot-operations.service';
import { SyncLotsDto } from '../presentation/lots.dto';

@Injectable()
export class LotSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly lots: LotsService,
    private readonly operations: LotOperationsService,
  ) {}

  async syncBatch(
    organizationId: string,
    userId: string,
    dto: SyncLotsDto,
    ctx?: RequestContext,
  ) {
    const results: Array<{
      externalId: string;
      status: 'created' | 'duplicate' | 'error';
      fieldLotId?: string;
      error?: string;
    }> = [];

    for (const item of dto.lots ?? []) {
      try {
        const existing = await this.prisma.fieldLotProfile.findFirst({
          where: { organizationId, externalId: item.externalId },
        });
        if (existing) {
          results.push({ externalId: item.externalId, status: 'duplicate', fieldLotId: existing.id });
          continue;
        }
        const lot = await this.lots.create(organizationId, userId, { ...item.data, externalId: item.externalId }, ctx);
        await this.prisma.fieldLotProfile.update({
          where: { id: lot.id },
          data: { syncStatus: 'synced' },
        });
        await this.core.emitFieldLotSynced(organizationId, lot.id, { externalId: item.externalId }, { ctx });
        results.push({ externalId: item.externalId, status: 'created', fieldLotId: lot.id });
      } catch (err) {
        results.push({
          externalId: item.externalId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Sync error',
        });
      }
    }

    for (const item of dto.operations ?? []) {
      try {
        await this.operations.create(
          organizationId,
          item.fieldLotId,
          userId,
          { ...item.data, externalId: item.externalId },
          ctx,
        );
      } catch {
        /* logged per operation */
      }
    }

    return { results };
  }

  async getBootstrap(organizationId: string, userId: string) {
    const lots = await this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { assignedTechnicianId: userId },
          { farmUnit: { farmAdministratorId: userId } },
        ],
      },
      include: {
        agronomicStates: { where: { effectiveUntil: null }, take: 1 },
        digitalTwin: true,
      },
      take: 500,
    });
    return { lots, syncedAt: new Date().toISOString() };
  }
}
