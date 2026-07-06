import { Injectable, Logger, Optional } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { BreExecutorService } from '@/core/ebre/application/bre-executor.service';

@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    @Optional() private readonly bre?: BreExecutorService,
  ) {}

  async execute(
    organizationId: string,
    job: {
      id: string;
      jobKey: string;
      handlerType: string;
      payload: unknown;
    },
    triggeredBy?: string,
  ): Promise<Record<string, unknown>> {
    const payload = (job.payload ?? {}) as Record<string, unknown>;

    switch (job.handlerType) {
      case 'workflow.trigger':
        await this.core.emitUserAction(
          organizationId,
          'Job',
          job.id,
          EVENT_TYPES.WORKFLOW_STARTED,
          {
            workflowKey: payload.workflowKey,
            resourceId: payload.resourceId,
            variables: payload.variables,
          },
        );
        return { triggered: 'workflow' };

      case 'notification.send':
        await this.prisma.notificationMessage.create({
          data: {
            organizationId,
            title: String(payload.title ?? `Job ${job.jobKey}`),
            body: String(payload.body ?? ''),
            alertSeverity: (String(payload.severity ?? 'info')) as 'info',
            channel: 'internal',
            status: 'unread',
            payload: { jobKey: job.jobKey } as object,
          },
        });
        return { sent: true };

      case 'ai.invoke':
        await this.core.emitUserAction(
          organizationId,
          'Job',
          job.id,
          EVENT_TYPES.USER_ACTION_EXECUTED,
          {
            actionType: 'ai.invoke',
            serviceType: payload.serviceType ?? 'explanation',
            promptKey: payload.promptKey,
          },
        );
        return { queued: 'ai' };

      case 'bre.evaluate':
        if (this.bre && payload.ruleKey) {
          const rule = await this.prisma.breBusinessRule.findFirst({
            where: { organizationId, ruleKey: String(payload.ruleKey), deletedAt: null },
            include: { decisionTable: true },
          });
          if (rule) {
            const result = await this.bre.executeRule(rule, {
              eventType: String(payload.eventType ?? 'JobScheduled'),
              payload: (payload.context as Record<string, unknown>) ?? {},
              actorId: triggeredBy,
              dryRun: false,
            });
            return result as unknown as Record<string, unknown>;
          }
        }
        return { skipped: 'bre_rule_not_found' };

      case 'sync.pull':
        await this.core.emitUserAction(
          organizationId,
          'Job',
          job.id,
          EVENT_TYPES.SYNC_COMPLETED,
          { module: payload.module ?? 'all' },
        );
        return { sync: 'triggered' };

      case 'inventory.reconcile':
      case 'purchase.process':
      case 'finance.close':
      case 'contract.reminder':
        await this.core.emitUserAction(
          organizationId,
          'Job',
          job.id,
          EVENT_TYPES.USER_ACTION_EXECUTED,
          { handlerType: job.handlerType, ...payload },
        );
        return { module: job.handlerType };

      case 'webhook.call':
        await this.core.emitUserAction(
          organizationId,
          'Job',
          job.id,
          EVENT_TYPES.EXTERNAL_EVENT_RECEIVED,
          { url: payload.url, method: payload.method ?? 'POST', body: payload.body },
        );
        return { webhook: 'queued' };

      default:
        this.logger.log(`Generic handler for ${job.handlerType}`);
        return { handlerType: job.handlerType, processed: true };
    }
  }
}
