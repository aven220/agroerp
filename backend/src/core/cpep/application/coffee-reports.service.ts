import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeStatsService } from './coffee-stats.service';
import { CoffeeOpsService } from './coffee-ops.service';
import { CoffeeAuditService } from './coffee-audit.service';
import { periodRange, toCsv } from '../domain/analytics.engine';

@Injectable()
export class CoffeeReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly stats: CoffeeStatsService,
    private readonly ops: CoffeeOpsService,
    private readonly audit: CoffeeAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cpepReportRun.findMany({
      where: { organizationId },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    });
  }

  async getOne(organizationId: string, reportKey: string) {
    return this.prisma.cpepReportRun.findFirst({
      where: { organizationId, reportKey },
    });
  }

  async generate(
    organizationId: string,
    userId: string,
    input: {
      reportType: string;
      period?: 'day' | 'week' | 'month' | 'year' | 'custom';
      days?: number;
      format?: 'json' | 'csv' | 'excel' | 'pdf';
      filters?: Record<string, unknown>;
    },
  ) {
    const period = input.period ?? 'day';
    const range = periodRange(period, input.days);
    const format = input.format ?? 'json';
    const filters = input.filters ?? {};
    const reportKey = `RPT-${input.reportType}-${range.label}-${Date.now()}`;

    const { summary, rows, title } = await this.buildReport(
      organizationId,
      input.reportType,
      range.from,
      range.to,
      filters,
    );

    const exportPayload =
      format === 'csv' || format === 'excel'
        ? toCsv(rows)
        : format === 'pdf'
          ? this.toPdfText(title, summary, rows)
          : JSON.stringify({ summary, rows });

    const run = await this.prisma.cpepReportRun.create({
      data: {
        organizationId,
        reportKey,
        reportType: input.reportType,
        title,
        period: range.label,
        format,
        filters: filters as object,
        summary: summary as object,
        rows: rows as object[],
        exportPayload,
        generatedBy: userId,
      },
    });

    await this.ops.logAnalytics(organizationId, userId, 'export', input.reportType, filters, {
      reportKey,
      format,
      rows: rows.length,
    });
    await this.audit.log(organizationId, 'Report', reportKey, 'generated', userId, {
      reportType: input.reportType,
      format,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeReport',
      run.id,
      EVENT_TYPES.COFFEE_REPORT_GENERATED,
      { reportKey, reportType: input.reportType, format },
    );
    return run;
  }

  async customReport(
    organizationId: string,
    userId: string,
    input: {
      title?: string;
      metrics?: string[];
      groupBy?: string;
      period?: 'day' | 'week' | 'month' | 'year' | 'custom';
      days?: number;
      format?: 'json' | 'csv' | 'excel' | 'pdf';
      filters?: Record<string, unknown>;
    },
  ) {
    return this.generate(organizationId, userId, {
      reportType: 'custom',
      period: input.period,
      days: input.days,
      format: input.format,
      filters: {
        ...input.filters,
        title: input.title,
        metrics: input.metrics,
        groupBy: input.groupBy,
      },
    });
  }

  private async buildReport(
    organizationId: string,
    reportType: string,
    from: Date,
    to: Date,
    filters: Record<string, unknown>,
  ) {
    const tickets = await this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        createdAt: { gte: from, lte: to },
        ...(filters.producerId ? { producerId: String(filters.producerId) } : {}),
        ...(filters.farmId ? { farmId: String(filters.farmId) } : {}),
        ...(filters.lotCode ? { lotCode: String(filters.lotCode) } : {}),
        ...(filters.purchaseCenterId ? { purchaseCenterId: String(filters.purchaseCenterId) } : {}),
      },
      include: { quality: true, settlement: true, inventoryLots: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const kpis = await this.stats.kpis(organizationId, days);

    switch (reportType) {
      case 'financial':
        return {
          title: 'Reporte financiero',
          summary: {
            amountTotal: kpis.amountTotal,
            paidTotal: kpis.paidTotal,
            bonusesTotal: kpis.bonusesTotal,
            penaltiesTotal: kpis.penaltiesTotal,
            avgPricePerKg: kpis.avgPricePerKg,
          },
          rows: tickets
            .filter((t) => t.settlement)
            .map((t) => ({
              ticketKey: t.ticketKey,
              producerName: t.producerName,
              netWeightKg: t.netWeightKg,
              totalAmount: t.settlement!.totalAmount,
              paidAmount: t.settlement!.paidAmount,
              bonusesTotal: t.settlement!.bonusesTotal,
              penaltiesTotal: t.settlement!.penaltiesTotal,
              paymentStatus: t.settlement!.paymentStatus,
            })),
        };
      case 'quality':
        return {
          title: 'Reporte de calidad',
          summary: {
            avgHumidity: kpis.avgHumidity,
            avgFactor: kpis.avgFactor,
            rejectRate: kpis.rejectRate,
            byGrade: kpis.byGrade,
          },
          rows: tickets
            .filter((t) => t.quality)
            .map((t) => ({
              ticketKey: t.ticketKey,
              producerName: t.producerName,
              farmName: t.farmName,
              humidityPct: t.quality!.humidityPct,
              factor: t.quality!.factor,
              grade: t.quality!.grade,
              decision: t.quality!.decision,
              qualityScore: t.quality!.qualityScore,
            })),
        };
      case 'audit':
        const audits = await this.prisma.cpepAuditLog.findMany({
          where: { organizationId, createdAt: { gte: from, lte: to } },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });
        return {
          title: 'Reporte de auditoría',
          summary: { events: audits.length },
          rows: audits.map((a) => ({
            entityType: a.entityType,
            entityKey: a.entityKey,
            action: a.action,
            userId: a.userId,
            createdAt: a.createdAt.toISOString(),
          })),
        };
      case 'producer':
        return {
          title: 'Reporte por productor',
          summary: { producers: Object.keys(kpis.byProducer).length },
          rows: Object.entries(kpis.byProducer).map(([producer, kg]) => ({ producer, kg })),
        };
      case 'farm':
        return {
          title: 'Reporte por finca',
          summary: { farms: Object.keys(kpis.byFarm).length },
          rows: Object.entries(kpis.byFarm).map(([farm, kg]) => ({ farm, kg })),
        };
      case 'lot':
        return {
          title: 'Reporte por lote',
          summary: { lots: tickets.length },
          rows: tickets.map((t) => ({
            ticketKey: t.ticketKey,
            lotCode: t.lotCode,
            inventoryLot: t.inventoryLots[0]?.lotKey,
            netWeightKg: t.netWeightKg,
            qualityGrade: t.quality?.grade,
            totalAmount: t.settlement?.totalAmount,
          })),
        };
      case 'weekly':
      case 'monthly':
      case 'yearly':
      case 'daily':
      default:
        return {
          title: `Reporte ${reportType}`,
          summary: {
            tickets: kpis.tickets,
            kgTotal: kpis.kgTotal,
            amountTotal: kpis.amountTotal,
            avgPricePerKg: kpis.avgPricePerKg,
            rejectRate: kpis.rejectRate,
          },
          rows: tickets.map((t) => ({
            ticketKey: t.ticketKey,
            producerName: t.producerName,
            farmName: t.farmName,
            lotCode: t.lotCode,
            status: t.status,
            netWeightKg: t.netWeightKg,
            humidityPct: t.quality?.humidityPct,
            factor: t.quality?.factor,
            grade: t.quality?.grade,
            totalAmount: t.settlement?.totalAmount,
            createdAt: t.createdAt.toISOString(),
          })),
        };
    }
  }

  private toPdfText(title: string, summary: Record<string, unknown>, rows: Array<Record<string, unknown>>): string {
    return [
      `PDF:${title}`,
      `Generated:${new Date().toISOString()}`,
      `Summary:${JSON.stringify(summary)}`,
      '---',
      ...rows.slice(0, 500).map((r) => JSON.stringify(r)),
    ].join('\n');
  }
}
