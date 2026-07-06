import { Injectable } from '@nestjs/common';
import { WorkflowRuleGroup } from '@agroerp/shared';
import {
  WorkflowEvaluationContext,
  WorkflowRuleEngine,
} from '@/core/workflows/application/workflow-rule.engine';

export interface BreEvaluationContext extends WorkflowEvaluationContext {
  event?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  api?: Record<string, unknown>;
  geo?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  computed?: Record<string, unknown>;
  now?: Date;
}

@Injectable()
export class BreRuleEngine {
  constructor(private readonly workflowEngine: WorkflowRuleEngine) {}

  evaluate(conditions: WorkflowRuleGroup | undefined, ctx: BreEvaluationContext): boolean {
    const wfCtx: WorkflowEvaluationContext = {
      instance: {
        ...ctx.instance,
        event: ctx.event ?? {},
        payload: ctx.payload ?? {},
        api: ctx.api ?? {},
        geo: ctx.geo ?? {},
        ai: ctx.ai ?? {},
        computed: ctx.computed ?? {},
        now: (ctx.now ?? new Date()).toISOString(),
      },
      resource: ctx.resource,
      transition: ctx.transition,
      actor: ctx.actor,
      variables: {
        ...(ctx.variables ?? {}),
        ...(ctx.computed ?? {}),
        payload: ctx.payload ?? {},
        event: ctx.event ?? {},
        api: ctx.api ?? {},
        geo: ctx.geo ?? {},
        ai: ctx.ai ?? {},
      },
      recentEvents: ctx.recentEvents,
    };
    return this.workflowEngine.evaluate(conditions, wfCtx);
  }
}
