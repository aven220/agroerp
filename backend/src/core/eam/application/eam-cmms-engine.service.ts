import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';
import { EamMaintWorkOrderService } from './eam-maint-work-order.service';
import { EamSparePartService } from './eam-spare-part.service';
import { EamMaintPlanService } from './eam-maint-plan.service';
import { EamTechnicianService } from './eam-technician.service';
import { EamIncidentService } from './eam-incident.service';
import { EamMaintSlaService } from './eam-maint-sla.service';
import { EamMaintCostService } from './eam-maint-cost.service';
import { EamCmmsIndicatorsService } from './eam-cmms-indicators.service';

type OfflineOp = {
  type: 'execution' | 'spare_part' | 'attachment' | 'sign';
  payload: Record<string, unknown>;
};

@Injectable()
export class EamCmmsOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EamCmmsIntegrationService,
    private readonly workOrder: EamMaintWorkOrderService,
    private readonly sparePart: EamSparePartService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.eamCmmsOfflineBatch.count({ where: { organizationId } });
    return this.prisma.eamCmmsOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEamCmmsKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eamCmmsOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.eamCmmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.eamCmmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'execution':
        return this.workOrder.recordExecution(
          organizationId, userId, String(p.workOrderKey), p.action as never,
          p.technicianKey ? String(p.technicianKey) : undefined,
          p.laborMinutes ? Number(p.laborMinutes) : undefined,
          p.notes ? String(p.notes) : undefined,
        );
      case 'spare_part':
        return this.sparePart.updateStatus(organizationId, userId, String(p.lineKey), p.status as never, p.unitCost ? Number(p.unitCost) : undefined);
      case 'attachment':
        return this.workOrder.attachFile(organizationId, userId, String(p.workOrderKey), String(p.attachmentType), String(p.storageUrl), p.title ? String(p.title) : undefined);
      case 'sign':
        return this.workOrder.sign(organizationId, userId, String(p.workOrderKey), String(p.signatureUrl));
      default:
        return null;
    }
  }

  mobileSync(organizationId: string, technicianKey?: string) {
    return Promise.all([
      this.prisma.eamMaintWorkOrder.findMany({
        where: {
          organizationId,
          status: { in: ['scheduled', 'in_progress', 'paused', 'approved'] },
          ...(technicianKey
            ? { assignments: { some: { technicianKey } } }
            : {}),
        },
        take: 50,
      }),
      this.prisma.eamTechnician.findMany({ where: { organizationId, isAvailable: true } }),
    ]).then(([workOrders, technicians]) => ({ workOrders, technicians }));
  }
}

@Injectable()
export class EamCmmsEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plan: EamMaintPlanService,
    private readonly workOrder: EamMaintWorkOrderService,
    private readonly technician: EamTechnicianService,
    private readonly incident: EamIncidentService,
    private readonly sla: EamMaintSlaService,
    private readonly indicators: EamCmmsIndicatorsService,
    private readonly cost: EamMaintCostService,
  ) {}

  async center(organizationId: string) {
    const [plans, openOrders, technicians, incidents, indicators, costs] = await Promise.all([
      this.plan.list(organizationId),
      this.workOrder.list(organizationId, 'in_progress'),
      this.technician.list(organizationId),
      this.incident.list(organizationId, false),
      this.indicators.dashboard(organizationId),
      this.cost.dashboard(organizationId),
    ]);
    return { plans, openOrders, technicians, incidents, indicators, costs };
  }

  async bootstrap(organizationId: string, userId: string) {
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId } });
    if (!asset) return this.center(organizationId);

    const existing = await this.prisma.eamMaintPlan.count({ where: { organizationId } });
    if (existing === 0) {
      const checklist = await this.plan.createChecklist(organizationId, userId, 'Inspección estándar', [
        'Verificar niveles', 'Revisar fugas', 'Probar funcionamiento', 'Limpiar filtros',
      ]);
      const plan = await this.plan.create(
        organizationId, userId, asset.assetKey, 'Mantenimiento Preventivo Mensual',
        'calendar', 'medium', 30, 'days', checklist?.checklistKey,
      );
      await this.plan.addActivity(organizationId, userId, plan.planKey, 'Inspección general', 2);
      await this.technician.createSpecialty(organizationId, userId, 'MEC', 'Mecánica');
      const spec = await this.prisma.eamTechnicianSpecialty.findFirst({ where: { organizationId, code: 'MEC' } });
      await this.technician.createTechnician(organizationId, userId, 'Técnico Principal', spec?.specialtyKey);
      const crew = await this.technician.createCrew(organizationId, userId, 'CUAD-01', 'Cuadrilla Mantenimiento');
      const tech = await this.prisma.eamTechnician.findFirst({ where: { organizationId } });
      if (tech) await this.technician.addCrewMember(organizationId, crew.crewKey, tech.technicianKey, 'lead');
      await this.sla.create(organizationId, userId, 'SLA Correctivo', 4, 24, 'high');
      await this.workOrder.createFromPlan(organizationId, userId, plan.planKey);
    }

    await this.indicators.compute(organizationId);
    return this.center(organizationId);
  }
}
