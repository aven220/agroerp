export interface KpiAlertRule {
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';
  threshold: number;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
}

export class BiKpiEngine {
  evaluateAlerts(
    value: number,
    target: number | null | undefined,
    rules: KpiAlertRule[],
  ): Array<{ triggered: boolean; severity: string; message: string }> {
    const alerts: Array<{ triggered: boolean; severity: string; message: string }> = [];
    for (const rule of rules) {
      const threshold = rule.threshold;
      let triggered = false;
      switch (rule.operator) {
        case 'lt':
          triggered = value < threshold;
          break;
        case 'lte':
          triggered = value <= threshold;
          break;
        case 'gt':
          triggered = value > threshold;
          break;
        case 'gte':
          triggered = value >= threshold;
          break;
        case 'eq':
          triggered = value === threshold;
          break;
        case 'neq':
          triggered = value !== threshold;
          break;
      }
      if (triggered) {
        alerts.push({
          triggered: true,
          severity: rule.severity ?? 'warning',
          message: rule.message ?? `KPI ${rule.operator} ${threshold}`,
        });
      }
    }
    if (target != null && target > 0) {
      const variancePct = ((value - target) / target) * 100;
      if (variancePct < -20) {
        alerts.push({
          triggered: true,
          severity: 'critical',
          message: `Desviación crítica: ${variancePct.toFixed(1)}% bajo meta`,
        });
      } else if (variancePct < -10) {
        alerts.push({
          triggered: true,
          severity: 'warning',
          message: `Desviación: ${variancePct.toFixed(1)}% bajo meta`,
        });
      }
    }
    return alerts;
  }

  computeVariance(value: number, target: number | null | undefined): number | null {
    if (target == null || target === 0) return null;
    return Number((((value - target) / target) * 100).toFixed(2));
  }
}
