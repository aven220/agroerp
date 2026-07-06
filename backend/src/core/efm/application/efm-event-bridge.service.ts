import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';

const AUTO_POST_EVENTS = new Set<string>([
  EVENT_TYPES.ESCM_INVOICE_ISSUED,
  EVENT_TYPES.ESCM_PAYMENT_CONFIRMED,
  EVENT_TYPES.ESCM_RETURN_PROCESSED,
  EVENT_TYPES.ESCM_CREDIT_NOTE_ISSUED,
  EVENT_TYPES.ESCM_DEBIT_NOTE_ISSUED,
  EVENT_TYPES.EFM_AP_INVOICE_POSTED,
  EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED,
  EVENT_TYPES.COFFEE_SETTLEMENT_POSTED,
  EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED,
  EVENT_TYPES.EFM_FA_ASSET_ACTIVATED,
  EVENT_TYPES.EFM_FA_DEPRECIATION_POSTED,
  EVENT_TYPES.EFM_FA_AMORTIZATION_POSTED,
  EVENT_TYPES.EFM_FA_DISPOSAL_POSTED,
  EVENT_TYPES.EFM_FA_REVALUATION_POSTED,
]);

@Injectable()
export class EfmEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM accounting bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!AUTO_POST_EVENTS.has(event.eventType)) return;
    try {
      await this.engine.generateFromEvent(
        event.organizationId,
        event.eventType,
        event.payload as Record<string, unknown>,
      );
    } catch (err) {
      this.logger.warn(
        `EFM auto-post skipped for ${event.eventType}: ${(err as Error).message}`,
      );
    }
  }
}
