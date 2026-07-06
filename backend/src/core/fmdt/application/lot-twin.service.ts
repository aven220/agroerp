import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class LotTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async refresh(organizationId: string, fieldLotId: string, ctx?: RequestContext) {
    const lot = await this.prisma.fieldLotProfile.findFirst({
      where: { id: fieldLotId, organizationId },
      include: {
        agronomicStates: { where: { effectiveUntil: null }, take: 1 },
        operations: { where: { deletedAt: null, status: { not: 'voided' } } },
        costEntries: { where: { deletedAt: null, approvalStatus: 'approved' } },
        harvestRecords: true,
        documents: { where: { deletedAt: null } },
        recommendations: { where: { status: 'pending' }, take: 5 },
      },
    });
    if (!lot) return null;

    const purchases = await this.prisma.resource.findMany({
      where: { organizationId, resourceType: 'coffee_purchase', deletedAt: null },
      take: 300,
    });
    const lotPurchases = purchases.filter((p) => {
      const d = p.data as Record<string, unknown>;
      return d.field_lot_id === fieldLotId || d.fieldLotId === fieldLotId;
    });

    const productionYtdKg = lotPurchases.reduce((sum, p) => {
      const d = p.data as Record<string, unknown>;
      return sum + Number(d.weight_kg ?? d.weightKg ?? 0);
    }, 0);

    const revenueYtd = lotPurchases.reduce((sum, p) => {
      const d = p.data as Record<string, unknown>;
      return sum + Number(d.total_amount ?? d.totalAmount ?? 0);
    }, 0);

    const totalCostYtd = lot.costEntries.reduce((sum, c) => sum + Number(c.amount), 0)
      + lot.operations.reduce((sum, o) => sum + Number(o.totalCost ?? 0), 0);

    const plantedArea = Number(lot.plantedAreaHa ?? lot.totalAreaHa ?? 1);
    const avgYield = plantedArea > 0 ? productionYtdKg / plantedArea : 0;
    const costPerHa = plantedArea > 0 ? totalCostYtd / plantedArea : 0;
    const costPerKg = productionYtdKg > 0 ? totalCostYtd / productionYtdKg : 0;
    const marginPct = revenueYtd > 0 ? ((revenueYtd - totalCostYtd) / revenueYtd) * 100 : 0;

    const agState = lot.agronomicStates[0];
    const expectedYield = Number(agState?.expectedYieldKgHa ?? 0);
    const riskFlags: string[] = [];
    if (marginPct < 0) riskFlags.push('negative_margin');
    if (avgYield < expectedYield * 0.7 && expectedYield > 0) riskFlags.push('low_yield');
    if (lot.operations.length === 0) riskFlags.push('no_operations');

    const lastOp = lot.operations.sort(
      (a, b) => b.operationDate.getTime() - a.operationDate.getTime(),
    )[0];

    const twinData = {
      organizationId,
      fieldLotId,
      lastRefreshedAt: new Date(),
      statusSummary: lot.status,
      varietySummary: agState?.varietyCodes?.join(', ') ?? null,
      productionYtdKg,
      avgYieldKgHa: avgYield,
      expectedYieldKgHa: expectedYield,
      totalCostYtd,
      costPerHa,
      costPerKg,
      revenueYtd,
      marginPct,
      marginTrend: marginPct >= 0 ? 'stable' : 'down',
      qualityAvgScore: lotPurchases.length > 0 ? 75 : null,
      operationsCountYtd: lot.operations.length,
      lastOperationType: lastOp?.operationTypeCode ?? null,
      pendingOperationsCount: 0,
      riskFlags,
      compliancePct: lot.documents.length > 0 ? 80 : 40,
      thematicIndicators: {
        plantedAreaHa: plantedArea,
        operationsCost: lot.operations.reduce((s, o) => s + Number(o.totalCost ?? 0), 0),
        manualCosts: lot.costEntries.reduce((s, c) => s + Number(c.amount), 0),
      },
      timelinePreview: lot.operations.slice(0, 5).map((o) => ({
        type: o.operationTypeCode,
        date: o.operationDate,
      })),
      aiProjection: {
        harvestForecastKg: productionYtdKg * 1.08,
        phytosanitaryRiskScore: riskFlags.length * 15,
        recommendations: lot.recommendations.map((r) => r.title),
      },
    };

    const twin = await this.prisma.lotDigitalTwin.upsert({
      where: { fieldLotId },
      update: twinData,
      create: twinData,
    });

    await this.core.emitLotDigitalTwinRefreshed(
      organizationId,
      fieldLotId,
      { twinId: twin.id },
      { ctx },
    );

    return twin;
  }

  async getTwin(organizationId: string, fieldLotId: string) {
    let twin = await this.prisma.lotDigitalTwin.findFirst({
      where: { fieldLotId, organizationId },
    });
    if (!twin) twin = await this.refresh(organizationId, fieldLotId);

    const profile = await this.prisma.fieldLotProfile.findFirst({
      where: { id: fieldLotId, organizationId },
      include: {
        ftipLot: true,
        farmUnit: {
          select: {
            id: true,
            farmCode: true,
            farmName: true,
            municipalityCode: true,
            producerLinks: {
              where: { unlinkedAt: null },
              include: { producer: { select: { id: true, legalName: true } } },
            },
          },
        },
        responsibleProducer: true,
        agronomicStates: { where: { effectiveUntil: null }, take: 1 },
        operations: { where: { deletedAt: null }, orderBy: { operationDate: 'desc' }, take: 10 },
        costEntries: { where: { deletedAt: null }, take: 20 },
        harvestRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
        documents: { where: { deletedAt: null } },
        managementZones: true,
        sensorBindings: true,
        kpiSnapshots: { orderBy: { capturedAt: 'desc' }, take: 20 },
        recommendations: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    return { profile, twin };
  }

  async getKpis(organizationId: string, fieldLotId: string) {
    const snapshots = await this.prisma.lotKpiSnapshot.findMany({
      where: { fieldLotId, organizationId },
      orderBy: { capturedAt: 'desc' },
      take: 40,
    });
    const twin = await this.prisma.lotDigitalTwin.findFirst({
      where: { fieldLotId, organizationId },
    });
    return { current: twin, history: snapshots };
  }

  async captureKpiSnapshots(organizationId: string, fieldLotId: string) {
    const twin = await this.refresh(organizationId, fieldLotId);
    if (!twin) return [];

    const kpis = [
      { code: 'KPI-FMDT-01', value: Number(twin.avgYieldKgHa ?? 0) },
      { code: 'KPI-FMDT-03', value: Number(twin.productionYtdKg ?? 0) },
      { code: 'KPI-FMDT-05', value: Number(twin.costPerHa ?? 0) },
      { code: 'KPI-FMDT-08', value: Number(twin.marginPct ?? 0) },
      { code: 'KPI-FMDT-11', value: Number(twin.qualityAvgScore ?? 0) },
      { code: 'KPI-FMDT-13', value: twin.riskFlags.length },
    ];

    await this.prisma.lotKpiSnapshot.createMany({
      data: kpis.map((k) => ({
        organizationId,
        fieldLotId,
        kpiCode: k.code,
        kpiValue: k.value,
      })),
    });

    return kpis;
  }
}
