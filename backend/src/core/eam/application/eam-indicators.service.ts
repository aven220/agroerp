import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  aggregateEamIndicators,
  generateEamKey,
  isWarrantyExpiringSoon,
  remainingUsefulLifeMonths,
} from '../domain/eam-asset.engine';
import { EamIntegrationService } from './eam-integration.service';

@Injectable()
export class EamIndicatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EamIntegrationService,
  ) {}

  async compute(organizationId: string) {
    const assets = await this.prisma.eamAsset.findMany({
      where: { organizationId, status: { notIn: ['disposed'] } },
      include: { location: true },
    });

    const byLocation: Record<string, number> = {};
    const byResponsible: Record<string, number> = {};
    const byArea: Record<string, number> = {};
    let totalValue = 0;
    let operationalCount = 0;
    let expiringWarranties = 0;
    let lifeSum = 0;

    for (const a of assets) {
      totalValue += a.acquisitionCost;
      if (a.status === 'operational' || a.status === 'commissioned') operationalCount++;
      if (a.locationKey) byLocation[a.locationKey] = (byLocation[a.locationKey] ?? 0) + 1;
      if (a.responsibleUserId) byResponsible[a.responsibleUserId] = (byResponsible[a.responsibleUserId] ?? 0) + 1;
      if (a.familyKey) byArea[a.familyKey] = (byArea[a.familyKey] ?? 0) + 1;
      if (isWarrantyExpiringSoon(a.warrantyExpiresAt)) expiringWarranties++;
      lifeSum += remainingUsefulLifeMonths(a.commissionedAt ?? a.purchaseDate, a.usefulLifeMonths);
    }

    const indicators = aggregateEamIndicators({
      totalAssets: assets.length,
      totalValue,
      operationalCount,
      byLocation,
      byResponsible,
      byArea,
      expiringWarranties,
      avgRemainingLifeMonths: assets.length > 0 ? lifeSum / assets.length : 0,
    });

    const seq = await this.prisma.eamIndicatorSnapshot.count({ where: { organizationId } });
    await this.prisma.eamIndicatorSnapshot.create({
      data: {
        organizationId,
        snapshotKey: generateEamKey('KPI', seq + 1),
        indicators: indicators as object,
      },
    });
    await this.integration.onDashboardRefresh(organizationId);
    return indicators;
  }

  async dashboard(organizationId: string) {
    const latest = await this.prisma.eamIndicatorSnapshot.findFirst({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
    });
    if (latest) return latest.indicators as Record<string, unknown>;
    return this.compute(organizationId);
  }
}
