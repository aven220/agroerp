import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { JobDispatcherService } from './job-dispatcher.service';

@Injectable()
export class JobEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(JobEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
    private readonly dispatcher: JobDispatcherService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('ESDJE event bridge subscribed to all domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (event.eventType.startsWith('Job')) return;

    try {
      const jobs = await this.prisma.esdjeJob.findMany({
        where: {
          organizationId: event.organizationId,
          deletedAt: null,
          status: { in: ['pending', 'queued'] },
          jobType: 'event',
          eventTypes: { has: event.eventType },
        },
        include: { queue: true },
      });

      for (const job of jobs) {
        const payload = {
          ...(job.payload as object),
          eventType: event.eventType,
          eventPayload: event.payload,
          aggregateId: event.aggregateId,
        };
        await this.dispatcher.dispatchJob(
          { ...job, payload },
          event.metadata?.userId,
        );
      }
    } catch (err) {
      this.logger.error(`ESDJE event job failed: ${(err as Error).message}`);
    }
  }
}
