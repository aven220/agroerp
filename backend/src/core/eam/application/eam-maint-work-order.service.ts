import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EamMaintExecutionAction,
  EamMaintPriority,
  EamMaintWorkOrderSource,
  EamMaintWorkOrderStatus,
} from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { canTransitionWorkOrder, generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';
import { EamMaintCostService } from './eam-maint-cost.service';

@Injectable()
export class EamMaintWorkOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamCmmsIntegrationService,
    private readonly cost: EamMaintCostService,
  ) {}

  list(organizationId: string, status?: EamMaintWorkOrderStatus) {
    return this.prisma.eamMaintWorkOrder.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { assignments: { include: { technician: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  get(organizationId: string, workOrderKey: string) {
    return this.prisma.eamMaintWorkOrder.findFirst({
      where: { organizationId, workOrderKey },
      include: {
        approvals: true,
        executionLogs: true,
        attachments: true,
        measurements: true,
        assignments: { include: { technician: true } },
        spareParts: true,
        costs: true,
      },
    });
  }

  async createManual(
    organizationId: string,
    userId: string,
    assetKey: string,
    title: string,
    description?: string,
    priority: EamMaintPriority = 'medium',
  ) {
    const seq = await this.prisma.eamMaintWorkOrder.count({ where: { organizationId } });
    const row = await this.prisma.eamMaintWorkOrder.create({
      data: {
        organizationId,
        workOrderKey: generateEamCmmsKey('WO', seq + 1),
        assetKey,
        title,
        description,
        priority,
        source: 'manual',
        status: 'draft',
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', row.workOrderKey, 'work_order_created', userId);
    await this.integration.onWorkOrderCreated(organizationId, row.id, row.workOrderKey, assetKey);
    return row;
  }

  async createFromPlan(organizationId: string, userId: string, planKey: string) {
    const plan = await this.prisma.eamMaintPlan.findFirst({ where: { organizationId, planKey } });
    if (!plan) throw new NotFoundException('Plan not found');
    const seq = await this.prisma.eamMaintWorkOrder.count({ where: { organizationId } });
    const row = await this.prisma.eamMaintWorkOrder.create({
      data: {
        organizationId,
        workOrderKey: generateEamCmmsKey('WO', seq + 1),
        assetKey: plan.assetKey,
        planKey,
        title: `Mantenimiento: ${plan.name}`,
        priority: plan.priority,
        source: 'plan',
        status: 'pending_approval',
        checklistKey: plan.checklistKey,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', row.workOrderKey, 'work_order_created', userId, { planKey });
    await this.integration.onWorkOrderCreated(organizationId, row.id, row.workOrderKey, plan.assetKey);
    return row;
  }

  async createFromIncident(organizationId: string, userId: string, incidentKey: string) {
    const incident = await this.prisma.eamIncident.findFirst({ where: { organizationId, incidentKey } });
    if (!incident) throw new NotFoundException('Incident not found');
    const seq = await this.prisma.eamMaintWorkOrder.count({ where: { organizationId } });
    const priority: EamMaintPriority = incident.severity === 'critical' ? 'emergency' : incident.severity === 'high' ? 'critical' : 'high';
    const row = await this.prisma.eamMaintWorkOrder.create({
      data: {
        organizationId,
        workOrderKey: generateEamCmmsKey('WO', seq + 1),
        assetKey: incident.assetKey,
        incidentKey,
        title: incident.title,
        description: incident.description,
        priority,
        source: 'incident',
        status: 'pending_approval',
        createdBy: userId,
      },
    });
    await this.prisma.eamIncident.update({ where: { id: incident.id }, data: { workOrderKey: row.workOrderKey } });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', row.workOrderKey, 'work_order_created', userId, { incidentKey });
    await this.integration.onWorkOrderCreated(organizationId, row.id, row.workOrderKey, incident.assetKey);
    return row;
  }

  async approve(organizationId: string, userId: string, workOrderKey: string, approved: boolean, notes?: string) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    const seq = await this.prisma.eamMaintWorkOrderApproval.count({ where: { organizationId } });
    await this.prisma.eamMaintWorkOrderApproval.create({
      data: {
        organizationId,
        approvalKey: generateEamCmmsKey('APR', seq + 1),
        workOrderKey,
        approverId: userId,
        approved,
        notes,
        decidedAt: new Date(),
      },
    });
    if (approved) {
      await this.transition(organizationId, userId, workOrderKey, 'approved');
      await this.integration.onWorkOrderApproved(organizationId, wo.id, workOrderKey);
    }
    return this.get(organizationId, workOrderKey);
  }

  async schedule(organizationId: string, userId: string, workOrderKey: string, scheduledAt: Date) {
    await this.transition(organizationId, userId, workOrderKey, 'scheduled', { scheduledAt });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_scheduled', userId, { scheduledAt });
    return this.get(organizationId, workOrderKey);
  }

  async reschedule(organizationId: string, userId: string, workOrderKey: string, scheduledAt: Date) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    await this.prisma.eamMaintWorkOrder.update({
      where: { id: wo.id },
      data: { scheduledAt },
    });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_scheduled', userId, { rescheduled: true });
    return this.get(organizationId, workOrderKey);
  }

  async cancel(organizationId: string, userId: string, workOrderKey: string, notes?: string) {
    await this.transition(organizationId, userId, workOrderKey, 'cancelled');
    await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'updated', userId, { cancelled: true, notes });
    return this.get(organizationId, workOrderKey);
  }

  async transition(
    organizationId: string,
    userId: string,
    workOrderKey: string,
    toStatus: EamMaintWorkOrderStatus,
    extra?: { scheduledAt?: Date; startedAt?: Date; completedAt?: Date; closedAt?: Date },
  ) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    if (!canTransitionWorkOrder(wo.status, toStatus)) {
      throw new BadRequestException(`Cannot transition from ${wo.status} to ${toStatus}`);
    }
    return this.prisma.eamMaintWorkOrder.update({
      where: { id: wo.id },
      data: { status: toStatus, ...extra },
    });
  }

  async technicalClose(organizationId: string, userId: string, workOrderKey: string) {
    await this.transition(organizationId, userId, workOrderKey, 'technically_closed', { completedAt: new Date() });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_completed', userId);
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (wo) await this.integration.onWorkOrderCompleted(organizationId, wo.id, workOrderKey, wo.assetKey);
    return this.get(organizationId, workOrderKey);
  }

  async administrativeClose(organizationId: string, userId: string, workOrderKey: string) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    const totals = await this.cost.recalculateWorkOrder(organizationId, workOrderKey);
    await this.transition(organizationId, userId, workOrderKey, 'administratively_closed', { closedAt: new Date() });
    await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_closed', userId);
    await this.integration.onWorkOrderClosed(organizationId, wo.id, workOrderKey, totals.total);
    return this.get(organizationId, workOrderKey);
  }

  async recordExecution(
    organizationId: string,
    userId: string,
    workOrderKey: string,
    action: EamMaintExecutionAction,
    technicianKey?: string,
    laborMinutes?: number,
    notes?: string,
    checklistDone?: unknown[],
  ) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    const seq = await this.prisma.eamMaintExecutionLog.count({ where: { organizationId } });
    const log = await this.prisma.eamMaintExecutionLog.create({
      data: {
        organizationId,
        logKey: generateEamCmmsKey('EXL', seq + 1),
        workOrderKey,
        action,
        technicianKey,
        laborMinutes: laborMinutes ?? 0,
        notes,
        checklistDone: (checklistDone ?? []) as object,
        recordedBy: userId,
      },
    });

    const statusMap: Partial<Record<EamMaintExecutionAction, EamMaintWorkOrderStatus>> = {
      start: 'in_progress',
      pause: 'paused',
      resume: 'in_progress',
      complete: 'pending_close',
    };
    const toStatus = statusMap[action];
    if (toStatus) {
      const extra: Record<string, Date> = {};
      if (action === 'start') extra.startedAt = new Date();
      if (action === 'complete') extra.completedAt = new Date();
      if (canTransitionWorkOrder(wo.status, toStatus) || wo.status === toStatus) {
        await this.prisma.eamMaintWorkOrder.update({
          where: { id: wo.id },
          data: { status: toStatus, laborHours: wo.laborHours + (laborMinutes ?? 0) / 60, ...extra },
        });
      }
    }

    if (action === 'start') {
      await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_started', userId);
      await this.integration.onWorkOrderStarted(organizationId, wo.id, workOrderKey);
    }
    if (action === 'complete') {
      await this.audit.log(organizationId, 'EamMaintWorkOrder', workOrderKey, 'work_order_completed', userId);
    }
    return log;
  }

  async attachFile(organizationId: string, userId: string, workOrderKey: string, attachmentType: string, storageUrl: string, title?: string) {
    const seq = await this.prisma.eamMaintAttachment.count({ where: { organizationId } });
    return this.prisma.eamMaintAttachment.create({
      data: {
        organizationId,
        attachmentKey: generateEamCmmsKey('ATT', seq + 1),
        workOrderKey,
        attachmentType,
        storageUrl,
        title,
        uploadedBy: userId,
      },
    });
  }

  async recordMeasurement(organizationId: string, workOrderKey: string, metricName: string, metricValue: number, unit?: string) {
    const seq = await this.prisma.eamMaintMeasurement.count({ where: { organizationId } });
    return this.prisma.eamMaintMeasurement.create({
      data: {
        organizationId,
        measurementKey: generateEamCmmsKey('MSR', seq + 1),
        workOrderKey,
        metricName,
        metricValue,
        unit,
      },
    });
  }

  async sign(organizationId: string, userId: string, workOrderKey: string, signatureUrl: string) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) throw new NotFoundException('Work order not found');
    return this.prisma.eamMaintWorkOrder.update({
      where: { id: wo.id },
      data: { signatureUrl },
    });
  }
}
