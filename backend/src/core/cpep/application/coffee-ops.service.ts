import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeAuditService } from './coffee-audit.service';
import {
  avg,
  groupCount,
  hoursBucket,
  msToMinutes,
  percent,
  startOfDay,
  sum,
} from '../domain/analytics.engine';

@Injectable()
export class CoffeeOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
  ) {}

  async operationsCenter(organizationId: string, userId?: string) {
    const start = startOfDay();
    const tickets = await this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, createdAt: { gte: start } },
      include: {
        queueTurn: true,
        quality: true,
        settlement: true,
        weighingSessions: true,
        qualitySessions: true,
        settlementSessions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const waiting = tickets.filter((t) => ['queued', 'arrived', 'identity_validated'].includes(t.status));
    const activeTurns = tickets.filter((t) => ['receiving', 'quality_pending', 'settlement_pending', 'weighed', 'quality_done'].includes(t.status));
    const attended = tickets.filter((t) =>
      ['weighed', 'quality_pending', 'quality_done', 'settlement_pending', 'settled', 'inventory_posted'].includes(t.status),
    );

    const byHour = groupCount(tickets, (t) => hoursBucket(t.createdAt));
    const purchasesByHour = Object.entries(byHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));

    const attentionMs = tickets
      .map((t) => t.queueTurn?.attentionMs)
      .filter((v): v is number => v != null);
    const waitMs = tickets
      .map((t) => t.queueTurn?.waitMs)
      .filter((v): v is number => v != null);

    const weighingDurations = tickets.flatMap((t) =>
      t.weighingSessions
        .filter((s) => s.confirmedAt)
        .map((s) => s.confirmedAt!.getTime() - s.createdAt.getTime()),
    );
    const qualityDurations = tickets.flatMap((t) =>
      t.qualitySessions
        .filter((s) => s.decidedAt)
        .map((s) => s.decidedAt!.getTime() - s.createdAt.getTime()),
    );
    const settlementDurations = tickets.flatMap((t) =>
      t.settlementSessions
        .filter((s) => s.registeredAt)
        .map((s) => s.registeredAt!.getTime() - s.createdAt.getTime()),
    );
    const totalProcessDurations = tickets
      .filter((t) => t.settledAt)
      .map((t) => t.settledAt!.getTime() - t.createdAt.getTime());

    const kgToday = sum(tickets.map((t) => t.netWeightKg ?? 0));
    const amountToday = sum(tickets.map((t) => t.settlement?.totalAmount ?? 0));

    const payload = {
      generatedAt: new Date().toISOString(),
      purchasesToday: tickets.length,
      purchasesByHour,
      producersAttended: new Set(attended.map((t) => t.producerId ?? t.producerName).filter(Boolean)).size,
      producersWaiting: waiting.length,
      activeTurns: activeTurns.length,
      queueLength: waiting.length,
      avgAttentionMinutes: msToMinutes(avg(attentionMs)),
      avgWaitMinutes: msToMinutes(avg(waitMs)),
      avgWeighingMinutes: msToMinutes(avg(weighingDurations)),
      avgQualityMinutes: msToMinutes(avg(qualityDurations)),
      avgSettlementMinutes: msToMinutes(avg(settlementDurations)),
      avgTotalProcessMinutes: msToMinutes(avg(totalProcessDurations)),
      kgToday,
      amountToday,
      stages: {
        reception: tickets.filter((t) => ['arrived', 'identity_validated', 'queued'].includes(t.status)).length,
        weighing: tickets.filter((t) => ['receiving', 'weighed'].includes(t.status)).length,
        quality: tickets.filter((t) => ['quality_pending', 'quality_done', 'quality_lab'].includes(t.status)).length,
        settlement: tickets.filter((t) => ['settlement_pending', 'settled'].includes(t.status)).length,
        inventory: tickets.filter((t) => t.status === 'inventory_posted').length,
        rejected: tickets.filter((t) => t.status === 'quality_rejected' || t.quality?.decision === 'rejected').length,
      },
      liveQueue: waiting.slice(0, 30).map((t) => ({
        ticketKey: t.ticketKey,
        producerName: t.producerName,
        turnNumber: t.turnNumber ?? t.queueTurn?.turnNumber,
        status: t.status,
        waitMinutes: t.queueTurn?.waitMs != null ? msToMinutes(t.queueTurn.waitMs) : null,
      })),
    };

    if (userId) {
      await this.logAnalytics(organizationId, userId, 'query', 'operations_center', {});
    }
    return payload;
  }

  async evaluateAlerts(organizationId: string, userId?: string) {
    const start = startOfDay();
    const [qualities, settlements, tickets, prices] = await Promise.all([
      this.prisma.cpepQualityAssessment.findMany({
        where: { organizationId, assessedAt: { gte: start } },
        include: { ticket: { select: { ticketKey: true } } },
      }),
      this.prisma.cpepSettlement.findMany({
        where: { organizationId, createdAt: { gte: start }, voided: false },
      }),
      this.prisma.cpepReceptionTicket.findMany({
        where: { organizationId, createdAt: { gte: start } },
        include: { queueTurn: true, weighingSessions: true, qualitySessions: true },
      }),
      this.prisma.cpepPriceConfig.findMany({
        where: { organizationId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 2,
      }),
    ]);

    const created = [];
    const highHumidity = qualities.filter((q) => (q.humidityPct ?? 0) > 12.5);
    for (const q of highHumidity.slice(0, 20)) {
      created.push(
        await this.upsertAlert(organizationId, {
          alertKey: `humidity-${q.ticket.ticketKey}-${start.toISOString().slice(0, 10)}`,
          alertType: 'humidity_limit',
          severity: (q.humidityPct ?? 0) >= 14 ? 'critical' : 'warning',
          title: 'Humedad sobre límite',
          message: `Ticket ${q.ticket.ticketKey} humedad ${q.humidityPct}%`,
          metricKey: 'humidityPct',
          metricValue: q.humidityPct ?? undefined,
          threshold: 12.5,
          entityType: 'Ticket',
          entityKey: q.ticket.ticketKey,
        }),
      );
    }

    const rejects = qualities.filter((q) => q.decision === 'rejected' || q.grade === 'reject');
    const rejectRate = percent(rejects.length, qualities.length || 1);
    if (rejectRate >= 15 && qualities.length >= 5) {
      created.push(
        await this.upsertAlert(organizationId, {
          alertKey: `reject-rate-${start.toISOString().slice(0, 10)}`,
          alertType: 'unusual_rejects',
          severity: 'critical',
          title: 'Rechazos inusuales',
          message: `Tasa de rechazo del día ${rejectRate}% (${rejects.length}/${qualities.length})`,
          metricKey: 'rejectRate',
          metricValue: rejectRate,
          threshold: 15,
        }),
      );
    }

    if (prices.length >= 2 && prices[0].basePricePerKg !== prices[1].basePricePerKg) {
      created.push(
        await this.upsertAlert(organizationId, {
          alertKey: `price-change-${prices[0].configKey}-${prices[0].updatedAt.toISOString()}`,
          alertType: 'price_change',
          severity: 'info',
          title: 'Cambio de precio',
          message: `Precio vigente ${prices[0].basePricePerKg} (antes ${prices[1].basePricePerKg})`,
          metricKey: 'basePricePerKg',
          metricValue: prices[0].basePricePerKg,
          threshold: prices[1].basePricePerKg,
        }),
      );
    }

    const delayed = tickets.filter((t) => {
      const wait = t.queueTurn?.waitMs ?? 0;
      return wait > 45 * 60_000 || (Date.now() - t.createdAt.getTime() > 2 * 60 * 60_000 && !['settled', 'inventory_posted', 'cancelled', 'quality_rejected'].includes(t.status));
    });
    if (delayed.length) {
      created.push(
        await this.upsertAlert(organizationId, {
          alertKey: `delays-${start.toISOString().slice(0, 10)}`,
          alertType: 'process_delay',
          severity: 'warning',
          title: 'Retrasos operativos',
          message: `${delayed.length} tickets con demoras de atención o proceso`,
          metricKey: 'delayedTickets',
          metricValue: delayed.length,
          threshold: 1,
        }),
      );
    }

    const amountToday = sum(settlements.map((s) => s.totalAmount));
    const budgetParam = await this.prisma.cpepParameter.findFirst({
      where: { organizationId, parameterKey: 'daily_purchase_budget', isActive: true },
    });
    const budget = Number((budgetParam?.value as { amount?: number })?.amount ?? 0);
    if (budget > 0 && amountToday > budget) {
      created.push(
        await this.upsertAlert(organizationId, {
          alertKey: `budget-${start.toISOString().slice(0, 10)}`,
          alertType: 'budget_exceeded',
          severity: 'critical',
          title: 'Presupuesto superado',
          message: `Compras del día ${amountToday.toLocaleString()} superan presupuesto ${budget.toLocaleString()}`,
          metricKey: 'amountToday',
          metricValue: amountToday,
          threshold: budget,
        }),
      );
    }

    const humidityValues = qualities.map((q) => q.humidityPct).filter((v): v is number => v != null);
    if (humidityValues.length >= 5) {
      const mean = avg(humidityValues);
      const variance = avg(humidityValues.map((v) => (v - mean) ** 2));
      const std = Math.sqrt(variance);
      const anomalies = humidityValues.filter((v) => Math.abs(v - mean) > 2 * std && std > 0);
      if (anomalies.length) {
        created.push(
          await this.upsertAlert(organizationId, {
            alertKey: `anomaly-humidity-${start.toISOString().slice(0, 10)}`,
            alertType: 'anomaly',
            severity: 'warning',
            title: 'Anomalía de humedad',
            message: `${anomalies.length} lecturas fuera de 2σ (media ${mean.toFixed(2)}%)`,
            metricKey: 'humidityAnomalies',
            metricValue: anomalies.length,
          }),
        );
      }
    }

    if (userId) {
      await this.logAnalytics(organizationId, userId, 'query', 'alerts_evaluate', { created: created.length });
    }
    for (const alert of created.filter(Boolean)) {
      await this.core.emitUserAction(
        organizationId,
        'CoffeeOpsAlert',
        alert.id,
        EVENT_TYPES.COFFEE_OPS_ALERT_RAISED,
        { alertType: alert.alertType, severity: alert.severity },
      );
    }
    return this.listAlerts(organizationId);
  }

  listAlerts(organizationId: string, unresolvedOnly = true) {
    return this.prisma.cpepOpsAlert.findMany({
      where: {
        organizationId,
        ...(unresolvedOnly ? { acknowledged: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async acknowledgeAlert(organizationId: string, userId: string, alertKey: string) {
    const alert = await this.prisma.cpepOpsAlert.findFirst({
      where: { organizationId, alertKey },
    });
    if (!alert) return null;
    const updated = await this.prisma.cpepOpsAlert.update({
      where: { id: alert.id },
      data: { acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() },
    });
    await this.audit.log(organizationId, 'OpsAlert', alertKey, 'acknowledged', userId);
    return updated;
  }

  async logAnalytics(
    organizationId: string,
    userId: string,
    action: string,
    resource: string,
    filters: Record<string, unknown>,
    details: Record<string, unknown> = {},
  ) {
    return this.prisma.cpepAnalyticsAudit.create({
      data: {
        organizationId,
        action,
        resource,
        filters: filters as object,
        details: details as object,
        userId,
      },
    });
  }

  listAnalyticsAudit(organizationId: string) {
    return this.prisma.cpepAnalyticsAudit.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async upsertAlert(
    organizationId: string,
    input: {
      alertKey: string;
      alertType: string;
      severity: string;
      title: string;
      message: string;
      metricKey?: string;
      metricValue?: number;
      threshold?: number;
      entityType?: string;
      entityKey?: string;
    },
  ) {
    return this.prisma.cpepOpsAlert.upsert({
      where: { organizationId_alertKey: { organizationId, alertKey: input.alertKey } },
      update: {
        message: input.message,
        metricValue: input.metricValue,
        severity: input.severity,
      },
      create: {
        organizationId,
        alertKey: input.alertKey,
        alertType: input.alertType,
        severity: input.severity,
        title: input.title,
        message: input.message,
        metricKey: input.metricKey,
        metricValue: input.metricValue,
        threshold: input.threshold,
        entityType: input.entityType,
        entityKey: input.entityKey,
      },
    });
  }
}
