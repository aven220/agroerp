import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EmfgIntegrationService } from './emfg-integration.service';

const EMFG_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.EMFG_ORDER_STATUS_CHANGED,
  EVENT_TYPES.EMFG_ORDER_PROGRESS_RECORDED,
  EVENT_TYPES.EMFG_ORDER_RELEASED,
]);

@Injectable()
export class EmfgEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EmfgEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
    private readonly integration: EmfgIntegrationService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EMFG event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!EMFG_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.EMFG_ORDER_STATUS_CHANGED && payload.status === 'completed') {
        const order = await this.prisma.emfgProductionOrder.findUnique({
          where: { organizationId_orderKey: { organizationId: event.organizationId, orderKey: event.aggregateId } },
        });
        if (order) {
          await this.integration.onOrderCompleted(event.organizationId, order.orderKey, order.itemKey, order.producedQty);
        }
      }

      if (event.eventType === EVENT_TYPES.EMFG_ORDER_RELEASED) {
        await this.prisma.emfgProductionOrder.updateMany({
          where: { organizationId: event.organizationId, orderKey: event.aggregateId },
          data: { metadata: { workflowCompleted: false, inventorySynced: false } },
        });
      }
    } catch (err) {
      this.logger.warn(`EMFG bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
