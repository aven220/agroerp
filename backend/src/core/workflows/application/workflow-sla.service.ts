import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { WorkflowNotificationDispatcher } from './workflow-notification.dispatcher';

@Injectable()
export class WorkflowSlaService {
  private readonly logger = new Logger(WorkflowSlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly notifications: WorkflowNotificationDispatcher,
  ) {}

  async processOverdue(organizationId: string) {
    const now = new Date();
    const overdueAssignments = await this.prisma.workflowAssignment.findMany({
      where: {
        organizationId,
        status: 'pending',
        dueAt: { lt: now },
      },
      include: {
        instance: {
          include: {
            workflowVersion: true,
            workflowDefinition: { select: { workflowKey: true, name: true } },
          },
        },
      },
      take: 500,
    });

    const escalated = [];
    for (const assignment of overdueAssignments) {
      await this.prisma.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: 'escalated', metadata: { escalatedAt: now.toISOString() } },
      });

      await this.prisma.workflowNotification.create({
        data: {
          instanceId: assignment.instanceId,
          organizationId,
          channel: 'internal',
          recipientId: assignment.userId,
          subject: `Tarea vencida: ${assignment.instance.workflowDefinition?.name ?? 'Proceso'}`,
          body: `La tarea en estado ${assignment.stateKey} ha superado el SLA.`,
          payload: { assignmentId: assignment.id, escalated: true },
        },
      });

      escalated.push(assignment.id);
    }

    const overdueInstances = await this.prisma.workflowInstance.findMany({
      where: {
        organizationId,
        status: 'active',
        dueAt: { lt: now },
      },
      include: { workflowVersion: true },
      take: 200,
    });

    for (const instance of overdueInstances) {
      const schema = instance.workflowVersion.definition as unknown as WorkflowDefinitionSchema;
      const state = schema.states.find((s) => s.key === instance.currentState);
      if (state?.slaHours) {
        this.logger.warn(
          `Instance ${instance.id} overdue in state ${instance.currentState}`,
        );
      }
    }

    if (escalated.length > 0) {
      await this.notifications.dispatchPending(organizationId);
    }

    return {
      escalatedAssignments: escalated.length,
      overdueInstances: overdueInstances.length,
    };
  }
}
