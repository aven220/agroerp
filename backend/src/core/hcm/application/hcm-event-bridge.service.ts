import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmOrgService } from './hcm-org.service';

const HCM_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_EMPLOYEE_HIRED,
  EVENT_TYPES.HCM_EMPLOYEE_TRANSFERRED,
  EVENT_TYPES.HCM_EMPLOYEE_TERMINATED,
  EVENT_TYPES.HCM_CONTRACT_CREATED,
  EVENT_TYPES.EFM_BG_BUDGET_CREATED,
]);

@Injectable()
export class HcmEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
    private readonly org: HcmOrgService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM event bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.HCM_EMPLOYEE_HIRED || event.eventType === EVENT_TYPES.HCM_EMPLOYEE_TRANSFERRED) {
        await this.org.rebuildOrgChart(event.organizationId, 'hcm-bridge');
      }

      if (event.eventType === EVENT_TYPES.HCM_EMPLOYEE_TERMINATED) {
        const employeeKey = event.aggregateId;
        await this.prisma.hcmContract.updateMany({
          where: { organizationId: event.organizationId, employeeKey, status: 'active' },
          data: { status: 'terminated', terminationDate: new Date() },
        });
        await this.org.rebuildOrgChart(event.organizationId, 'hcm-bridge');
      }

      if (event.eventType === EVENT_TYPES.HCM_CONTRACT_CREATED) {
        const employeeKey = String(payload.employeeKey ?? '');
        if (employeeKey) {
          await this.prisma.hcmEmployee.updateMany({
            where: { organizationId: event.organizationId, employeeKey },
            data: { employmentStatus: 'active' },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`HCM bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
