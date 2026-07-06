import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const HCM_SS_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_SS_EXAM_COMPLETED,
  EVENT_TYPES.HCM_SS_RISK_ASSESSED,
  EVENT_TYPES.HCM_SS_PPE_DELIVERED,
  EVENT_TYPES.HCM_SS_MITIGATION_CREATED,
  EVENT_TYPES.HCM_SS_INCIDENT_REPORTED,
  EVENT_TYPES.HCM_SS_INSPECTION_COMPLETED,
  EVENT_TYPES.HCM_SS_WELLBEING_CREATED,
  EVENT_TYPES.HCM_TD_ENROLLMENT_CREATED,
]);

@Injectable()
export class HcmSsEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmSsEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM SST event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_SS_BRIDGE_EVENTS.has(event.eventType)) return;

    try {
      if (event.eventType === EVENT_TYPES.HCM_SS_EXAM_COMPLETED) {
        await this.prisma.hcmSsMedicalExam.updateMany({
          where: { organizationId: event.organizationId, examKey: event.aggregateId },
          data: { metadata: { employeeFileSynced: true, documentQueued: true, workflowCompleted: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_RISK_ASSESSED) {
        await this.prisma.hcmSsRiskAssessment.updateMany({
          where: { organizationId: event.organizationId, assessmentKey: event.aggregateId },
          data: { metadata: { dashboardQueued: true, workflowQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_PPE_DELIVERED) {
        await this.prisma.hcmSsPpeDelivery.updateMany({
          where: { organizationId: event.organizationId, deliveryKey: event.aggregateId },
          data: { metadata: { employeeFileSynced: true, documentQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_MITIGATION_CREATED) {
        await this.prisma.hcmSsMitigationPlan.updateMany({
          where: { organizationId: event.organizationId, planKey: event.aggregateId },
          data: { metadata: { trainingQueued: true, workflowQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_INCIDENT_REPORTED) {
        await this.prisma.hcmSsIncident.updateMany({
          where: { organizationId: event.organizationId, incidentKey: event.aggregateId },
          data: { metadata: { workflowQueued: true, notificationQueued: true, employeeFileSynced: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_INSPECTION_COMPLETED) {
        await this.prisma.hcmSsInspection.updateMany({
          where: { organizationId: event.organizationId, inspectionKey: event.aggregateId },
          data: { metadata: { documentQueued: true, dashboardQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_SS_WELLBEING_CREATED) {
        await this.prisma.hcmSsWellbeingProgram.updateMany({
          where: { organizationId: event.organizationId, programKey: event.aggregateId },
          data: { metadata: { payrollBenefitQueued: true, notificationQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TD_ENROLLMENT_CREATED) {
        this.logger.debug(`SST linked training enrollment ${event.aggregateId}`);
      }
    } catch (err) {
      this.logger.warn(`HCM SS bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
