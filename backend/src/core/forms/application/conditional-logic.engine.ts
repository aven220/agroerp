import { Injectable } from '@nestjs/common';
import { ConditionalRule } from '@agroerp/shared';

@Injectable()
export class ConditionalLogicEngine {
  isVisible(
    rules: ConditionalRule | ConditionalRule[] | undefined,
    data: Record<string, unknown>,
  ): boolean {
    if (!rules) return true;
    const list = Array.isArray(rules) ? rules : [rules];
    return list.every((rule) => this.evaluate(rule, data));
  }

  isRequired(
    baseRequired: boolean | undefined,
    rules: ConditionalRule | ConditionalRule[] | undefined,
    data: Record<string, unknown>,
  ): boolean {
    if (rules) {
      return this.isVisible(rules, data);
    }
    return baseRequired === true;
  }

  evaluate(rule: ConditionalRule, data: Record<string, unknown>): boolean {
    const fieldValue = data[rule.field];
    const hasValue =
      fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    switch (rule.operator) {
      case 'empty':
        return !hasValue;
      case 'not_empty':
        return hasValue;
      case 'eq':
        return this.compare(fieldValue, rule.value) === 0;
      case 'neq':
        return this.compare(fieldValue, rule.value) !== 0;
      case 'gt':
        return Number(fieldValue) > Number(rule.value);
      case 'gte':
        return Number(fieldValue) >= Number(rule.value);
      case 'lt':
        return Number(fieldValue) < Number(rule.value);
      case 'lte':
        return Number(fieldValue) <= Number(rule.value);
      case 'in':
        return (
          Array.isArray(rule.value) &&
          rule.value.some((v) => this.compare(fieldValue, v) === 0)
        );
      case 'not_in':
        return (
          Array.isArray(rule.value) &&
          !rule.value.some((v) => this.compare(fieldValue, v) === 0)
        );
      default:
        return true;
    }
  }

  private compare(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }
}
