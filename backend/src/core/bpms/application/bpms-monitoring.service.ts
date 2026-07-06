import { Injectable } from '@nestjs/common';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { aggregateMonitoringIndicators, detectBottlenecks, evaluateSlaStatus, generateBpmsKey } from '../domain/bpms.engine';
import { BpmsIntegrationService } from './bpms-integration.service';

@Injectable()
export class BpmsMonitoringService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly integration: BpmsIntegrationService,
  ) {}

  async compute(organizationId: string) {
    const [active, completed, failed, tasks, logs] = await Promise.all([
      this.prisma.bpmsProcessInstance.count({ where: { organizationId, status: 'running' } }),
      this.prisma.bpmsProcessInstance.count({ where: { organizationId, status: 'completed' } }),
      this.prisma.bpmsProcessInstance.count({ where: { organizationId, status: 'failed' } }),
      this.prisma.bpmsTask.findMany({ where: { organizationId }, take: 500 }),
      this.prisma.bpmsExecutionLog.findMany({ where: { organizationId }, take: 1000 }),
    ]);
    let slaBreached = 0;
    let slaCompliant = 0;
    for (const t of tasks) {
      const sla = evaluateSlaStatus({ startedAt: t.claimedAt ?? new Date(), dueAt: t.dueAt, completedAt: t.completedAt });
      if (sla === 'breached') slaBreached++;
      else if (t.completedAt) slaCompliant++;
    }
    const completedInstances = await this.prisma.bpmsProcessInstance.findMany({
      where: { organizationId, status: 'completed', completedAt: { not: null } },
      take: 200,
    });
    let avgDurationHours = 0;
    if (completedInstances.length > 0) {
      const total = completedInstances.reduce((s, i) => s + ((i.completedAt!.getTime() - i.startedAt.getTime()) / 3600000), 0);
      avgDurationHours = total / completedInstances.length;
    }
    const indicators = aggregateMonitoringIndicators({ active, completed, failed, avgDurationHours, slaBreached, slaCompliant });
    const bottlenecks = detectBottlenecks(
      logs.map((l) => ({ elementKey: l.elementKey, durationMs: Number((l.details as { durationMs?: number })?.durationMs ?? 1000) })),
    );
    const snapshot = await this.prisma.bpmsIndicatorSnapshot.upsert({
      where: { organizationId_snapshotKey: { organizationId, snapshotKey: 'monitoring' } },
      create: { organizationId, snapshotKey: 'monitoring', indicators: { ...indicators, bottlenecks } as object },
      update: { indicators: { ...indicators, bottlenecks } as object, computedAt: new Date() },
    });
    await this.integration.onDashboardRefresh(organizationId);
    return { indicators, bottlenecks, snapshot };
  }

  dashboard(organizationId: string) {
    return Promise.all([
      this.prisma.bpmsIndicatorSnapshot.findFirst({ where: { organizationId, snapshotKey: 'monitoring' } }),
      this.prisma.bpmsProcessInstance.findMany({ where: { organizationId, status: 'running' }, take: 20 }),
      this.prisma.bpmsProcessInstance.findMany({ where: { organizationId, status: 'failed' }, take: 20 }),
    ]).then(([snapshot, active, failed]) => ({
      indicators: snapshot?.indicators ?? {},
      activeInstances: active,
      failedInstances: failed,
    }));
  }
}

@Injectable()
export class BpmsTemplateService {
  constructor(private readonly prisma: BpmsPrismaService) {}

  list(organizationId: string) {
    return this.prisma.bpmsTemplate.findMany({ where: { organizationId } });
  }

  async seed(organizationId: string) {
    const templates = [
      { templateKey: 'TPL-APPROVAL', name: 'Aprobación genérica', category: 'aprobaciones', elements: [
        { elementKey: 'start', elementType: 'start', name: 'Inicio', posX: 50, posY: 100 },
        { elementKey: 'review', elementType: 'user_task', name: 'Revisión', posX: 200, posY: 100 },
        { elementKey: 'end', elementType: 'end', name: 'Fin', posX: 400, posY: 100 },
      ], flows: [
        { flowKey: 'f1', fromElementKey: 'start', toElementKey: 'review' },
        { flowKey: 'f2', fromElementKey: 'review', toElementKey: 'end' },
      ]},
      { templateKey: 'TPL-PURCHASE', name: 'Compra', category: 'compras', elements: [
        { elementKey: 'start', elementType: 'start', name: 'Inicio', posX: 50, posY: 100 },
        { elementKey: 'approve', elementType: 'user_task', name: 'Aprobar OC', posX: 200, posY: 100 },
        { elementKey: 'notify', elementType: 'service_task', name: 'Notificar', posX: 350, posY: 100 },
        { elementKey: 'end', elementType: 'end', name: 'Fin', posX: 500, posY: 100 },
      ], flows: [
        { flowKey: 'f1', fromElementKey: 'start', toElementKey: 'approve' },
        { flowKey: 'f2', fromElementKey: 'approve', toElementKey: 'notify' },
        { flowKey: 'f3', fromElementKey: 'notify', toElementKey: 'end' },
      ]},
    ];
    for (const t of templates) {
      const exists = await this.prisma.bpmsTemplate.findFirst({ where: { organizationId, templateKey: t.templateKey } });
      if (!exists) {
        await this.prisma.bpmsTemplate.create({
          data: { organizationId, templateKey: t.templateKey, name: t.name, category: t.category, bpmnModel: { elements: t.elements, flows: t.flows } as object },
        });
      }
    }
    return this.list(organizationId);
  }
}
