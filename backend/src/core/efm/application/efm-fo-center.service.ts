import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmFoStatementService } from './efm-fo-statement.service';
import { EfmFoClosingService } from './efm-fo-closing.service';
import { EfmFoKpiService } from './efm-fo-kpi.service';

@Injectable()
export class EfmFoCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly statements: EfmFoStatementService,
    private readonly closing: EfmFoClosingService,
    private readonly kpis: EfmFoKpiService,
  ) {}

  async center(organizationId: string) {
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [
      statementCount,
      closingRuns,
      activeClosings,
      kpiSnapshots,
      openAlerts,
      recentReports,
      recentExports,
      aiInsights,
      customReports,
    ] = await Promise.all([
      this.prisma.efmFoStatement.count({ where: { organizationId } }),
      this.prisma.efmFoClosingRun.count({ where: { organizationId } }),
      this.prisma.efmFoClosingRun.count({ where: { organizationId, status: { in: ['validating', 'in_progress'] } } }),
      this.prisma.efmFoKpiSnapshot.count({ where: { organizationId, periodKey } }),
      this.prisma.efmFoFinancialAlert.count({ where: { organizationId, isRead: false } }),
      this.prisma.efmFoReport.findMany({ where: { organizationId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
      this.prisma.efmFoReportExport.findMany({ where: { organizationId }, orderBy: { exportedAt: 'desc' }, take: 5 }),
      this.prisma.efmFoAiInsight.count({ where: { organizationId, isActive: true } }),
      this.prisma.efmFoCustomReport.count({ where: { organizationId, isActive: true } }),
    ]);

    const latestKpis = await this.prisma.efmFoKpiSnapshot.findMany({
      where: { organizationId, periodKey },
      take: 12,
      orderBy: { kpiCode: 'asc' },
    });

    return {
      statementCount,
      closingRuns,
      activeClosings,
      kpiSnapshots,
      openAlerts,
      aiInsights,
      customReports,
      recentReports,
      recentExports,
      latestKpis,
      periodKey,
      fiscalYear: new Date().getFullYear(),
    };
  }

  async seed(organizationId: string, userId: string) {
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const existing = await this.prisma.efmFoCustomReport.count({ where: { organizationId } });
    if (existing === 0) {
      await this.prisma.efmFoCustomReport.create({
        data: {
          organizationId,
          customReportKey: 'CRPT-EXEC-DASH',
          name: 'Dashboard ejecutivo financiero',
          description: 'Consolidado de KPIs y estados financieros',
          definition: { sections: ['kpis', 'balance_sheet', 'income_statement'], periodKey },
          createdBy: userId,
        },
      });
      await this.prisma.efmFoCustomReport.create({
        data: {
          organizationId,
          customReportKey: 'CRPT-TAX-BASE',
          name: 'Reporte tributario base',
          description: 'Base para declaraciones fiscales',
          definition: { sections: ['income_statement', 'balance_sheet'], category: 'tax' },
          createdBy: userId,
        },
      });
    }

    await this.statements.generate(organizationId, userId, {
      statementType: 'balance_sheet',
      periodKey,
    });
    await this.statements.generate(organizationId, userId, {
      statementType: 'income_statement',
      periodKey,
    });
    await this.kpis.calculate(organizationId, periodKey);
    await this.closing.initChecklistTemplate(organizationId);

    await this.audit.log(organizationId, 'EfmFoConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async mobileSync(organizationId: string) {
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [center, kpis, statements, alerts, closings] = await Promise.all([
      this.center(organizationId),
      this.kpis.list(organizationId, periodKey),
      this.statements.list(organizationId, { periodKey }),
      this.prisma.efmFoFinancialAlert.findMany({
        where: { organizationId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.efmFoClosingRun.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return { center, kpis, statements, alerts, closings, syncedAt: new Date().toISOString() };
  }
}
