import { Module } from '@nestjs/common';
import { EVENT_BUS_PORT } from '@/shared/domain/events/event-bus.port';
import { EVENT_STORE_PORT } from '@/shared/domain/events/event-store.port';
import { PostgresEventStore } from './infrastructure/postgres-event-store';
import { RedisEventBus } from './infrastructure/redis-event-bus';
import { EventService } from './application/event.service';
import { EventsController } from './presentation/events.controller';

@Module({
  controllers: [EventsController],
  providers: [
    { provide: EVENT_STORE_PORT, useClass: PostgresEventStore },
    { provide: EVENT_BUS_PORT, useClass: RedisEventBus },
    EventService,
  ],
  exports: [EventService, EVENT_STORE_PORT, EVENT_BUS_PORT],
})
export class EventsModule {}
