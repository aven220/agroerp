import { Injectable, Logger } from '@nestjs/common';
import {
  BreActionDefinition,
  BreExpressionDefinition,
  EVENT_TYPES,
  WorkflowRuleGroup,
} from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { BreRuleEngine, BreEvaluationContext } from './bre-rule.engine';
import { BreExpressionEngine } from './bre-expression.engine';
import { BreActionExecutor } from './bre-action.executor';
import { BreDecisionService } from './bre-decision.service';

@Injectable()
export class BreExecutorService {
  private readonly logger = new Logger(BreExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly ruleEngine: BreRuleEngine,
    private readonly expressionEngine: BreExpressionEngine,
    private readonly actionExecutor: BreActionExecutor,
    private readonly decisions: BreDecisionService,
  ) {}

  async processDomainEvent(event: DomainEvent) {
    if (
      event.eventType.startsWith('BusinessRule') ||
      event.eventType === EVENT_TYPES.NOTIFICATION_RULE_TRIGGERED
    ) {
      return;
    }

    const rules = await this.prisma.breBusinessRule.findMany({
      where: {
        organizationId: event.organizationId,
        status: 'published',
        deletedAt: null,
        triggerType: 'event',
        eventTypes: { has: event.eventType },
      },
      include: { decisionTable: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    const executedKeys = new Set<string>();
    for (const rule of rules) {
      if (!this.dependenciesMet(rule.dependencies, executedKeys)) continue;
      await this.executeRule(rule, {
        eventType: event.eventType,
        payload: event.payload as Record<string, unknown>,
        event: {
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          userId: event.metadata?.userId,
        },
        actorId: event.metadata?.userId,
        dryRun: false,
      });
      executedKeys.add(rule.ruleKey);
    }
  }

  async executeRule(
    rule: {
      id: string;
      organizationId: string;
      ruleKey: string;
      version: number;
      conditions: unknown;
      expressions: unknown;
      actions: unknown;
      decisionTable?: { rows: unknown; hitPolicy: string } | null;
    },
    options: {
      eventType?: string;
      payload?: Record<string, unknown>;
      event?: Record<string, unknown>;
      variables?: Record<string, unknown>;
      actorId?: string;
      dryRun?: boolean;
    },
  ) {
    const start = Date.now();
    const baseContext: Record<string, unknown> = {
      payload: options.payload ?? {},
      event: options.event ?? {},
      variables: options.variables ?? {},
      now: new Date().toISOString(),
    };

    const computed = this.expressionEngine.evaluateAll(
      rule.expressions as BreExpressionDefinition[],
      baseContext,
    );

    let decisionOutputs: Record<string, unknown>[] = [];
    if (rule.decisionTable) {
      decisionOutputs = this.decisions.evaluate(rule.decisionTable, {
        ...(options.payload ?? {}),
        ...computed,
      });
      computed.decision = decisionOutputs[0] ?? {};
    }

    const evalCtx: BreEvaluationContext = {
      instance: options.payload ?? {},
      payload: options.payload,
      event: options.event,
      variables: options.variables,
      computed,
      actor: options.actorId ? { id: options.actorId } : undefined,
    };

    const conditions = rule.conditions as WorkflowRuleGroup;
    const matched = this.ruleEngine.evaluate(conditions, evalCtx);

    let actionsExecuted: Array<{ type: string; success: boolean; error?: string }> = [];
    let status: 'success' | 'failed' | 'skipped' = matched ? 'success' : 'skipped';
    let error: string | undefined;

    if (matched && !options.dryRun) {
      try {
        actionsExecuted = await this.actionExecutor.executeAll(
          rule.actions as BreActionDefinition[],
          {
            organizationId: rule.organizationId,
            ruleKey: rule.ruleKey,
            ruleId: rule.id,
            eventType: options.eventType,
            payload: options.payload,
            variables: { ...options.variables, ...computed },
            actorId: options.actorId,
          },
        );
        await this.core.emitUserAction(
          rule.organizationId,
          'BusinessRule',
          rule.id,
          EVENT_TYPES.BUSINESS_RULE_EXECUTED,
          { ruleKey: rule.ruleKey, eventType: options.eventType, actions: actionsExecuted.length },
        );
      } catch (err) {
        status = 'failed';
        error = (err as Error).message;
        await this.core.emitUserAction(
          rule.organizationId,
          'BusinessRule',
          rule.id,
          EVENT_TYPES.BUSINESS_RULE_FAILED,
          { ruleKey: rule.ruleKey, error },
        ).catch(() => undefined);
      }
    }

    const durationMs = Date.now() - start;

    if (!options.dryRun) {
      await this.prisma.breRuleExecution.create({
        data: {
          organizationId: rule.organizationId,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          ruleVersion: rule.version,
          eventType: options.eventType,
          status,
          matched,
          actionsExecuted: actionsExecuted as object,
          durationMs,
          error,
          inputContext: {
            payload: options.payload,
            event: options.event,
          } as object,
          outputContext: { computed, decisionOutputs, matched } as object,
        },
      });
    }

    return { matched, computed, decisionOutputs, actionsExecuted, durationMs, status, error };
  }

  private dependenciesMet(dependencies: string[], executed: Set<string>): boolean {
    if (!dependencies?.length) return true;
    return dependencies.every((d) => executed.has(d));
  }
}
