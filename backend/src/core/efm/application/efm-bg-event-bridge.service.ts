import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EfmBgControlService } from './efm-bg-control.service';
import { EfmBgValidationService } from './efm-bg-validation.service';
import { buildPeriodKey } from '../domain/efm-budget.engine';

const BG_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.EFM_AP_INVOICE_POSTED,
  EVENT_TYPES.EFM_AP_PAYMENT_CREATED,
  EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED,
  EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED,
  EVENT_TYPES.COFFEE_SETTLEMENT_POSTED,
]);

@Injectable()
export class EfmBgEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmBgEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly control: EfmBgControlService,
    private readonly validation: EfmBgValidationService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM budget control bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!BG_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      const budget = await this.validation.resolveActiveBudget(event.organizationId);
      if (!budget) return;

      const amount = Number(payload.amount ?? payload.totalAmount ?? 0);
      if (amount <= 0) return;

      const periodKey = String(payload.periodKey ?? buildPeriodKey(new Date().getFullYear(), new Date().getMonth() + 1));
      const accountKey = String(payload.accountKey ?? 'ACC-6135');
      const costCenterKey = payload.costCenterKey ? String(payload.costCenterKey) : 'CC-OPS';
      const docKey = String(payload.invoiceKey ?? payload.paymentKey ?? payload.movementKey ?? payload.settlementKey ?? 'unknown');

      if (event.eventType === EVENT_TYPES.EFM_AP_INVOICE_POSTED || event.eventType === EVENT_TYPES.COFFEE_SETTLEMENT_POSTED) {
        await this.validation.validateOnly(event.organizationId, {
          periodKey,
          accountKey,
          costCenterKey,
          amount,
          sourceModule: event.eventType === EVENT_TYPES.COFFEE_SETTLEMENT_POSTED ? 'purchase' : 'accounts_payable',
          sourceDocumentKey: docKey,
        });

        await this.control.createCommitment(event.organizationId, 'bg-bridge', {
          budgetKey: budget.budgetKey,
          periodKey,
          accountKey,
          costCenterKey,
          amount,
          sourceModule: event.eventType === EVENT_TYPES.COFFEE_SETTLEMENT_POSTED ? 'purchase' : 'accounts_payable',
          sourceDocumentKey: docKey,
          description: `Compromiso ${docKey}`,
        });
      }

      if (event.eventType === EVENT_TYPES.EFM_AP_PAYMENT_CREATED) {
        await this.validation.checkAndReserve(event.organizationId, {
          periodKey,
          accountKey: 'ACC-2205',
          costCenterKey,
          amount,
          sourceModule: 'payment',
          sourceDocumentKey: docKey,
          description: `Validación pago ${docKey}`,
          userId: 'bg-bridge',
        });
      }

      if (event.eventType === EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED || event.eventType === EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED) {
        await this.control.createExecution(event.organizationId, 'bg-bridge', {
          budgetKey: budget.budgetKey,
          periodKey,
          accountKey: event.eventType === EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED ? 'ACC-1110' : accountKey,
          costCenterKey,
          amount,
          sourceModule: event.eventType === EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED ? 'treasury' : 'payment',
          sourceDocumentKey: docKey,
          accountingRef: payload.accountingRef ? String(payload.accountingRef) : undefined,
          description: `Ejecución ${docKey}`,
        });
      }
    } catch (err) {
      this.logger.warn(`EFM BG bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
