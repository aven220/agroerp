import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const HCM_RC_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_RC_OFFER_ACCEPTED,
  EVENT_TYPES.HCM_RC_VACANCY_APPROVED,
  EVENT_TYPES.HCM_RC_INTERVIEW_SCHEDULED,
  EVENT_TYPES.HCM_RC_ONBOARDING_COMPLETED,
  EVENT_TYPES.HCM_EMPLOYEE_HIRED,
]);

@Injectable()
export class HcmRcEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmRcEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM RC event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_RC_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.HCM_RC_OFFER_ACCEPTED) {
        const employeeKey = String(payload.employeeKey ?? '');
        const iamRoleKeys = payload.iamRoleKeys as string[] | undefined;
        if (employeeKey && iamRoleKeys?.length) {
          await this.prisma.hcmEmployee.updateMany({
            where: { organizationId: event.organizationId, employeeKey },
            data: { metadata: { iamRoleKeys, provisionedAt: new Date().toISOString() } },
          });
        }
      }

      if (event.eventType === EVENT_TYPES.HCM_RC_VACANCY_APPROVED) {
        await this.prisma.hcmRcVacancy.updateMany({
          where: { organizationId: event.organizationId, vacancyKey: event.aggregateId },
          data: { metadata: { workflowApprovedAt: new Date().toISOString() } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_RC_INTERVIEW_SCHEDULED) {
        await this.prisma.hcmRcInterview.updateMany({
          where: { organizationId: event.organizationId, interviewKey: event.aggregateId },
          data: { metadata: { calendarSynced: true, syncedAt: new Date().toISOString() } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_RC_ONBOARDING_COMPLETED) {
        const plan = await this.prisma.hcmRcOnboardingPlan.findFirst({
          where: { organizationId: event.organizationId, planKey: event.aggregateId },
        });
        if (plan?.employeeKey) {
          await this.prisma.hcmEmployee.updateMany({
            where: { organizationId: event.organizationId, employeeKey: plan.employeeKey },
            data: { metadata: { onboardingCompleted: true, onboardingPlanKey: plan.planKey } },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`HCM RC bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
