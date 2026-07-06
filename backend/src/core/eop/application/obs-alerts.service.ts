import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { evaluateThreshold } from '../domain/alert-rule.engine';
import { ObsAuditService } from './obs-audit.service';

@Injectable()
export class ObsAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: ObsAuditService,
  ) {}

  listRules(organizationId: string) {
    return this.prisma.eopAlertRule.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  createRule(organizationId: string, data: {
    ruleKey: string; name: string; description?: string; severity?: string;
    component?: string; metricKind?: string; operator: string; threshold: number; windowSeconds?: number;
  }) {
    return this.prisma.eopAlertRule.upsert({
      where: { organizationId_ruleKey: { organizationId, ruleKey: data.ruleKey } },
      update: {
        name: data.name,
        description: data.description,
        severity: (data.severity ?? 'warning') as 'warning',
        component: data.component as 'backend' | undefined,
        metricKind: data.metricKind as 'latency' | undefined,
        operator: data.operator,
        threshold: data.threshold,
        windowSeconds: data.windowSeconds ?? 300,
        isActive: true,
      },
      create: {
        organizationId,
        ruleKey: data.ruleKey,
        name: data.name,
        description: data.description,
        severity: (data.severity ?? 'warning') as 'warning',
        component: data.component as 'backend' | undefined,
        metricKind: data.metricKind as 'latency' | undefined,
        operator: data.operator,
        threshold: data.threshold,
        windowSeconds: data.windowSeconds ?? 300,
      },
    });
  }

  listAlerts(organizationId: string, openOnly = true) {
    return this.prisma.eopAlert.findMany({
      where: {
        organizationId,
        ...(openOnly ? { status: { in: ['open', 'acknowledged'] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async raise(organizationId: string, data: {
    alertKey: string; title: string; message: string; severity?: string;
    component?: string; serviceName?: string; ruleId?: string; payload?: Record<string, unknown>;
  }) {
    const alert = await this.prisma.eopAlert.create({
      data: {
        organizationId,
        ruleId: data.ruleId,
        alertKey: data.alertKey,
        title: data.title,
        message: data.message,
        severity: (data.severity ?? 'warning') as 'warning',
        component: data.component as 'backend' | undefined,
        serviceName: data.serviceName,
        payload: (data.payload ?? {}) as object,
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'ObservabilityAlert',
      alert.id,
      EVENT_TYPES.OBSERVABILITY_ALERT_RAISED,
      { alertKey: data.alertKey, severity: data.severity },
    );
    await this.audit.log(organizationId, 'alert_raised', 'Alert', data.alertKey);
    return alert;
  }

  acknowledge(organizationId: string, id: string) {
    return this.prisma.eopAlert.update({
      where: { id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
  }

  resolve(organizationId: string, id: string) {
    return this.prisma.eopAlert.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }

  async evaluateRules(organizationId: string) {
    const rules = await this.prisma.eopAlertRule.findMany({
      where: { organizationId, isActive: true },
    });
    const raised = [];
    for (const rule of rules) {
      if (!rule.metricKind) continue;
      const since = new Date(Date.now() - rule.windowSeconds * 1000);
      const samples = await this.prisma.eopMetricSample.findMany({
        where: { organizationId, kind: rule.metricKind, recordedAt: { gte: since } },
        take: 500,
      });
      if (!samples.length) continue;
      const avg = samples.reduce((s, r) => s + r.value, 0) / samples.length;
      if (evaluateThreshold(avg, rule.operator, rule.threshold)) {
        raised.push(await this.raise(organizationId, {
          alertKey: `${rule.ruleKey}-${Date.now()}`,
          title: rule.name,
          message: `Métrica ${rule.metricKind} = ${avg.toFixed(2)} (umbral ${rule.operator} ${rule.threshold})`,
          severity: rule.severity,
          component: rule.component ?? undefined,
          ruleId: rule.id,
          payload: { avg, threshold: rule.threshold },
        }));
      }
    }
    return raised;
  }
}
