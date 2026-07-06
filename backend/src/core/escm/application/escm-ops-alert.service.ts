import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  ALERT_TYPES,
  computeConversionRate,
  computeGoalCompliance,
  dayRange,
  detectAnomaly,
  generateOpsAlertKey,
  monthRange,
  periodKeyFromDate,
  previousPeriod,
} from '../domain/escm-analytics.engine';

@Injectable()
export class EscmOpsAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string, status?: string) {
    return this.prisma.escmOpsAlert.findMany({
      where: { organizationId, ...(status ? { status: status as 'open' | 'acknowledged' | 'resolved' } : {}) },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });
  }

  async acknowledge(organizationId: string, alertKey: string) {
    const row = await this.prisma.escmOpsAlert.findFirst({ where: { organizationId, alertKey } });
    if (!row) throw new NotFoundException(`Alerta ${alertKey} no encontrada`);
    return this.prisma.escmOpsAlert.update({
      where: { id: row.id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
  }

  async resolve(organizationId: string, alertKey: string) {
    const row = await this.prisma.escmOpsAlert.findFirst({ where: { organizationId, alertKey } });
    if (!row) throw new NotFoundException(`Alerta ${alertKey} no encontrada`);
    return this.prisma.escmOpsAlert.update({
      where: { id: row.id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }

  async evaluate(organizationId: string) {
    const created: string[] = [];
    const checks: Array<Array<{
      alertType: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      entityType?: string;
      entityKey?: string;
      metadata?: Record<string, unknown>;
    }>> = await Promise.all([
      this.checkGoals(organizationId),
      this.checkOverdueAr(organizationId),
      this.checkHighRiskCustomers(organizationId),
      this.checkDelayedOrders(organizationId),
      this.checkSalesDrop(organizationId),
      this.checkBillingAnomaly(organizationId),
      this.checkConversionDrop(organizationId),
    ]);
    for (const alerts of checks) {
      for (const alert of alerts) {
        const key = await this.upsertAlert(organizationId, alert);
        if (key) created.push(key);
      }
    }
    return { evaluated: checks.length, created: created.length, alertKeys: created };
  }

  private async upsertAlert(
    organizationId: string,
    input: {
      alertType: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      entityType?: string;
      entityKey?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const existing = await this.prisma.escmOpsAlert.findFirst({
      where: {
        organizationId,
        alertType: input.alertType,
        entityKey: input.entityKey ?? null,
        status: 'open',
      },
    });
    if (existing) return null;

    const count = await this.prisma.escmOpsAlert.count({ where: { organizationId } });
    const alertKey = generateOpsAlertKey(count + 1);
    await this.prisma.escmOpsAlert.create({
      data: {
        organizationId,
        alertKey,
        alertType: input.alertType,
        severity: input.severity,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityKey: input.entityKey,
        metadata: (input.metadata ?? {}) as object,
      },
    });
    await this.core.emitUserAction(organizationId, 'EscmOpsAlert', alertKey, EVENT_TYPES.ESCM_OPS_ALERT_CREATED, {
      alertType: input.alertType,
      severity: input.severity,
    });
    return alertKey;
  }

  private async checkGoals(organizationId: string) {
    const periodKey = periodKeyFromDate(new Date());
    const targets = await this.prisma.escmSalesTarget.findMany({ where: { organizationId, periodKey } });
    const alerts: Array<{
      alertType: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      entityKey?: string;
    }> = [];
    for (const t of targets) {
      const compliance = computeGoalCompliance(t.actualAmount, t.targetAmount);
      if (compliance < 80) {
        alerts.push({
          alertType: ALERT_TYPES.GOAL_MISSED,
          severity: compliance < 50 ? 'critical' : 'warning',
          title: 'Meta no cumplida',
          message: `Meta ${t.metricKey} (${t.periodKey}): ${compliance}% de cumplimiento`,
          entityKey: t.targetKey,
        });
      }
    }
    return alerts;
  }

  private async checkOverdueAr(organizationId: string) {
    const count = await this.prisma.escmReceivable.count({ where: { organizationId, status: 'overdue' } });
    if (count === 0) return [];
    const agg = await this.prisma.escmReceivable.aggregate({
      where: { organizationId, status: 'overdue' },
      _sum: { balanceAmount: true },
    });
    return [{
      alertType: ALERT_TYPES.OVERDUE_AR,
      severity: (count > 10 ? 'critical' : 'warning') as 'critical' | 'warning',
      title: 'Cartera vencida',
      message: `${count} documentos vencidos por ${agg._sum.balanceAmount ?? 0}`,
    }];
  }

  private async checkHighRiskCustomers(organizationId: string) {
    const critical = await this.prisma.escmReceivable.count({
      where: { organizationId, riskClass: 'critical', status: { in: ['open', 'partial', 'overdue'] } },
    });
    if (critical === 0) return [];
    return [{
      alertType: ALERT_TYPES.HIGH_RISK_CUSTOMER,
      severity: 'critical' as const,
      title: 'Clientes de alto riesgo',
      message: `${critical} cuentas con riesgo crítico en cartera`,
    }];
  }

  private async checkDelayedOrders(organizationId: string) {
    const now = new Date();
    const delayed = await this.prisma.escmSalesOrder.count({
      where: {
        organizationId,
        status: { in: ['approved', 'reserved', 'in_preparation', 'ready_for_dispatch'] },
        scheduledAt: { lt: now },
      },
    });
    if (delayed === 0) return [];
    return [{
      alertType: ALERT_TYPES.DELAYED_ORDER,
      severity: (delayed > 5 ? 'critical' : 'warning') as 'critical' | 'warning',
      title: 'Pedidos retrasados',
      message: `${delayed} pedidos exceden fecha programada`,
    }];
  }

  private async checkSalesDrop(organizationId: string) {
    const month = monthRange();
    const prev = previousPeriod(month);
    const [cur, prevSum] = await Promise.all([
      this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, createdAt: { gte: month.start, lte: month.end }, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, createdAt: { gte: prev.start, lte: prev.end }, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      }),
    ]);
    const current = cur._sum.totalAmount ?? 0;
    const previous = prevSum._sum.totalAmount ?? 0;
    if (previous > 0 && current < previous * 0.7) {
      return [{
        alertType: ALERT_TYPES.SALES_DROP,
        severity: 'critical' as const,
        title: 'Caída de ventas',
        message: `Ventas del mes ${current} vs ${previous} período anterior`,
      }];
    }
    return [];
  }

  private async checkBillingAnomaly(organizationId: string) {
    const day = dayRange();
    const current = await this.prisma.escmInvoice.aggregate({
      where: { organizationId, issuedAt: { gte: day.start, lte: day.end }, status: { in: ['issued', 'partial'] } },
      _sum: { totalAmount: true },
    });
    const history: number[] = [];
    for (let i = 1; i <= 7; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const r = dayRange(d);
      const agg = await this.prisma.escmInvoice.aggregate({
        where: { organizationId, issuedAt: { gte: r.start, lte: r.end }, status: { in: ['issued', 'partial'] } },
        _sum: { totalAmount: true },
      });
      history.push(agg._sum.totalAmount ?? 0);
    }
    if (detectAnomaly(current._sum.totalAmount ?? 0, history)) {
      return [{
        alertType: ALERT_TYPES.BILLING_ANOMALY,
        severity: 'warning' as const,
        title: 'Facturación anómala',
        message: `Facturación del día fuera del rango histórico`,
      }];
    }
    return [];
  }

  private async checkConversionDrop(organizationId: string) {
    const month = monthRange();
    const prev = previousPeriod(month);
    const [curQ, prevQ, curC, prevC] = await Promise.all([
      this.prisma.escmQuotation.count({ where: { organizationId, isCurrent: true, createdAt: { gte: month.start, lte: month.end } } }),
      this.prisma.escmQuotation.count({ where: { organizationId, isCurrent: true, createdAt: { gte: prev.start, lte: prev.end } } }),
      this.prisma.escmQuotation.count({ where: { organizationId, status: 'converted', updatedAt: { gte: month.start, lte: month.end } } }),
      this.prisma.escmQuotation.count({ where: { organizationId, status: 'converted', updatedAt: { gte: prev.start, lte: prev.end } } }),
    ]);
    const curRate = computeConversionRate(curC, curQ);
    const prevRate = computeConversionRate(prevC, prevQ);
    if (prevRate > 0 && curRate < prevRate * 0.7) {
      return [{
        alertType: ALERT_TYPES.CONVERSION_DROP,
        severity: 'warning' as const,
        title: 'Disminución de conversión',
        message: `Conversión cotizaciones ${curRate}% vs ${prevRate}% anterior`,
      }];
    }
    return [];
  }
}
