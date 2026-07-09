import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EventStorePort } from '@/shared/domain/events/event-store.port';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PostgresEventStore implements EventStorePort {
  private readonly logger = new Logger(PostgresEventStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async append(event: DomainEvent): Promise<DomainEvent> {
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const stored = await this.prisma.$transaction(async (tx) => {
          const lastEvent = await tx.event.findFirst({
            where: {
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
            },
            orderBy: { version: 'desc' },
          });

          const nextVersion = lastEvent
            ? lastEvent.version + BigInt(1)
            : BigInt(1);

          return tx.event.create({
            data: {
              id: event.id ?? uuidv4(),
              organizationId: event.organizationId,
              userId: event.metadata?.userId,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              eventType: event.eventType,
              payload: event.payload as object,
              metadata: event.metadata as object,
              version: nextVersion,
              occurredAt: event.occurredAt ?? new Date(),
            },
          });
        });

        this.logger.debug(
          `Event appended: ${stored.eventType} [${stored.aggregateType}:${stored.aggregateId}] v${stored.version}`,
        );

        return {
          id: stored.id,
          organizationId: stored.organizationId,
          aggregateType: stored.aggregateType,
          aggregateId: stored.aggregateId,
          eventType: stored.eventType,
          payload: stored.payload as Record<string, unknown>,
          metadata: stored.metadata as unknown as DomainEvent['metadata'],
          version: stored.version,
          occurredAt: stored.occurredAt,
        };
      } catch (err) {
        if (
          attempt < maxRetries - 1 &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to append event after retries');
  }

  async getByAggregate(
    aggregateType: string,
    aggregateId: string,
    organizationId: string,
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: { aggregateType, aggregateId, organizationId },
      orderBy: { version: 'asc' },
    });

    return events.map((e) => this.toDomainEvent(e));
  }

  async getSince(
    organizationId: string,
    cursor: bigint,
    limit = 500,
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizationId,
        globalSequence: { gt: cursor },
      },
      orderBy: { globalSequence: 'asc' },
      take: limit,
    });

    return events.map((e) => this.toDomainEvent(e));
  }

  private toDomainEvent(e: {
    id: string;
    organizationId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    metadata: unknown;
    version: bigint;
    occurredAt: Date;
  }): DomainEvent {
    return {
      id: e.id,
      organizationId: e.organizationId,
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      eventType: e.eventType,
      payload: e.payload as Record<string, unknown>,
      metadata: e.metadata as unknown as DomainEvent['metadata'],
      version: e.version,
      occurredAt: e.occurredAt,
    };
  }
}
