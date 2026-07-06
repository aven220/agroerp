import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FormDashboardService } from '@/core/forms/application/form-dashboard.service';
import { GisDashboardService } from '@/core/egsip/application/gis-dashboard.service';
import { WorkflowMetricsService } from '@/core/workflows/application/workflow-metrics.service';
import { EneacMetricsService } from '@/core/eneac/application/eneac-metrics.service';

@Injectable()
export class BiAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formDashboard: FormDashboardService,
    private readonly gisDashboard: GisDashboardService,
    private readonly workflowMetrics: WorkflowMetricsService,
    private readonly eneacMetrics: EneacMetricsService,
  ) {}

  async getExecutiveSummary(organizationId: string) {
    const [
      producers,
      farms,
      lots,
      activeWorkflows,
      unreadNotifications,
      forms,
      gis,
      workflows,
      events24h,
    ] = await Promise.all([
      this.prisma.producer.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.workflowInstance.count({ where: { organizationId, status: 'active' } }),
      this.prisma.notificationMessage.count({
        where: { organizationId, status: 'unread', deletedAt: null },
      }),
      this.formDashboard.getDashboard(organizationId),
      this.gisDashboard.getDashboard(organizationId),
      this.workflowMetrics.getDashboard(organizationId),
      this.prisma.event.count({
        where: {
          organizationId,
          occurredAt: { gte: new Date(Date.now() - 24 * 3600000) },
        },
      }),
    ]);

    const producersByStatus = await this.prisma.producer.groupBy({
      by: ['lifecycleStatus'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const lotsByType = await this.prisma.fieldLotProfile.groupBy({
      by: ['lotTypeCode'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      category: 'executive',
      kpis: {
        totalProducers: producers,
        totalFarms: farms,
        totalLots: lots,
        activeWorkflows,
        unreadNotifications,
        eventsLast24h: events24h,
        formSubmissions: forms.kpis.totalSubmissions,
        gisLayers: gis.kpis?.layerCount ?? 0,
        workflowActive: workflows.summary.activeProcesses,
      },
      producersByStatus: producersByStatus.map((r) => ({
        status: r.lifecycleStatus,
        count: r._count.id,
      })),
      lotsByCrop: lotsByType.map((r) => ({
        crop: r.lotTypeCode ?? 'N/A',
        count: r._count?.id ?? 0,
      })),
      aiReadiness: {
        indicatorPrediction: true,
        anomalyDetection: true,
        executiveSummary: true,
        varianceExplanation: true,
      },
    };
  }

  async getCategoryDashboard(organizationId: string, category: string) {
    switch (category) {
      case 'executive':
        return this.getExecutiveSummary(organizationId);
      case 'operational':
        return this.getOperational(organizationId);
      case 'agronomic':
        return this.getAgronomic(organizationId);
      case 'producers':
        return this.getProducers(organizationId);
      case 'gis':
        return this.gisDashboard.getDashboard(organizationId);
      case 'quality':
        return this.getQuality(organizationId);
      case 'purchases':
        return this.getPurchases(organizationId);
      case 'inventory':
        return this.getInventory(organizationId);
      case 'financial':
        return this.getFinancial(organizationId);
      case 'commercial':
        return this.getCommercial(organizationId);
      case 'ai':
        return this.getAi(organizationId);
      default:
        return this.getExecutiveSummary(organizationId);
    }
  }

  private async getOperational(organizationId: string) {
    const [workflows, forms, notifications] = await Promise.all([
      this.workflowMetrics.getDashboard(organizationId),
      this.formDashboard.getDashboard(organizationId),
      this.eneacMetrics.getDashboard(organizationId),
    ]);
    return { category: 'operational', workflows, forms, notifications };
  }

  private async getAgronomic(organizationId: string) {
    const [lots, twins, operations, cropStates] = await Promise.all([
      this.prisma.fieldLotProfile.groupBy({
        by: ['lotTypeCode'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
        _sum: { totalAreaHa: true },
      }),
      this.prisma.lotDigitalTwin.aggregate({
        where: { organizationId },
        _avg: { ndviLatest: true, marginPct: true, productionYtdKg: true },
      }),
      this.prisma.fieldOperation.count({ where: { organizationId } }),
      this.prisma.lotAgronomicState.groupBy({
        by: ['primaryCropCode'],
        where: { organizationId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);
    return {
      category: 'agronomic',
      lotsByCrop: lots.map((l) => ({
        crop: l.lotTypeCode,
        count: l._count?.id ?? 0,
        areaHa: Number(l._sum?.totalAreaHa ?? 0),
      })),
      cropStates: cropStates.map((c) => ({
        crop: c.primaryCropCode,
        count: c._count?.id ?? 0,
      })),
      twinAverages: {
        ndvi: Number(twins._avg.ndviLatest ?? 0),
        marginPct: Number(twins._avg.marginPct ?? 0),
        productionYtdKg: Number(twins._avg.productionYtdKg ?? 0),
      },
      totalOperations: operations,
    };
  }

  private async getProducers(organizationId: string) {
    const grouped = await this.prisma.producer.groupBy({
      by: ['municipalityCode'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });
    return {
      category: 'producers',
      byMunicipality: grouped.map((g) => ({
        municipality: g.municipalityCode ?? 'N/A',
        count: g._count.id,
      })),
    };
  }

  private async getQuality(organizationId: string) {
    const scores = await this.prisma.producer.aggregate({
      where: { organizationId, deletedAt: null },
      _avg: { qualityScore: true, riskScore: true },
    });
    return {
      category: 'quality',
      avgQualityScore: Number(scores._avg.qualityScore ?? 0),
      avgRiskScore: Number(scores._avg.riskScore ?? 0),
    };
  }

  private async getPurchases(organizationId: string) {
    return {
      category: 'purchases',
      kpis: { pendingOrders: 0, totalPurchases: 0 },
      note: 'Integración CPE',
    };
  }

  private async getInventory(organizationId: string) {
    const resources = await this.prisma.resource.count({
      where: { organizationId, resourceType: { contains: 'inventory' } },
    });
    return { category: 'inventory', totalItems: resources };
  }

  private async getFinancial(organizationId: string) {
    const costs = await this.prisma.lotCostEntry.aggregate({
      where: { organizationId },
      _sum: { amount: true },
    });
    return {
      category: 'financial',
      totalLotCosts: Number(costs._sum.amount ?? 0),
    };
  }

  private async getCommercial(organizationId: string) {
    const active = await this.prisma.producer.count({
      where: { organizationId, lifecycleStatus: 'active', deletedAt: null },
    });
    return { category: 'commercial', activeProducers: active };
  }

  private async getAi(organizationId: string) {
    const recommendations = await this.prisma.lotRecommendation.count({
      where: { organizationId },
    });
    return {
      category: 'ai',
      lotRecommendations: recommendations,
      aiReadiness: {
        prediction: true,
        anomalyDetection: true,
        autoSummary: true,
      },
    };
  }
}
