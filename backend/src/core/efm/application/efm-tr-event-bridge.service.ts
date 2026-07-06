import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EfmTrMovementService } from './efm-tr-movement.service';

const TR_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED,
  EVENT_TYPES.ESCM_PAYMENT_CONFIRMED,
]);

@Injectable()
export class EfmTrEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmTrEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly movements: EfmTrMovementService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM Treasury bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!TR_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED) {
        await this.movements.create(event.organizationId, 'treasury-bridge', {
          movementType: 'ap_payment',
          amount: Number(payload.amount ?? 0),
          bankAccountKey: payload.bankAccountKey ? String(payload.bankAccountKey) : undefined,
          referenceNumber: String(payload.paymentKey ?? ''),
          movementDate: new Date().toISOString().slice(0, 10),
          description: `Pago proveedor ${payload.supplierKey ?? ''}`,
          sourceModule: 'ap',
          sourceDocumentKey: String(payload.paymentKey ?? ''),
          apPaymentKey: String(payload.paymentKey ?? ''),
          autoProcess: true,
        });
      }

      if (event.eventType === EVENT_TYPES.ESCM_PAYMENT_CONFIRMED) {
        await this.movements.create(event.organizationId, 'treasury-bridge', {
          movementType: 'ar_collection',
          amount: Number(payload.amount ?? 0),
          bankAccountKey: payload.bankAccountKey ? String(payload.bankAccountKey) : undefined,
          referenceNumber: String(payload.paymentKey ?? ''),
          movementDate: new Date().toISOString().slice(0, 10),
          description: `Recaudo cliente ${payload.customerKey ?? ''}`,
          sourceModule: 'ar',
          sourceDocumentKey: String(payload.paymentKey ?? ''),
          arPaymentKey: String(payload.paymentKey ?? ''),
          autoProcess: true,
        });
      }
    } catch (err) {
      this.logger.warn(`EFM TR bridge skipped ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
