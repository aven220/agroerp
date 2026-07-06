import { Injectable, Logger } from '@nestjs/common';
import { BreActionDefinition, EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { ResourcesService } from '@/core/resource-engine/application/resources.service';

export interface BreActionContext {
  organizationId: string;
  ruleKey: string;
  ruleId: string;
  eventType?: string;
  payload?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  actorId?: string;
}

@Injectable()
export class BreActionExecutor {
  private readonly logger = new Logger(BreActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly resources: ResourcesService,
  ) {}

  async executeAll(actions: BreActionDefinition[] | undefined, ctx: BreActionContext) {
    const executed: Array<{ type: string; success: boolean; error?: string }> = [];
    if (!actions?.length) return executed;

    for (const action of actions) {
      try {
        await this.executeOne(action, ctx);
        executed.push({ type: action.type, success: true });
      } catch (err) {
        const message = (err as Error).message;
        executed.push({ type: action.type, success: false, error: message });
        if (action.stopOnError) throw err;
      }
    }
    return executed;
  }

  private async executeOne(action: BreActionDefinition, ctx: BreActionContext) {
    const config = action.config ?? {};
    switch (action.type) {
      case 'create_record':
        await this.resources.create(
          ctx.organizationId,
          {
            resourceType: String(config.resourceType ?? 'generic_entity'),
            data: (config.data ?? {}) as Record<string, unknown>,
            status: config.status as string | undefined,
          },
          ctx.actorId ?? 'bre-engine',
        );
        break;

      case 'update_record':
        if (config.resourceId) {
          await this.resources.update(
            ctx.organizationId,
            String(config.resourceId),
            {
              data: (config.data ?? {}) as Record<string, unknown>,
              status: config.status as string | undefined,
            },
            ctx.actorId ?? 'bre-engine',
          );
        }
        break;

      case 'delete_record':
        if (config.resourceId) {
          await this.prisma.resource.update({
            where: { id: String(config.resourceId) },
            data: { deletedAt: new Date(), status: 'deleted' },
          });
        }
        break;

      case 'send_notification':
        await this.prisma.notificationMessage.create({
          data: {
            organizationId: ctx.organizationId,
            title: String(config.title ?? `Regla: ${ctx.ruleKey}`),
            body: String(config.body ?? JSON.stringify(ctx.payload ?? {}).slice(0, 500)),
            alertSeverity: (String(config.severity ?? 'info')) as 'info',
            channel: 'internal',
            status: 'unread',
            sourceEventType: ctx.eventType,
            payload: { ruleKey: ctx.ruleKey, ...(ctx.payload ?? {}) } as object,
          },
        });
        break;

      case 'send_email':
        await this.prisma.notificationMessage.create({
          data: {
            organizationId: ctx.organizationId,
            title: String(config.subject ?? ctx.ruleKey),
            body: String(config.body ?? ''),
            alertSeverity: 'info',
            channel: 'email',
            status: 'unread',
            payload: { to: config.to, ruleKey: ctx.ruleKey } as object,
          },
        }).catch(() => undefined);
        break;

      case 'create_task':
        if (config.userId && config.instanceId) {
          await this.prisma.workflowAssignment.create({
            data: {
              organizationId: ctx.organizationId,
              instanceId: String(config.instanceId),
              userId: String(config.userId),
              stateKey: String(config.stateKey ?? 'pending'),
              status: 'pending',
              dueAt: config.dueAt ? new Date(String(config.dueAt)) : undefined,
              metadata: { source: 'ebre', ruleKey: ctx.ruleKey } as object,
            },
          }).catch(() => undefined);
        }
        break;

      case 'start_workflow':
        await this.core.emitUserAction(
          ctx.organizationId,
          'BusinessRule',
          ctx.ruleId,
          EVENT_TYPES.WORKFLOW_STARTED,
          {
            workflowKey: config.workflowKey,
            resourceId: config.resourceId,
            variables: config.variables ?? ctx.variables,
            deferred: true,
          },
        );
        break;

      case 'generate_document':
      case 'call_api':
        await this.core.emitUserAction(
          ctx.organizationId,
          'BusinessRule',
          ctx.ruleId,
          EVENT_TYPES.USER_ACTION_EXECUTED,
          { actionType: action.type, config, ruleKey: ctx.ruleKey, deferred: true },
        );
        break;

      case 'invoke_ai':
        await this.core.emitUserAction(
          ctx.organizationId,
          'BusinessRule',
          ctx.ruleId,
          EVENT_TYPES.USER_ACTION_EXECUTED,
          {
            actionType: 'invoke_ai',
            promptKey: config.promptKey,
            serviceType: config.serviceType ?? 'explanation',
            context: ctx.payload,
            ruleKey: ctx.ruleKey,
          },
        );
        break;

      case 'update_kpi':
        await this.core.emitUserAction(
          ctx.organizationId,
          'BusinessRule',
          ctx.ruleId,
          EVENT_TYPES.LOT_KPI_CALCULATED,
          { kpiKey: config.kpiKey, value: config.value, ruleKey: ctx.ruleKey },
        );
        break;

      case 'audit':
        await this.core.emitUserAction(
          ctx.organizationId,
          'BusinessRule',
          ctx.ruleId,
          EVENT_TYPES.USER_ACTION_EXECUTED,
          {
            actionType: 'bre_audit',
            message: config.message ?? `Regla ${ctx.ruleKey} ejecutada`,
            details: config,
          },
        );
        break;

      case 'emit_event':
        await this.core.emitUserAction(
          ctx.organizationId,
          String(config.aggregateType ?? 'BusinessRule'),
          String(config.aggregateId ?? ctx.ruleId),
          String(config.eventType ?? EVENT_TYPES.USER_ACTION_EXECUTED),
          (config.payload ?? ctx.payload ?? {}) as Record<string, unknown>,
        );
        break;

      case 'set_variable':
        if (ctx.variables && config.key) {
          ctx.variables[String(config.key)] = config.value;
        }
        break;

      default:
        this.logger.warn(`Unknown BRE action type: ${action.type}`);
    }
  }
}
