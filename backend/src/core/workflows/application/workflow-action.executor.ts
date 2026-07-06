import { Injectable, Logger } from '@nestjs/common';
import {
  EVENT_TYPES,
  WorkflowActionDefinition,
  WorkflowNotificationDefinition,
} from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { ResourcesService } from '@/core/resource-engine/application/resources.service';
import { WorkflowAssignmentResolver } from './workflow-assignment.resolver';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface ActionExecutionContext {
  organizationId: string;
  instanceId: string;
  transitionKey: string;
  fromState: string;
  toState: string;
  resourceId?: string | null;
  variables?: Record<string, unknown>;
  actorId?: string;
  ctx?: Partial<RequestContext>;
}

@Injectable()
export class WorkflowActionExecutor {
  private readonly logger = new Logger(WorkflowActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly resources: ResourcesService,
    private readonly assignmentResolver: WorkflowAssignmentResolver,
  ) {}

  async executeActions(
    actions: WorkflowActionDefinition[] | undefined,
    execCtx: ActionExecutionContext,
  ) {
    if (!actions?.length) return;

    for (const action of actions) {
      await this.executeOne(action, execCtx);
    }
  }

  async queueNotifications(
    notifications: WorkflowNotificationDefinition[] | undefined,
    execCtx: ActionExecutionContext,
    resource?: { ownerId?: string | null } | null,
  ) {
    if (!notifications?.length) return;

    for (const notif of notifications) {
      const recipientIds = await this.assignmentResolver.resolve(
        notif.recipients,
        {
          organizationId: execCtx.organizationId,
          resource: resource ?? undefined,
          variables: execCtx.variables,
          startedBy: execCtx.actorId,
        },
      );

      const targets = recipientIds.length
        ? recipientIds
        : [null];

      for (const recipientId of targets) {
        const record = await this.prisma.workflowNotification.create({
          data: {
            instanceId: execCtx.instanceId,
            organizationId: execCtx.organizationId,
            channel: notif.channel,
            recipientId: recipientId ?? undefined,
            subject: notif.subject,
            body: notif.template,
            payload: {
              transitionKey: execCtx.transitionKey,
              template: notif.template,
            },
          },
        });

        await this.core.emitWorkflowNotificationQueued(
          execCtx.organizationId,
          execCtx.instanceId,
          {
            notificationId: record.id,
            channel: notif.channel,
            recipientId,
          },
          { ctx: execCtx.ctx },
        );
      }
    }
  }

  private async executeOne(
    action: WorkflowActionDefinition,
    execCtx: ActionExecutionContext,
  ) {
    switch (action.type) {
      case 'emit_event':
        await this.core.emitWorkflowActionExecuted(
          execCtx.organizationId,
          execCtx.instanceId,
          {
            actionType: action.type,
            eventType: action.config.eventType,
            payload: action.config.payload ?? {},
            transitionKey: execCtx.transitionKey,
          },
          { ctx: execCtx.ctx },
        );
        break;

      case 'update_resource':
        if (execCtx.resourceId && action.config.data) {
          await this.resources.update(
            execCtx.organizationId,
            execCtx.resourceId,
            {
              data: action.config.data as Record<string, unknown>,
              status: action.config.status as string | undefined,
            },
            execCtx.actorId ?? 'system',
            execCtx.ctx as RequestContext | undefined,
          );
        }
        break;

      case 'send_notification':
        await this.queueNotifications(
          [
            {
              channel: (action.config.channel as WorkflowNotificationDefinition['channel']) ?? 'internal',
              template: action.config.template as string | undefined,
              subject: action.config.subject as string | undefined,
              recipients: action.config.recipients as WorkflowNotificationDefinition['recipients'],
            },
          ],
          execCtx,
        );
        break;

      case 'create_audit':
        await this.core.emitUserAction(
          execCtx.organizationId,
          'WorkflowInstance',
          execCtx.instanceId,
          EVENT_TYPES.WORKFLOW_ACTION_EXECUTED,
          {
            actionType: action.type,
            config: action.config,
            transitionKey: execCtx.transitionKey,
          },
          { ctx: execCtx.ctx },
        );
        break;

      case 'webhook':
      case 'generate_pdf':
      case 'call_api':
      case 'run_ai':
      case 'create_task':
        await this.core.emitWorkflowActionExecuted(
          execCtx.organizationId,
          execCtx.instanceId,
          {
            actionType: action.type,
            config: action.config,
            transitionKey: execCtx.transitionKey,
            deferred: true,
          },
          { ctx: execCtx.ctx },
        );
        this.logger.log(
          `Deferred workflow action ${action.type} for instance ${execCtx.instanceId}`,
        );
        break;

      default:
        this.logger.warn(`Unknown workflow action type: ${action.type}`);
    }
  }
}
