import type { InsightRule } from '../contracts/insight-rule';
import { missingPhotosRule } from '../rules/missing-photos.rule';
import { missingDocumentsRule } from '../rules/missing-documents.rule';
import { pendingFormsRule } from '../rules/pending-forms.rule';
import { inactiveRecordRule } from '../rules/inactive-record.rule';
import { incompleteProfileRule } from '../rules/incomplete-profile.rule';

const RULES: InsightRule[] = [
  missingPhotosRule,
  missingDocumentsRule,
  pendingFormsRule,
  inactiveRecordRule,
  incompleteProfileRule,
];

export function getInsightRules(): InsightRule[] {
  return [...RULES];
}

export function registerInsightRule(rule: InsightRule): void {
  if (RULES.some((existing) => existing.id === rule.id)) return;
  RULES.push(rule);
}

export function unregisterInsightRule(ruleId: string): void {
  const index = RULES.findIndex((rule) => rule.id === ruleId);
  if (index >= 0) RULES.splice(index, 1);
}
