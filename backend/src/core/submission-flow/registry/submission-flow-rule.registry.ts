import type { SubmissionFlowRule } from '../interfaces/submission-flow-rule';
import { createEntityRule } from '../domain/flow-rules/create-entity.rule';
import { updateEntityRule } from '../domain/flow-rules/update-entity.rule';
import { appendChildRule } from '../domain/flow-rules/append-child.rule';
import { registerEventRule } from '../domain/flow-rules/create-event.rule';

const RULES: SubmissionFlowRule[] = [
  registerEventRule,
  updateEntityRule,
  appendChildRule,
  createEntityRule,
];

export function getSubmissionFlowRules(): SubmissionFlowRule[] {
  return [...RULES].sort((a, b) => b.priority - a.priority);
}

export function registerSubmissionFlowRule(rule: SubmissionFlowRule): void {
  if (RULES.some((existing) => existing.id === rule.id)) return;
  RULES.push(rule);
}

export function unregisterSubmissionFlowRule(ruleId: string): void {
  const index = RULES.findIndex((rule) => rule.id === ruleId);
  if (index >= 0) RULES.splice(index, 1);
}
