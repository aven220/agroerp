import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmFaCategoryService } from './efm-fa-category.service';
import { EfmFaAssetService } from './efm-fa-asset.service';

@Injectable()
export class EfmFaCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly categories: EfmFaCategoryService,
    private readonly assets: EfmFaAssetService,
  ) {}

  async center(organizationId: string) {
    const [
      categoryCount,
      totalAssets,
      activeAssets,
      disposedAssets,
      maintenanceAssets,
      totalAcquisitionCost,
      totalNbv,
      totalAccumulatedDepreciation,
      pendingDepreciationRuns,
      openInventories,
      openIncidents,
      recentDisposals,
      byClass,
      recentAssets,
    ] = await Promise.all([
      this.prisma.efmFaCategory.count({ where: { organizationId, isActive: true } }),
      this.prisma.efmFaAsset.count({ where: { organizationId } }),
      this.prisma.efmFaAsset.count({ where: { organizationId, status: 'active' } }),
      this.prisma.efmFaAsset.count({ where: { organizationId, status: { in: ['disposed', 'retired'] } } }),
      this.prisma.efmFaAsset.count({ where: { organizationId, status: 'maintenance' } }),
      this.prisma.efmFaAsset.aggregate({ where: { organizationId, status: 'active' }, _sum: { acquisitionCost: true } }),
      this.prisma.efmFaAsset.aggregate({ where: { organizationId, status: 'active' }, _sum: { netBookValue: true } }),
      this.prisma.efmFaAsset.aggregate({ where: { organizationId, status: 'active' }, _sum: { accumulatedDepreciation: true } }),
      this.prisma.efmFaDepreciationRun.count({ where: { organizationId, status: { in: ['draft', 'processing'] } } }),
      this.prisma.efmFaPhysicalInventory.count({ where: { organizationId, status: { in: ['draft', 'in_progress', 'reconciling'] } } }),
      this.prisma.efmFaAssetIncident.count({ where: { organizationId, status: 'open' } }),
      this.prisma.efmFaDisposal.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.efmFaAsset.groupBy({
        by: ['assetClass'],
        where: { organizationId, status: 'active' },
        _count: { id: true },
        _sum: { netBookValue: true },
      }),
      this.prisma.efmFaAsset.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { category: true },
      }),
    ]);

    return {
      categoryCount,
      totalAssets,
      activeAssets,
      disposedAssets,
      maintenanceAssets,
      totalAcquisitionCost: totalAcquisitionCost._sum.acquisitionCost ?? 0,
      totalNetBookValue: totalNbv._sum.netBookValue ?? 0,
      totalAccumulatedDepreciation: totalAccumulatedDepreciation._sum.accumulatedDepreciation ?? 0,
      pendingDepreciationRuns,
      openInventories,
      openIncidents,
      recentDisposals,
      assetsByClass: byClass.map((g) => ({
        assetClass: g.assetClass,
        count: g._count.id,
        netBookValue: g._sum.netBookValue ?? 0,
      })),
      recentAssets,
    };
  }

  async seed(organizationId: string, userId: string) {
    await this.categories.seed(organizationId, userId);

    const existing = await this.prisma.efmFaAsset.count({ where: { organizationId } });
    if (existing === 0) {
      await this.assets.register(organizationId, userId, {
        name: 'Tractor agrícola demo',
        categoryKey: 'CAT-AGRI',
        acquisitionDate: new Date().toISOString().slice(0, 10),
        acquisitionCost: 85000000,
        usefulLifeMonths: 84,
        locationKey: 'LOC-MAIN',
        locationDescription: 'Bodega principal',
        costCenterKey: 'CC-OPS',
        autoActivate: true,
      });
      await this.assets.register(organizationId, userId, {
        name: 'Licencia ERP anual',
        categoryKey: 'CAT-INT',
        acquisitionDate: new Date().toISOString().slice(0, 10),
        acquisitionCost: 12000000,
        usefulLifeMonths: 36,
        autoActivate: true,
      });
    }

    await this.audit.log(organizationId, 'EfmFaConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }
}
