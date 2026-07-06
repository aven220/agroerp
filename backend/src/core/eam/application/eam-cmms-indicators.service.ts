import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateCmmsIndicators, generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';

@Injectable()
export class EamCmmsIndicatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EamCmmsIntegrationService,
  ) {}

  async compute(organizationId: string) {
    const [openWo, completedWo, overdueWo, openInc, slaRecords, costs, technicians] = await Promise.all([
      this.prisma.eamMaintWorkOrder.count({
        where: { organizationId, status: { in: ['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'paused', 'pending_close'] } },
      }),
      this.prisma.eamMaintWorkOrder.count({
        where: { organizationId, status: { in: ['technically_closed', 'administratively_closed'] } },
      }),
      this.prisma.eamMaintWorkOrder.count({
        where: { organizationId, scheduledAt: { lt: new Date() }, status: { in: ['scheduled', 'approved'] } },
      }),
      this.prisma.eamIncident.count({ where: { organizationId, resolvedAt: null } }),
      this.prisma.eamMaintSlaRecord.findMany({ where: { organizationId } }),
      this.prisma.eamMaintWorkOrder.aggregate({ where: { organizationId }, _sum: { totalCost: true } }),
      this.prisma.eamTechnician.findMany({ where: { organizationId } }),
    ]);

    const slaBreached = slaRecords.filter((r) => r.status === 'breached').length;
    const slaCompliant = slaRecords.filter((r) => r.status === 'compliant').length;
    const busyTechs = technicians.filter((t) => t.workloadHours > 0).length;
    const utilization = technicians.length > 0 ? Math.round((busyTechs / technicians.length) * 10000) / 100 : 0;

    const indicators = aggregateCmmsIndicators({
      openWorkOrders: openWo,
      completedWorkOrders: completedWo,
      overdueWorkOrders: overdueWo,
      openIncidents: openInc,
      slaBreached,
      slaCompliant,
      totalMaintCost: costs._sum.totalCost ?? 0,
      technicianUtilizationPct: utilization,
    });

    const seq = await this.prisma.eamCmmsIndicatorSnapshot.count({ where: { organizationId } });
    await this.prisma.eamCmmsIndicatorSnapshot.create({
      data: { organizationId, snapshotKey: generateEamCmmsKey('KPI', seq + 1), indicators: indicators as object },
    });
    await this.integration.onDashboardRefresh(organizationId);
    return indicators;
  }

  async dashboard(organizationId: string) {
    const latest = await this.prisma.eamCmmsIndicatorSnapshot.findFirst({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
    });
    if (latest) return latest.indicators as Record<string, unknown>;
    return this.compute(organizationId);
  }
}
