import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { ProducersService } from './producers.service';
import { ProducerRelationsService } from './producer-relations.service';
import { SyncProducersDto } from '../presentation/producers.dto';

@Injectable()
export class ProducerSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly producers: ProducersService,
    private readonly relations: ProducerRelationsService,
  ) {}

  async syncBatch(
    organizationId: string,
    userId: string,
    dto: SyncProducersDto,
    ctx?: RequestContext,
  ) {
    const results: Array<{
      externalId: string;
      status: 'created' | 'updated' | 'duplicate' | 'error';
      producerId?: string;
      error?: string;
    }> = [];

    for (const item of dto.items) {
      try {
        const existing = await this.prisma.producer.findFirst({
          where: { organizationId, externalId: item.externalId },
        });

        if (existing) {
          results.push({
            externalId: item.externalId,
            status: 'duplicate',
            producerId: existing.id,
          });
          continue;
        }

        const producer = await this.producers.create(
          organizationId,
          userId,
          { ...item.data, externalId: item.externalId },
          ctx,
        );

        if (item.contacts) {
          for (const contact of item.contacts) {
            await this.relations.addContact(
              organizationId,
              producer.id,
              userId,
              contact,
              ctx,
            );
          }
        }

        if (item.addresses) {
          for (const address of item.addresses) {
            await this.relations.addAddress(
              organizationId,
              producer.id,
              userId,
              address,
              ctx,
            );
          }
        }

        await this.prisma.producer.update({
          where: { id: producer.id },
          data: { syncStatus: 'synced' },
        });

        await this.core.emitProducerSynced(
          organizationId,
          producer.id,
          { externalId: item.externalId },
          { ctx: { ...ctx, userId, organizationId } },
        );

        results.push({
          externalId: item.externalId,
          status: 'created',
          producerId: producer.id,
        });
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
    const assignments = await this.prisma.producerAssignment.findMany({
      where: {
        organizationId,
        assigneeId: userId,
        endsAt: null,
      },
      select: { producerId: true },
    });
    const producerIds = assignments.map((a) => a.producerId);

    const producers = await this.prisma.producer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { assignedBuyerId: userId },
          { assignedTechnicianId: userId },
          ...(producerIds.length > 0 ? [{ id: { in: producerIds } }] : []),
        ],
      },
      include: {
        contacts: { where: { deletedAt: null } },
        addresses: { where: { deletedAt: null } },
      },
      take: 500,
    });

    return { producers, syncedAt: new Date().toISOString() };
  }
}
