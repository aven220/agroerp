import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProducerLifecycleStatus } from '@prisma/client';
import { PRODUCER_LIFECYCLE_TRANSITIONS } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { ProducersService } from './producers.service';
import { LifecycleTransitionDto } from '../presentation/producers.dto';

@Injectable()
export class ProducerLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly producers: ProducersService,
  ) {}

  async transition(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: LifecycleTransitionDto,
    ctx?: RequestContext,
  ) {
    const producer = await this.producers.findOne(organizationId, producerId);
    const fromStatus = producer.lifecycleStatus;
    const toStatus = dto.toStatus as ProducerLifecycleStatus;

    const allowed = PRODUCER_LIFECYCLE_TRANSITIONS[fromStatus as keyof typeof PRODUCER_LIFECYCLE_TRANSITIONS];
    if (!allowed?.includes(toStatus)) {
      throw new UnprocessableEntityException(
        `Transición no permitida: ${fromStatus} → ${toStatus}`,
      );
    }

    if (toStatus === 'suspended' && !dto.reasonCode) {
      throw new UnprocessableEntityException(
        'Motivo obligatorio para suspensión',
      );
    }

    const updated = await this.prisma.producer.update({
      where: { id: producerId },
      data: {
        lifecycleStatus: toStatus,
        ...(toStatus === 'active' && !producer.activatedAt
          ? { activatedAt: new Date() }
          : {}),
        lastActivityAt: new Date(),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    const lifecycleEvent = await this.prisma.producerLifecycleEvent.create({
      data: {
        organizationId,
        producerId,
        fromStatus,
        toStatus,
        reasonCode: dto.reasonCode,
        reasonNotes: dto.reasonNotes,
        actorId: userId,
      },
    });

    await this.core.emitProducerLifecycleChanged(
      organizationId,
      producerId,
      {
        fromStatus,
        toStatus,
        reasonCode: dto.reasonCode,
        lifecycleEventId: lifecycleEvent.id,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: { lifecycleStatus: fromStatus },
        newValues: { lifecycleStatus: toStatus },
      },
    );

    return updated;
  }
}
