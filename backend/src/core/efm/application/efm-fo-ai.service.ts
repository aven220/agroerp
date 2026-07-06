import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmFoKpiService } from './efm-fo-kpi.service';
import { EfmFoAnalyticsService } from './efm-fo-analytics.service';
import { EfmTrCashflowService } from './efm-tr-cashflow.service';
import { detectJournalAnomalies, generateFoKey, roundMoney } from '../domain/efm-financial-ops.engine';
import type { EfmFoInsightType } from '@prisma/client';

@Injectable()
export class EfmFoAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpis: EfmFoKpiService,
    private readonly analytics: EfmFoAnalyticsService,
    private readonly cashflow: EfmTrCashflowService,
  ) {}

  list(organizationId: string, insightType?: EfmFoInsightType) {
    return this.prisma.efmFoAiInsight.findMany({
      where: { organizationId, isActive: true, ...(insightType ? { insightType } : {}) },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async generateAll(organizationId: string, periodKey?: string) {
    const pk = periodKey ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const insights = await Promise.all([
      this.predictCashflow(organizationId, pk),
      this.predictLiquidity(organizationId, pk),
      this.detectAnomalies(organizationId, pk),
      this.estimateClosing(organizationId, pk),
      this.budgetRecommendations(organizationId, pk),
      this.riskAnalysis(organizationId, pk),
    ]);
    return insights.filter(Boolean);
  }

  async predictCashflow(organizationId: string, periodKey: string) {
    const projection = await this.cashflow.projection(organizationId, 90);
    const buckets = (projection as { projection?: Array<{ cumulativeBalance: number; period: string }> }).projection ?? [];
    const minBalance = buckets.reduce((min, b) => Math.min(min, b.cumulativeBalance), Infinity);
    return this.upsertInsight(organizationId, 'cashflow_prediction', periodKey, {
      title: 'Predicción flujo de caja 90 días',
      summary: minBalance < 0
        ? `Se proyecta déficit de caja en ${buckets.find((b) => b.cumulativeBalance < 0)?.period ?? 'próximas semanas'}`
        : 'Flujo de caja proyectado positivo en horizonte 90 días',
      confidence: 0.82,
      payload: { projection: buckets.slice(0, 12), minBalance },
    });
  }

  async predictLiquidity(organizationId: string, periodKey: string) {
    const kpiList = await this.kpis.list(organizationId, periodKey);
    const current = kpiList.find((k) => k.kpiCode === 'LIQ_CURRENT')?.value ?? 0;
    const quick = kpiList.find((k) => k.kpiCode === 'LIQ_QUICK')?.value ?? 0;
    return this.upsertInsight(organizationId, 'liquidity_prediction', periodKey, {
      title: 'Predicción de liquidez',
      summary: current < 1
        ? 'Razón corriente por debajo de 1 — riesgo de liquidez a corto plazo'
        : 'Indicadores de liquidez dentro de rangos aceptables',
      confidence: 0.78,
      payload: { currentRatio: current, quickRatio: quick },
    });
  }

  async detectAnomalies(organizationId: string, periodKey: string) {
    const entries = await this.prisma.efmJournalEntry.findMany({
      where: { organizationId, periodKey, status: 'posted' },
      include: { lines: true },
      take: 500,
    });
    const anomalies = detectJournalAnomalies(
      entries.map((e) => ({
        entryKey: e.entryKey,
        totalDebit: e.lines.reduce((s, l) => s + l.debit, 0),
        totalCredit: e.lines.reduce((s, l) => s + l.credit, 0),
        lineCount: e.lines.length,
      })),
    );
    return this.upsertInsight(organizationId, 'anomaly_detection', periodKey, {
      title: 'Detección de anomalías contables',
      summary: anomalies.length > 0
        ? `${anomalies.length} anomalías detectadas en asientos del período`
        : 'No se detectaron anomalías significativas',
      confidence: 0.85,
      payload: { anomalies: anomalies.slice(0, 20), total: anomalies.length },
    });
  }

  async estimateClosing(organizationId: string, periodKey: string) {
    const projection = await this.analytics.projection(organizationId, 3);
    const totalNet = projection.reduce((s, p) => s + p.netIncome, 0);
    return this.upsertInsight(organizationId, 'closing_estimate', periodKey, {
      title: 'Estimación de cierre financiero',
      summary: `Utilidad proyectada próximos 3 meses: ${roundMoney(totalNet).toLocaleString()} COP`,
      confidence: 0.7,
      payload: { projection, estimatedNetIncome: totalNet },
    });
  }

  async budgetRecommendations(organizationId: string, periodKey: string) {
    const overBudget = await this.prisma.efmBgAlert.findMany({
      where: { organizationId, isResolved: false },
      take: 10,
    });
    return this.upsertInsight(organizationId, 'budget_recommendation', periodKey, {
      title: 'Recomendaciones presupuestales',
      summary: overBudget.length > 0
        ? `${overBudget.length} alertas presupuestales requieren revisión`
        : 'Ejecución presupuestal dentro de parámetros',
      confidence: 0.8,
      payload: { alerts: overBudget, recommendation: overBudget.length > 0 ? 'Revisar traslados presupuestales' : 'Mantener control actual' },
    });
  }

  async riskAnalysis(organizationId: string, periodKey: string) {
    const kpiList = await this.kpis.list(organizationId, periodKey);
    const debtRatio = kpiList.find((k) => k.kpiCode === 'DEBT_RATIO')?.value ?? 0;
    const marginNet = kpiList.find((k) => k.kpiCode === 'MARGIN_NET')?.value ?? 0;
    const riskScore = roundMoney(debtRatio * 50 + (marginNet < 0 ? 30 : 0) + (debtRatio > 0.7 ? 20 : 0));
    return this.upsertInsight(organizationId, 'risk_analysis', periodKey, {
      title: 'Análisis de riesgo financiero',
      summary: riskScore > 50 ? 'Riesgo financiero elevado — revisar endeudamiento y márgenes' : 'Perfil de riesgo financiero moderado',
      confidence: 0.75,
      payload: { riskScore, debtRatio, marginNet, level: riskScore > 50 ? 'high' : riskScore > 25 ? 'medium' : 'low' },
    });
  }

  private async upsertInsight(
    organizationId: string,
    insightType: EfmFoInsightType,
    periodKey: string,
    input: { title: string; summary: string; confidence: number; payload: Record<string, unknown> },
  ) {
    const existing = await this.prisma.efmFoAiInsight.findFirst({
      where: { organizationId, insightType, periodKey, isActive: true },
    });
    if (existing) {
      return this.prisma.efmFoAiInsight.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          summary: input.summary,
          confidence: input.confidence,
          payload: input.payload as object,
          generatedAt: new Date(),
        },
      });
    }
    const seq = (await this.prisma.efmFoAiInsight.count({ where: { organizationId } })) + 1;
    return this.prisma.efmFoAiInsight.create({
      data: {
        organizationId,
        insightKey: generateFoKey('AI', seq),
        insightType,
        periodKey,
        title: input.title,
        summary: input.summary,
        confidence: input.confidence,
        payload: input.payload as object,
      },
    });
  }
}
