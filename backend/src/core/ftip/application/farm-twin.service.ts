import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class FarmTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async refresh(organizationId: string, farmUnitId: string, ctx?: RequestContext) {
    const farm = await this.prisma.farmUnit.findFirst({
      where: { id: farmUnitId, organizationId },
      include: {
        producerLinks: { where: { unlinkedAt: null, isPrimary: true }, take: 1 },
        lots: { where: { deletedAt: null } },
        cropStands: { where: { status: 'active' } },
        certifications: { where: { status: 'active' } },
        risks: true,
        documents: { where: { deletedAt: null } },
        visitLinks: { orderBy: { visitedAt: 'desc' }, take: 1 },
      },
    });
    if (!farm) return null;

    const farmTickets = await this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, farmId: farmUnitId },
      include: { quality: true },
      orderBy: { createdAt: 'desc' },
    });
    const productionYtdKg = farmTickets.reduce((sum, t) => {
      return sum + Number(t.netWeightKg ?? 0);
    }, 0);

    const qualityScores = farmTickets
      .map((t) => t.quality?.qualityScore)
      .filter((s): s is number => s != null);
    const qualityAvgScore =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : null;

    const agArea = Number(farm.agriculturalAreaHa ?? farm.totalAreaHa ?? 0);
    const avgYield = agArea > 0 ? productionYtdKg / agArea : 0;
    const requiredDocs = ['escritura', 'plano', 'foto'];
    const presentTypes = new Set(farm.documents.map((d) => d.documentTypeCode));
    const docPct = Math.round((requiredDocs.filter((t) => presentTypes.has(t)).length / requiredDocs.length) * 100);

    const riskFlags = farm.risks
      .filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical')
      .map((r) => r.riskTypeCode);

    const twinData = {
      organizationId,
      farmUnitId,
      lastRefreshedAt: new Date(),
      statusSummary: farm.status,
      producerPrimaryId: farm.producerLinks[0]?.producerId ?? null,
      totalAreaHa: farm.totalAreaHa,
      agriculturalAreaHa: farm.agriculturalAreaHa,
      lotCount: farm.lots.length,
      activeCropStandCount: farm.cropStands.length,
      productionYtdKg,
      avgYieldKgHa: avgYield,
      qualityAvgScore,
      activeCertificationCodes: farm.certifications.map((c) => c.certificationSchemeCode),
      riskFlags,
      lastVisitAt: farm.visitLinks[0]?.visitedAt ?? farm.lastVisitAt,
      documentCompletenessPct: docPct,
      thematicIndicators: {
        forestCoverPct: farm.totalAreaHa
          ? Number(farm.forestAreaHa ?? 0) / Number(farm.totalAreaHa) * 100
          : 0,
      },
      aiProjection: {
        productionForecastKg: null,
        riskScore: riskFlags.length > 0 ? riskFlags.length : null,
        recommendations: [] as string[],
      },
    };

    const twin = await this.prisma.farmDigitalTwin.upsert({
      where: { farmUnitId },
      update: twinData,
      create: twinData,
    });

    await this.core.emitFarmTwinRefreshed(
      organizationId,
      farmUnitId,
      { twinId: twin.id },
      { ctx },
    );

    return twin;
  }

  async getTwin(organizationId: string, farmUnitId: string) {
    let twin = await this.prisma.farmDigitalTwin.findFirst({
      where: { farmUnitId, organizationId },
    });
    if (!twin) twin = await this.refresh(organizationId, farmUnitId);
    const farm = await this.prisma.farmUnit.findFirst({
      where: { id: farmUnitId, organizationId },
      include: {
        lots: { where: { deletedAt: null }, include: { cropStands: true } },
        parcels: { where: { deletedAt: null } },
        naturalResources: true,
        infrastructure: true,
        certifications: true,
        documents: { where: { deletedAt: null } },
        producerLinks: {
          where: { unlinkedAt: null },
          include: { producer: { select: { id: true, legalName: true, producerNumber: true } } },
        },
        risks: true,
        kpiSnapshots: { orderBy: { capturedAt: 'desc' }, take: 20 },
        aiInsights: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return { profile: farm, twin };
  }

  async getKpis(organizationId: string, farmUnitId: string) {
    const snapshots = await this.prisma.territoryKpiSnapshot.findMany({
      where: { farmUnitId, organizationId },
      orderBy: { capturedAt: 'desc' },
      take: 40,
    });
    const twin = await this.prisma.farmDigitalTwin.findFirst({
      where: { farmUnitId, organizationId },
    });
    return { current: twin?.thematicIndicators ?? {}, history: snapshots };
  }

  async captureKpiSnapshots(organizationId: string, farmUnitId: string) {
    const twin = await this.refresh(organizationId, farmUnitId);
    if (!twin) return [];

    const kpis = [
      { code: 'KPI-FTIP-01', value: twin.activeCropStandCount },
      { code: 'KPI-FTIP-04', value: Number(twin.avgYieldKgHa ?? 0) },
      { code: 'KPI-FTIP-07', value: Number((twin.thematicIndicators as Record<string, number>)?.forestCoverPct ?? 0) },
      { code: 'KPI-FTIP-11', value: twin.statusSummary === 'active' ? 1 : 0 },
      { code: 'KPI-FTIP-17', value: twin.documentCompletenessPct },
      { code: 'KPI-FTIP-18', value: Number(twin.productionYtdKg ?? 0) },
    ];

    await this.prisma.territoryKpiSnapshot.createMany({
      data: kpis.map((k) => ({
        organizationId,
        farmUnitId,
        kpiCode: k.code,
        kpiValue: k.value,
      })),
    });

    return kpis;
  }
}
