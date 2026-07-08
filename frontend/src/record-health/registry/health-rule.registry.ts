import type { HealthRule } from '../contracts/health-rule';
import { photosRule } from '../rules/photos.rule';
import { documentsRule } from '../rules/documents.rule';
import { gpsRule } from '../rules/gps.rule';
import { recentActivityRule } from '../rules/recent-activity.rule';
import { completedFormsRule } from '../rules/completed-forms.rule';
import { relationshipsRule } from '../rules/relationships.rule';
import { profileRule } from '../rules/profile.rule';

const RULES: HealthRule[] = [
  photosRule,
  documentsRule,
  gpsRule,
  recentActivityRule,
  completedFormsRule,
  relationshipsRule,
  profileRule,
];

export function getHealthRules(): HealthRule[] {
  return [...RULES];
}

export function registerHealthRule(rule: HealthRule): void {
  if (RULES.some((existing) => existing.id === rule.id)) return;
  RULES.push(rule);
}

export function unregisterHealthRule(ruleId: string): void {
  const index = RULES.findIndex((rule) => rule.id === ruleId);
  if (index >= 0) RULES.splice(index, 1);
}
