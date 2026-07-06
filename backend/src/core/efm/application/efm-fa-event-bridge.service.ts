import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EfmFaAssetService } from './efm-fa-asset.service';

const FA_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.EFM_AP_INVOICE_POSTED,
  EVENT_TYPES.EIMS_MOVEMENT_POSTED,
]);

@Injectable()
export class EfmFaEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmFaEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly assets: EfmFaAssetService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM fixed assets bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!FA_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.EFM_AP_INVOICE_POSTED) {
        const isCapitalAsset = Boolean(payload.isCapitalAsset ?? payload.capitalAsset);
        if (!isCapitalAsset) return;

        await this.assets.register(event.organizationId, 'fa-bridge', {
          name: String(payload.description ?? payload.invoiceKey ?? 'Activo desde CxP'),
          categoryKey: String(payload.categoryKey ?? 'CAT-OTHER'),
          acquisitionDate: String(payload.invoiceDate ?? new Date().toISOString().slice(0, 10)),
          acquisitionCost: Number(payload.totalAmount ?? payload.amount ?? 0),
          supplierKey: payload.supplierKey ? String(payload.supplierKey) : undefined,
          sourceDocumentKey: payload.invoiceKey ? String(payload.invoiceKey) : undefined,
          sourceModule: 'accounts_payable',
          autoActivate: true,
        });
      }

      if (event.eventType === EVENT_TYPES.EIMS_MOVEMENT_POSTED) {
        const isCapitalAsset = Boolean(payload.isCapitalAsset ?? payload.fixedAsset);
        if (!isCapitalAsset) return;

        await this.assets.register(event.organizationId, 'fa-bridge', {
          name: String(payload.itemName ?? payload.description ?? 'Activo desde inventario'),
          categoryKey: String(payload.categoryKey ?? 'CAT-MACH'),
          acquisitionDate: String(payload.movementDate ?? new Date().toISOString().slice(0, 10)),
          acquisitionCost: Number(payload.totalCost ?? payload.amount ?? 0),
          sourceDocumentKey: payload.movementKey ? String(payload.movementKey) : undefined,
          sourceModule: 'inventory',
          autoActivate: true,
        });
      }
    } catch (err) {
      this.logger.warn(`EFM FA bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
