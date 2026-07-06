import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { Inject } from '@nestjs/common';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EfmApInvoiceService } from './efm-ap-invoice.service';
import { EfmApSupplierService } from './efm-ap-supplier.service';

const AP_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.COFFEE_SETTLEMENT_POSTED,
  EVENT_TYPES.COFFEE_PAYMENT_REGISTERED,
]);

@Injectable()
export class EfmApEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmApEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly invoices: EfmApInvoiceService,
    private readonly suppliers: EfmApSupplierService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM AP bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!AP_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.COFFEE_SETTLEMENT_POSTED) {
        await this.handleSettlementPosted(event.organizationId, payload);
      }
      if (event.eventType === EVENT_TYPES.COFFEE_PAYMENT_REGISTERED) {
        await this.handlePaymentRegistered(event.organizationId, payload);
      }
    } catch (err) {
      this.logger.warn(`EFM AP bridge skipped ${event.eventType}: ${(err as Error).message}`);
    }
  }

  private async handleSettlementPosted(organizationId: string, payload: Record<string, unknown>) {
    const producerId = String(payload.producerId ?? '');
    const settlementKey = String(payload.settlementKey ?? payload.ticketKey ?? '');
    const netPayable = Number(payload.netPayable ?? payload.amount ?? 0);
    if (!producerId || !settlementKey || netPayable <= 0) return;

    const supplier = await this.suppliers.getOrCreateFromProducer(organizationId, producerId);
    await this.invoices.register(organizationId, 'system-bridge', {
      supplierKey: supplier.supplierKey,
      producerId,
      sourceModule: 'cpep',
      sourceDocumentKey: settlementKey,
      purchaseOrderKey: payload.ticketKey ? String(payload.ticketKey) : undefined,
      receiptKey: payload.ticketKey ? String(payload.ticketKey) : undefined,
      supplierInvoiceNumber: payload.documentNumber ? String(payload.documentNumber) : settlementKey,
      issueDate: new Date().toISOString().slice(0, 10),
      lines: [{
        description: `Liquidación ${settlementKey}`,
        quantity: Number(payload.netWeightKg ?? payload.quantity ?? 1),
        unitPrice: netPayable / Math.max(Number(payload.netWeightKg ?? payload.quantity ?? 1), 1),
        taxAmount: 0,
      }],
      poQuantity: Number(payload.netWeightKg ?? payload.quantity ?? 0) || undefined,
      receiptQuantity: Number(payload.netWeightKg ?? payload.quantity ?? 0) || undefined,
      autoValidate: true,
      autoPost: true,
    });
  }

  private async handlePaymentRegistered(organizationId: string, payload: Record<string, unknown>) {
    // Coffee payments tracked in CPEP; AP payment reconciliation via manual link or future sync
    this.logger.debug(`Coffee payment registered ${payload.paymentKey ?? payload.settlementKey}`);
  }
}
