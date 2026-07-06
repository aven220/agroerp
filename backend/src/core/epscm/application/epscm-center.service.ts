import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmKey } from '../domain/epscm-planning.engine';
import { EpscmAuditService } from './epscm-audit.service';

@Injectable()
export class EpscmCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  async center(organizationId: string) {
    const [
      dcCount, warehouseCount, forecastCount, proposalCount,
      planCount, alertCount, policyCount, classificationCount,
    ] = await Promise.all([
      this.prisma.epscmDistributionCenter.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmWarehouse.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmDemandForecastVersion.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmReplenishmentProposal.count({ where: { organizationId, status: 'proposed' } }),
      this.prisma.epscmSupplyPlan.count({ where: { organizationId, status: 'active' } }),
      this.prisma.epscmAlert.count({ where: { organizationId, isRead: false } }),
      this.prisma.epscmReplenishmentPolicy.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmInventoryClassification.count({ where: { organizationId } }),
    ]);

    return {
      dcCount, warehouseCount, forecastCount, proposalCount,
      planCount, alertCount, policyCount, classificationCount,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.epscmDistributionCenter.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    const dcSeq = await this.prisma.epscmDistributionCenter.count({ where: { organizationId } });
    const dc = await this.prisma.epscmDistributionCenter.create({
      data: {
        organizationId,
        dcKey: generateEpscmKey('DC', dcSeq + 1),
        code: 'DC-01',
        name: 'Centro Distribución Principal',
        companyKey: 'ORG',
      },
    });

    const whSeq = await this.prisma.epscmWarehouse.count({ where: { organizationId } });
    await this.prisma.epscmWarehouse.create({
      data: {
        organizationId,
        warehouseKey: generateEpscmKey('WH', whSeq + 1),
        dcKey: dc.dcKey,
        code: 'WH-01',
        name: 'Bodega Central',
      },
    });

    await this.audit.log(organizationId, 'EpscmDistributionCenter', dc.dcKey, 'created', userId);
    return this.center(organizationId);
  }

  listDistributionCenters(organizationId: string) {
    return this.prisma.epscmDistributionCenter.findMany({
      where: { organizationId, isActive: true },
      include: { warehouses: true },
    });
  }

  listWarehouses(organizationId: string, dcKey?: string) {
    return this.prisma.epscmWarehouse.findMany({
      where: { organizationId, isActive: true, ...(dcKey ? { dcKey } : {}) },
    });
  }

  async mobileSync(organizationId: string) {
    const [center, alerts, kpis, proposals] = await Promise.all([
      this.center(organizationId),
      this.prisma.epscmAlert.findMany({ where: { organizationId, isRead: false }, take: 20 }),
      this.prisma.epscmInventoryIndicator.findFirst({
        where: { organizationId },
        orderBy: { computedAt: 'desc' },
      }),
      this.prisma.epscmReplenishmentProposal.findMany({
        where: { organizationId, status: 'proposed' },
        take: 20,
      }),
    ]);
    return { center, alerts, indicators: kpis?.indicators ?? {}, proposals };
  }
}
