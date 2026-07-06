import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  formatExport,
  generateCustomReportKey,
  generateReportRunKey,
  REPORT_TYPES,
  type ReportType,
} from '../domain/escm-analytics.engine';
import { EscmAnalyticsAuditService } from './escm-analytics-audit.service';
import { EscmKpiService } from './escm-kpi.service';
import { EscmAnalyticsService } from './escm-analytics.service';
import { EscmOpsCenterService, type OpsFilters } from './escm-ops-center.service';

@Injectable()
export class EscmReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAnalyticsAuditService,
    private readonly kpi: EscmKpiService,
    private readonly analytics: EscmAnalyticsService,
    private readonly ops: EscmOpsCenterService,
  ) {}

  async generate(
    organizationId: string,
    reportType: string,
    userId?: string,
    filters?: OpsFilters,
  ) {
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
      throw new BadRequestException(`Tipo de reporte no válido: ${reportType}`);
    }
    const rows = await this.buildRows(organizationId, reportType as ReportType, filters);
    await this.audit.logAccess(organizationId, 'report', reportType, userId, filters);
    return { reportType, rows, rowCount: rows.length, filters: filters ?? {}, generatedAt: new Date().toISOString() };
  }

  async export(
    organizationId: string,
    reportType: string,
    format: 'csv' | 'excel' | 'pdf',
    userId?: string,
    filters?: OpsFilters,
  ) {
    const data = await this.generate(organizationId, reportType, userId, filters);
    const count = await this.prisma.escmReportRun.count({ where: { organizationId } });
    const runKey = generateReportRunKey(count + 1);
    const title = `Reporte ${reportType}`;
    const columns = data.rows.length ? Object.keys(data.rows[0]) : [];
    const exported = formatExport(format, title, data.rows, columns);

    await this.prisma.escmReportRun.create({
      data: {
        organizationId,
        runKey,
        reportType,
        format,
        filters: (filters ?? {}) as object,
        rowCount: data.rowCount,
        exportedBy: userId,
        metadata: { title },
      },
    });

    await this.audit.logAccess(organizationId, 'export', `${reportType}:${format}`, userId, filters);
    await this.core.emitUserAction(organizationId, 'EscmReportRun', runKey, EVENT_TYPES.ESCM_REPORT_EXPORTED, {
      reportType,
      format,
      rowCount: data.rowCount,
    });

    return {
      runKey,
      reportType,
      format,
      mimeType: exported.mimeType,
      extension: exported.extension,
      content: exported.content,
      rowCount: data.rowCount,
    };
  }

  listRuns(organizationId: string, reportType?: string) {
    return this.prisma.escmReportRun.findMany({
      where: { organizationId, ...(reportType ? { reportType } : {}) },
      orderBy: { exportedAt: 'desc' },
      take: 100,
    });
  }

  async createCustomReport(
    organizationId: string,
    userId: string,
    input: { name: string; reportType: string; definition?: Record<string, unknown> },
  ) {
    const count = await this.prisma.escmCustomReport.count({ where: { organizationId } });
    const reportKey = generateCustomReportKey(count + 1);
    const row = await this.prisma.escmCustomReport.create({
      data: {
        organizationId,
        reportKey,
        name: input.name,
        reportType: input.reportType,
        definition: (input.definition ?? {}) as object,
        createdBy: userId,
      },
    });
    await this.core.emitUserAction(organizationId, 'EscmCustomReport', reportKey, EVENT_TYPES.ESCM_CUSTOM_REPORT_CREATED, {
      name: input.name,
    });
    return row;
  }

  listCustomReports(organizationId: string) {
    return this.prisma.escmCustomReport.findMany({
      where: { organizationId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async runCustomReport(organizationId: string, reportKey: string, userId?: string) {
    const def = await this.prisma.escmCustomReport.findFirst({
      where: { organizationId, reportKey, isActive: true },
    });
    if (!def) throw new NotFoundException(`Reporte personalizado ${reportKey} no encontrado`);
    const filters = (def.definition as { filters?: OpsFilters })?.filters;
    return this.generate(organizationId, def.reportType, userId, filters);
  }

  private async buildRows(organizationId: string, reportType: ReportType, filters?: OpsFilters) {
    switch (reportType) {
      case 'commercial': {
        const dash = await this.ops.dashboard(organizationId, filters);
        return [dash as unknown as Record<string, unknown>];
      }
      case 'sales': {
        const orders = await this.prisma.escmSalesOrder.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5000,
          include: { customer: { select: { customerKey: true, legalName: true } } },
        });
        return orders.map((o) => ({
          orderKey: o.orderKey,
          customerKey: o.customer.customerKey,
          customerName: o.customer.legalName,
          status: o.status,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt.toISOString(),
        }));
      }
      case 'billing': {
        const invoices = await this.prisma.escmInvoice.findMany({
          where: { organizationId },
          orderBy: { issuedAt: 'desc' },
          take: 5000,
        });
        return invoices.map((i) => ({
          invoiceKey: i.invoiceKey,
          status: i.status,
          totalAmount: i.totalAmount,
          issuedAt: i.issuedAt?.toISOString() ?? '',
        }));
      }
      case 'receivables': {
        const rows = await this.prisma.escmReceivable.findMany({
          where: { organizationId },
          orderBy: { dueDate: 'asc' },
          take: 5000,
        });
        return rows.map((r) => ({
          receivableKey: r.receivableKey,
          invoiceKey: r.invoiceKey,
          status: r.status,
          balanceAmount: r.balanceAmount,
          dueDate: r.dueDate.toISOString(),
          riskClass: r.riskClass,
        }));
      }
      case 'collections': {
        const rows = await this.prisma.escmPayment.findMany({
          where: { organizationId },
          orderBy: { receivedAt: 'desc' },
          take: 5000,
        });
        return rows.map((p) => ({
          paymentKey: p.paymentKey,
          status: p.status,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          receivedAt: p.receivedAt.toISOString(),
        }));
      }
      case 'seller': {
        const kpis = await this.kpi.computeAll(organizationId, filters);
        return kpis.salesBySeller.map((s) => ({ sellerId: s.key, sales: s.amount, orders: s.count }));
      }
      case 'customer': {
        const kpis = await this.kpi.computeAll(organizationId, filters);
        return kpis.salesByCustomer.map((s) => ({ customerKey: s.key, sales: s.amount, orders: s.count }));
      }
      case 'product': {
        const kpis = await this.kpi.computeAll(organizationId, filters);
        return kpis.salesByProduct.map((s) => ({ itemKey: s.key, revenue: s.amount, lines: s.count }));
      }
      case 'profitability': {
        const insights = await this.analytics.customerInsights(organizationId);
        return insights.profitable.map((c) => ({
          customerKey: c.customerKey,
          legalName: c.legalName,
          sales: c.sales,
          receivables: c.receivables,
          profitabilityScore: c.profitabilityScore,
        }));
      }
      default:
        return [];
    }
  }
}
