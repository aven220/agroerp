import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const HCM_PY_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_TA_NOVELTY_DECIDED,
  EVENT_TYPES.HCM_PY_RUN_APPROVED,
  EVENT_TYPES.HCM_PY_RUN_PAID,
  EVENT_TYPES.HCM_PY_SETTLEMENT_CALCULATED,
]);

@Injectable()
export class HcmPyEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmPyEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM Payroll event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_PY_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.HCM_TA_NOVELTY_DECIDED && payload.approved) {
        const period = payload.payrollPeriod as string | undefined;
        if (period) {
          await this.prisma.hcmTaTimeNovelty.updateMany({
            where: { organizationId: event.organizationId, noveltyKey: event.aggregateId },
            data: { payrollReady: true, payrollPeriod: period },
          });
        }
      }

      if (event.eventType === EVENT_TYPES.HCM_PY_RUN_APPROVED) {
        await this.prisma.hcmPyRun.updateMany({
          where: { organizationId: event.organizationId, runKey: event.aggregateId },
          data: { metadata: { treasuryQueued: true, accountingQueued: true, syncedAt: new Date().toISOString() } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_PY_RUN_PAID) {
        await this.prisma.hcmPyRun.updateMany({
          where: { organizationId: event.organizationId, runKey: event.aggregateId },
          data: { metadata: { treasuryPaid: true, paidSyncedAt: new Date().toISOString() } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_PY_SETTLEMENT_CALCULATED) {
        await this.prisma.hcmPySettlement.updateMany({
          where: { organizationId: event.organizationId, settlementKey: event.aggregateId },
          data: { metadata: { workflowQueued: true } },
        });
      }
    } catch (err) {
      this.logger.warn(`HCM PY bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
