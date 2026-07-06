import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmFoStatementService } from './efm-fo-statement.service';
import { EfmFoKpiService } from './efm-fo-kpi.service';
import { toCsv } from '../domain/efm-voucher.engine';
import { generateFoKey } from '../domain/efm-financial-ops.engine';
import type { EfmFoReportCategory, EfmFoReportFormat } from '@prisma/client';

export type GenerateReportInput = {
  name: string;
  category: EfmFoReportCategory;
  reportType: string;
  periodKey?: string;
  parameters?: Record<string, unknown>;
};

@Injectable()
export class EfmFoReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly statements: EfmFoStatementService,
    private readonly kpis: EfmFoKpiService,
  ) {}

  list(organizationId: string, category?: EfmFoReportCategory) {
    return this.prisma.efmFoReport.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: { generatedAt: 'desc' },
      include: { exports: { orderBy: { exportedAt: 'desc' }, take: 5 } },
    });
  }

  async get(organizationId: string, reportKey: string) {
    const report = await this.prisma.efmFoReport.findFirst({
      where: { organizationId, reportKey },
      include: { exports: true },
    });
    if (!report) throw new NotFoundException(`Reporte ${reportKey} no encontrado`);
    return report;
  }

  async generate(organizationId: string, userId: string, input: GenerateReportInput) {
    const seq = (await this.prisma.efmFoReport.count({ where: { organizationId } })) + 1;
    const reportKey = generateFoKey('RPT', seq);
    let payload: Record<string, unknown> = {};

    if (input.reportType === 'financial_statements' && input.periodKey) {
      payload = {
        balanceSheet: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'balance_sheet' }),
        incomeStatement: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'income_statement' }),
        cashFlow: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'cash_flow' }),
        equity: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'equity_changes' }),
      };
    } else if (input.reportType === 'kpi_dashboard' && input.periodKey) {
      payload = { kpis: await this.kpis.dashboard(organizationId, input.periodKey) };
    } else if (input.reportType === 'management' && input.periodKey) {
      payload = {
        kpis: await this.kpis.list(organizationId, input.periodKey),
        statements: await this.statements.list(organizationId, { periodKey: input.periodKey }),
      };
    } else if (input.reportType === 'budget') {
      const budgets = await this.prisma.efmBgBudget.findMany({ where: { organizationId, status: 'active' } });
      payload = { budgets };
    } else if (input.reportType === 'tax_base' && input.periodKey) {
      payload = {
        incomeStatement: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'income_statement' }),
        balanceSheet: await this.statements.list(organizationId, { periodKey: input.periodKey, statementType: 'balance_sheet' }),
      };
    } else if (input.reportType === 'accounting') {
      payload = { parameters: input.parameters ?? {} };
    } else {
      const customKey = String(input.parameters?.customReportKey ?? '');
      if (customKey) {
        const custom = await this.prisma.efmFoCustomReport.findFirst({ where: { organizationId, customReportKey: customKey } });
        payload = { custom, definition: custom?.definition ?? {} };
      }
    }

    const report = await this.prisma.efmFoReport.create({
      data: {
        organizationId,
        reportKey,
        name: input.name,
        category: input.category,
        reportType: input.reportType,
        periodKey: input.periodKey,
        parameters: { ...input.parameters, payload } as object,
        generatedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmFoReport', reportKey, 'generated', userId, { reportType: input.reportType });
    await this.core.emitUserAction(organizationId, 'EfmFoReport', reportKey, EVENT_TYPES.EFM_FO_REPORT_GENERATED, {
      reportType: input.reportType,
      periodKey: input.periodKey,
    });

    return report;
  }

  async export(
    organizationId: string,
    reportKey: string,
    userId: string,
    format: EfmFoReportFormat,
  ) {
    const report = await this.get(organizationId, reportKey);
    const params = report.parameters as Record<string, unknown>;
    const payload = params.payload ?? params;

    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      const rows = this.flattenForCsv(payload);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : ['key', 'value'];
      content = toCsv(rows, columns);
      contentType = 'text/csv';
      filename = `${report.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    } else if (format === 'excel') {
      content = JSON.stringify({ sheets: [{ name: report.name, data: payload }] });
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${report.name.replace(/\s+/g, '-').toLowerCase()}.xlsx.json`;
    } else if (format === 'pdf') {
      content = JSON.stringify({ title: report.name, sections: payload, generatedAt: report.generatedAt });
      contentType = 'application/pdf';
      filename = `${report.name.replace(/\s+/g, '-').toLowerCase()}.pdf.json`;
    } else {
      content = JSON.stringify(payload);
      contentType = 'application/json';
      filename = `${report.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    }

    const seq = (await this.prisma.efmFoReportExport.count({ where: { organizationId } })) + 1;
    const exportRecord = await this.prisma.efmFoReportExport.create({
      data: {
        organizationId,
        exportKey: generateFoKey('EXP', seq),
        reportKey,
        format,
        filename,
        contentType,
        fileSize: Buffer.byteLength(content, 'utf8'),
        exportedBy: userId,
        metadata: { content },
      },
    });

    await this.audit.log(organizationId, 'EfmFoReportExport', exportRecord.exportKey, 'exported', userId, { format });
    await this.core.emitUserAction(organizationId, 'EfmFoReportExport', exportRecord.exportKey, EVENT_TYPES.EFM_FO_REPORT_EXPORTED, {
      reportKey,
      format,
    });

    return { ...exportRecord, content };
  }

  listCustomReports(organizationId: string) {
    return this.prisma.efmFoCustomReport.findMany({
      where: { organizationId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertCustomReport(
    organizationId: string,
    userId: string,
    input: { customReportKey?: string; name: string; description?: string; definition: Record<string, unknown> },
  ) {
    const customReportKey = input.customReportKey ?? generateFoKey('CRPT', (await this.prisma.efmFoCustomReport.count({ where: { organizationId } })) + 1);
    const existing = await this.prisma.efmFoCustomReport.findFirst({ where: { organizationId, customReportKey } });
    if (existing) {
      return this.prisma.efmFoCustomReport.update({
        where: { id: existing.id },
        data: { name: input.name, description: input.description, definition: input.definition as object },
      });
    }
    return this.prisma.efmFoCustomReport.create({
      data: {
        organizationId,
        customReportKey,
        name: input.name,
        description: input.description,
        definition: input.definition as object,
        createdBy: userId,
      },
    });
  }

  async runCustomReport(organizationId: string, userId: string, customReportKey: string, periodKey?: string) {
    const custom = await this.prisma.efmFoCustomReport.findFirst({ where: { organizationId, customReportKey } });
    if (!custom) throw new NotFoundException(`Reporte personalizado ${customReportKey} no encontrado`);
    return this.generate(organizationId, userId, {
      name: custom.name,
      category: 'custom',
      reportType: 'custom',
      periodKey,
      parameters: { customReportKey },
    });
  }

  private flattenForCsv(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
      return payload.map((item, i) => (typeof item === 'object' && item ? item as Record<string, unknown> : { index: i, value: item }));
    }
    if (typeof payload === 'object' && payload) {
      return Object.entries(payload as Record<string, unknown>).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
    }
    return [{ value: String(payload) }];
  }
}
