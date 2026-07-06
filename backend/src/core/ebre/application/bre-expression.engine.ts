import { Injectable } from '@nestjs/common';
import { BreExpressionDefinition } from '@agroerp/shared';

@Injectable()
export class BreExpressionEngine {
  evaluateAll(
    expressions: BreExpressionDefinition[] | undefined,
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!expressions?.length) return result;

    for (const expr of expressions) {
      try {
        result[expr.key] = this.evaluate(expr, context);
      } catch {
        result[expr.key] = null;
      }
    }
    return result;
  }

  evaluate(expr: BreExpressionDefinition, context: Record<string, unknown>): unknown {
    const value = expr.expression.trim();

    if (expr.type === 'date' || value.startsWith('date:')) {
      return this.evalDate(value.replace(/^date:/, ''), context);
    }
    if (expr.type === 'geo' || value.startsWith('geo:')) {
      return this.evalGeo(value.replace(/^geo:/, ''), context);
    }
    if (expr.type === 'api' || value.startsWith('api:')) {
      const path = value.replace(/^api:/, '');
      return this.getPath(context.api as Record<string, unknown>, path);
    }
    if (expr.type === 'ai' || value.startsWith('ai:')) {
      const path = value.replace(/^ai:/, '');
      return this.getPath(context.ai as Record<string, unknown>, path);
    }
    if (expr.type === 'string' || !/[\+\-\*\/]/.test(value)) {
      return this.interpolate(value, context);
    }
    return this.evalMath(value, context);
  }

  private evalMath(expression: string, context: Record<string, unknown>): number {
    const resolved = expression.replace(/\{([^}]+)\}/g, (_, path: string) => {
      const v = this.getPath(context, path.trim());
      return String(Number(v) || 0);
    });
    if (!/^[\d\s+\-*/().]+$/.test(resolved)) {
      throw new Error('Invalid math expression');
    }
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${resolved})`)() as number;
  }

  private evalDate(expression: string, context: Record<string, unknown>): unknown {
    const now = context.now ? new Date(String(context.now)) : new Date();
    if (expression === 'now') return now.toISOString();
    if (expression === 'today') return now.toISOString().slice(0, 10);
    if (expression.startsWith('hour')) return now.getHours();
    if (expression.startsWith('weekday')) return now.getDay();
    const match = /^addDays\(([^,]+),(-?\d+)\)$/.exec(expression);
    if (match) {
      const base = new Date(String(this.interpolate(match[1], context)));
      base.setDate(base.getDate() + Number(match[2]));
      return base.toISOString();
    }
    return this.interpolate(expression, context);
  }

  private evalGeo(expression: string, context: Record<string, unknown>): unknown {
    const geo = (context.geo ?? context.payload ?? {}) as Record<string, unknown>;
    if (expression === 'inside_geofence') return geo.insideGeofence === true;
    if (expression === 'distance_km') return Number(geo.distanceKm ?? 0);
    return this.getPath(geo, expression);
  }

  private interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{([^}]+)\}/g, (_, path: string) => {
      const v = this.getPath(context, path.trim());
      return v === undefined || v === null ? '' : String(v);
    });
  }

  private getPath(obj: Record<string, unknown> | undefined, path: string): unknown {
    if (!obj) return undefined;
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, obj);
  }
}
