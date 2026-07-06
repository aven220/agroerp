import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EventBusPort } from '@/shared/domain/events/event-bus.port';

type EventHandler = (event: DomainEvent) => Promise<void>;

@Injectable()
export class RedisEventBus implements EventBusPort, OnModuleDestroy {
  private readonly logger = new Logger(RedisEventBus.name);
  private readonly redis: Redis | null;
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly useInMemory: boolean;

  constructor(private readonly config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    this.useInMemory = !redisUrl;

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.redis.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });
      this.redis.connect().catch((err) => {
        this.logger.warn(`Redis unavailable, falling back to in-memory bus: ${err.message}`);
      });
    } else {
      this.redis = null;
      this.logger.warn('REDIS_URL not set — using in-memory event bus');
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    const wildcardHandlers = this.handlers.get('*') ?? [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error(
          `Handler failed for ${event.eventType}: ${(err as Error).message}`,
        );
      }
    }

    if (this.redis?.status === 'ready') {
      const streamKey = `stream:events:${event.organizationId}`;
      await this.redis.xadd(
        streamKey,
        '*',
        'eventType',
        event.eventType,
        'payload',
        JSON.stringify(event, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }
}
