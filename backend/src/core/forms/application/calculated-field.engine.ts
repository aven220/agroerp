import { Injectable } from '@nestjs/common';
import { FormFieldDefinition } from '@agroerp/shared';

const SAFE_EXPRESSION = /^[\d\s+\-*/().{}a-zA-Z_]+$/;

@Injectable()
export class CalculatedFieldEngine {
  resolve(
    fields: FormFieldDefinition[],
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved = { ...data };

    for (const field of fields) {
      if (field.type !== 'calculated' || !field.calculate) continue;

      const missing = field.calculate.dependsOn.some(
        (key) => resolved[key] === undefined || resolved[key] === null,
      );
      if (missing) continue;

      try {
        resolved[field.key] = this.evaluateExpression(
          field.calculate.expression,
          resolved,
        );
      } catch {
        // Skip invalid calculated fields; validation will catch if required
      }
    }

    return resolved;
  }

  private evaluateExpression(
    expression: string,
    data: Record<string, unknown>,
  ): number {
    let expr = expression;
    for (const [key, value] of Object.entries(data)) {
      const token = `{${key}}`;
      if (expr.includes(token)) {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new Error(`Calculated field dependency "${key}" is not numeric`);
        }
        expr = expr.split(token).join(String(num));
      }
    }

    if (!SAFE_EXPRESSION.test(expr)) {
      throw new Error('Unsafe calculated expression');
    }

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result !== 'number' || Number.isNaN(result)) {
      throw new Error('Calculated expression did not return a number');
    }
    return result;
  }
}
