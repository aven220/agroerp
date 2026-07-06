import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const HCM_TD_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_TD_EVALUATION_COMPLETED,
  EVENT_TYPES.HCM_TD_CERTIFICATION_CREATED,
  EVENT_TYPES.HCM_TD_CAREER_PLAN_CREATED,
  EVENT_TYPES.HCM_TD_ENROLLMENT_CREATED,
  EVENT_TYPES.HCM_EMPLOYEE_HIRED,
]);

@Injectable()
export class HcmTdEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmTdEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM Talent Development event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_TD_BRIDGE_EVENTS.has(event.eventType)) return;

    try {
      if (event.eventType === EVENT_TYPES.HCM_TD_EVALUATION_COMPLETED) {
        await this.prisma.hcmTdEvaluation.updateMany({
          where: { organizationId: event.organizationId, evaluationKey: event.aggregateId },
          data: { metadata: { workflowCompleted: true, documentQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TD_CERTIFICATION_CREATED) {
        await this.prisma.hcmTdCertification.updateMany({
          where: { organizationId: event.organizationId, certificationKey: event.aggregateId },
          data: { metadata: { employeeFileSynced: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TD_CAREER_PLAN_CREATED) {
        await this.prisma.hcmTdCareerPlan.updateMany({
          where: { organizationId: event.organizationId, careerKey: event.aggregateId },
          data: { metadata: { orgChartQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TD_ENROLLMENT_CREATED) {
        await this.prisma.hcmTdEnrollment.updateMany({
          where: { organizationId: event.organizationId, enrollmentKey: event.aggregateId },
          data: { metadata: { notificationQueued: true } },
        });
      }
    } catch (err) {
      this.logger.warn(`HCM TD bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
