import { Injectable } from '@nestjs/common';
import { WorkflowRuleGroup } from '@agroerp/shared';
import { WorkflowRuleEngine } from '@/core/workflows/application/workflow-rule.engine';

@Injectable()
export class EneacRuleEngine {
  private readonly engine = new WorkflowRuleEngine();

  evaluate(
    group: WorkflowRuleGroup | undefined,
    ctx: {
      variables?: Record<string, unknown>;
      userId?: string;
      eventType?: string;
    },
  ) {
    return this.engine.evaluate(group, {
      instance: { eventType: ctx.eventType },
      variables: ctx.variables,
      actor: ctx.userId ? { userId: ctx.userId } : undefined,
    });
  }
}
