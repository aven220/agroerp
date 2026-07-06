import { Injectable } from '@nestjs/common';
import {
  ConditionalOperator,
  WorkflowRuleCondition,
  WorkflowRuleGroup,
  WorkflowRuleNode,
} from '@agroerp/shared';

export interface WorkflowEvaluationContext {
  instance: Record<string, unknown>;
  resource?: Record<string, unknown> | null;
  transition?: Record<string, unknown>;
  actor?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  recentEvents?: string[];
}

@Injectable()
export class WorkflowRuleEngine {
  evaluate(group: WorkflowRuleGroup | undefined, ctx: WorkflowEvaluationContext): boolean {
    if (!group) return true;

    if (group.if !== undefined) {
      const condition = this.evaluateNode(group.if, ctx);
      const branch = condition
        ? this.normalizeNodes(group.then)
        : this.normalizeNodes(group.else);
      if (branch.length === 0) return condition;
      return branch.every((node) => this.evaluateNode(node, ctx));
    }

    if (group.all?.length) {
      return group.all.every((node) => this.evaluateNode(node, ctx));
    }

    if (group.any?.length) {
      return group.any.some((node) => this.evaluateNode(node, ctx));
    }

    return true;
  }

  private normalizeNodes(
    nodes?: WorkflowRuleNode | WorkflowRuleNode[],
  ): WorkflowRuleNode[] {
    if (!nodes) return [];
    return Array.isArray(nodes) ? nodes : [nodes];
  }

  private evaluateNode(node: WorkflowRuleNode, ctx: WorkflowEvaluationContext): boolean {
    if (this.isCondition(node)) {
      return this.evaluateCondition(node, ctx);
    }

    if ('type' in node && node.type === 'event') {
      const events = ctx.recentEvents ?? [];
      if (!events.includes(node.eventType)) return false;
      return true;
    }

    return this.evaluate(node as WorkflowRuleGroup, ctx);
  }

  private isCondition(node: WorkflowRuleNode): node is WorkflowRuleCondition {
    return 'type' in node && node.type === 'condition';
  }

  private evaluateCondition(
    rule: WorkflowRuleCondition,
    ctx: WorkflowEvaluationContext,
  ): boolean {
    const value = this.resolveField(rule.field, ctx);
    const expected = rule.value;

    switch (rule.operator as ConditionalOperator | 'contains' | 'matches') {
      case 'empty':
        return value === undefined || value === null || value === '';
      case 'not_empty':
        return value !== undefined && value !== null && value !== '';
      case 'eq':
        return value === expected;
      case 'neq':
        return value !== expected;
      case 'gt':
        return Number(value) > Number(expected);
      case 'gte':
        return Number(value) >= Number(expected);
      case 'lt':
        return Number(value) < Number(expected);
      case 'lte':
        return Number(value) <= Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(value);
      case 'contains':
        return String(value).includes(String(expected));
      case 'matches':
        return new RegExp(String(expected)).test(String(value));
      default:
        return true;
    }
  }

  private resolveField(path: string, ctx: WorkflowEvaluationContext): unknown {
    const roots: Record<string, unknown> = {
      instance: ctx.instance,
      resource: ctx.resource ?? {},
      transition: ctx.transition ?? {},
      actor: ctx.actor ?? {},
      variables: ctx.variables ?? {},
      context: ctx.variables ?? {},
    };

    const [root, ...rest] = path.split('.');
    let current: unknown = roots[root] ?? this.getNested(ctx.instance, path);

    if (rest.length > 0 && roots[root] !== undefined) {
      current = roots[root];
      for (const segment of rest) {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[segment];
      }
    }

    return current;
  }

  private getNested(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      if (typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, obj);
  }
}
