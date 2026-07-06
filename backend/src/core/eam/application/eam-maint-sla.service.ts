import { Injectable } from '@nestjs/common';
import { EamMaintPriority } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { evaluateSlaCompliance, generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';

@Injectable()
export class EamMaintSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamCmmsIntegrationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eamMaintSla.findMany({ where: { organizationId, isActive: true } });
  }

  async create(organizationId: string, userId: string, name: string, responseHours: number, repairHours: number, priority: EamMaintPriority) {
    const seq = await this.prisma.eamMaintSla.count({ where: { organizationId } });
    return this.prisma.eamMaintSla.create({
      data: {
        organizationId,
        slaKey: generateEamCmmsKey('SLA', seq + 1),
        name,
        responseHours,
        repairHours,
        priority,
      },
    });
  }

  async evaluateWorkOrder(organizationId: string, userId: string, workOrderKey: string, slaKey: string) {
    const sla = await this.prisma.eamMaintSla.findFirst({ where: { organizationId, slaKey } });
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!sla || !wo) return null;

    const responseHours = wo.startedAt && wo.createdAt
      ? (wo.startedAt.getTime() - wo.createdAt.getTime()) / 3600000
      : 0;
    const repairHours = wo.completedAt && wo.startedAt
      ? (wo.completedAt.getTime() - wo.startedAt.getTime()) / 3600000
      : 0;
    const status = evaluateSlaCompliance(responseHours, repairHours, sla.responseHours, sla.repairHours);
    const seq = await this.prisma.eamMaintSlaRecord.count({ where: { organizationId } });
    const recordKey = generateEamCmmsKey('SLR', seq + 1);
    const row = await this.prisma.eamMaintSlaRecord.create({
      data: {
        organizationId,
        recordKey,
        slaKey,
        workOrderKey,
        responseHours,
        repairHours,
        status,
        escalated: status === 'breached',
      },
    });
    if (status === 'breached') {
      await this.audit.log(organizationId, 'EamMaintSlaRecord', recordKey, 'sla_breach', userId);
      await this.integration.onSlaBreach(organizationId, row.id, recordKey, workOrderKey);
    }
    return row;
  }

  complianceDashboard(organizationId: string) {
    return this.prisma.eamMaintSlaRecord.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    }).then((groups) => {
      const result: Record<string, number> = { compliant: 0, at_risk: 0, breached: 0 };
      for (const g of groups) result[g.status] = g._count;
      const total = result.compliant + result.at_risk + result.breached;
      return {
        ...result,
        compliancePct: total > 0 ? Math.round((result.compliant / total) * 10000) / 100 : 100,
      };
    });
  }
}
