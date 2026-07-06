import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmFoCenterService } from '../application/efm-fo-center.service';
import { EfmFoStatementService } from '../application/efm-fo-statement.service';
import { EfmFoClosingService } from '../application/efm-fo-closing.service';
import { EfmFoKpiService } from '../application/efm-fo-kpi.service';
import { EfmFoAnalyticsService } from '../application/efm-fo-analytics.service';
import { EfmFoReportService } from '../application/efm-fo-report.service';
import { EfmFoAiService } from '../application/efm-fo-ai.service';
import {
  EfmFoCustomReportDto,
  EfmFoExportReportDto,
  EfmFoGenerateReportDto,
  EfmFoGenerateStatementDto,
  EfmFoLockPeriodDto,
  EfmFoReopenClosingDto,
  EfmFoRunCustomReportDto,
  EfmFoScenarioDto,
  EfmFoStartClosingDto,
  EfmFoStatementNoteDto,
} from './efm-fo.dto';
import type { EfmFoReportCategory, EfmFoStatementType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from '../application/efm-audit.service';

@ApiTags('EFM — Operaciones Financieras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm/fo')
export class EfmFoController {
  constructor(
    private readonly center: EfmFoCenterService,
    private readonly statements: EfmFoStatementService,
    private readonly closing: EfmFoClosingService,
    private readonly kpis: EfmFoKpiService,
    private readonly analytics: EfmFoAnalyticsService,
    private readonly reports: EfmFoReportService,
    private readonly ai: EfmFoAiService,
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  foCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('statements')
  @RequirePermissions('finance:read')
  listStatements(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('statementType') statementType?: EfmFoStatementType,
    @Query('companyKey') companyKey?: string,
  ) {
    return this.statements.list(user.organizationId, { periodKey, statementType, companyKey });
  }

  @Get('statements/:statementKey')
  @RequirePermissions('finance:read')
  getStatement(@CurrentUser() user: { organizationId: string }, @Param('statementKey') statementKey: string) {
    return this.statements.get(user.organizationId, statementKey);
  }

  @Post('statements/generate')
  @RequirePermissions('finance:fo_report')
  generateStatement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoGenerateStatementDto) {
    return this.statements.generate(user.organizationId, user.id, dto);
  }

  @Post('statements/:statementKey/notes')
  @RequirePermissions('finance:fo_report')
  addNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('statementKey') statementKey: string,
    @Body() dto: EfmFoStatementNoteDto,
  ) {
    return this.statements.addNote(user.organizationId, statementKey, user.id, dto);
  }

  @Get('closings')
  @RequirePermissions('finance:read')
  listClosings(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('status') status?: string,
  ) {
    return this.closing.list(user.organizationId, { periodKey, status });
  }

  @Get('closings/:closingKey')
  @RequirePermissions('finance:read')
  getClosing(@CurrentUser() user: { organizationId: string }, @Param('closingKey') closingKey: string) {
    return this.closing.get(user.organizationId, closingKey);
  }

  @Post('closings/start')
  @RequirePermissions('finance:fo_close')
  startClosing(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoStartClosingDto) {
    return this.closing.start(user.organizationId, user.id, dto);
  }

  @Post('closings/:closingKey/validate')
  @RequirePermissions('finance:fo_close')
  validateClosing(@CurrentUser() user: { id: string; organizationId: string }, @Param('closingKey') closingKey: string) {
    return this.closing.validate(user.organizationId, closingKey, user.id);
  }

  @Post('closings/:closingKey/complete')
  @RequirePermissions('finance:fo_close')
  completeClosing(@CurrentUser() user: { id: string; organizationId: string }, @Param('closingKey') closingKey: string) {
    return this.closing.complete(user.organizationId, closingKey, user.id);
  }

  @Post('closings/:closingKey/reopen')
  @RequirePermissions('finance:fo_close')
  reopenClosing(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('closingKey') closingKey: string,
    @Body() dto: EfmFoReopenClosingDto,
  ) {
    return this.closing.reopen(user.organizationId, closingKey, user.id, dto.reason);
  }

  @Post('periods/lock')
  @RequirePermissions('finance:fo_close')
  lockPeriod(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoLockPeriodDto) {
    return this.closing.lockPeriod(user.organizationId, dto.periodKey, user.id);
  }

  @Get('kpis')
  @RequirePermissions('finance:read')
  listKpis(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('companyKey') companyKey?: string,
  ) {
    return this.kpis.list(user.organizationId, periodKey, companyKey);
  }

  @Post('kpis/calculate')
  @RequirePermissions('finance:fo_report')
  calculateKpis(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey: string,
    @Query('companyKey') companyKey?: string,
  ) {
    return this.kpis.calculate(user.organizationId, periodKey, companyKey);
  }

  @Get('kpis/dashboard')
  @RequirePermissions('finance:read')
  kpiDashboard(@CurrentUser() user: { organizationId: string }, @Query('periodKey') periodKey?: string) {
    return this.kpis.dashboard(user.organizationId, periodKey);
  }

  @Get('analytics/monthly')
  @RequirePermissions('finance:read')
  monthlyCompare(
    @CurrentUser() user: { organizationId: string },
    @Query('year') year: string,
    @Query('kpiCode') kpiCode?: string,
  ) {
    return this.analytics.monthlyCompare(user.organizationId, Number(year), kpiCode);
  }

  @Get('analytics/annual')
  @RequirePermissions('finance:read')
  annualCompare(
    @CurrentUser() user: { organizationId: string },
    @Query('kpiCode') kpiCode: string,
    @Query('years') years: string,
  ) {
    return this.analytics.annualCompare(user.organizationId, kpiCode, years.split(',').map(Number));
  }

  @Get('analytics/by-company')
  @RequirePermissions('finance:read')
  byCompany(@CurrentUser() user: { organizationId: string }, @Query('periodKey') periodKey: string) {
    return this.analytics.byCompany(user.organizationId, periodKey);
  }

  @Get('analytics/by-branch')
  @RequirePermissions('finance:read')
  byBranch(@CurrentUser() user: { organizationId: string }, @Query('periodKey') periodKey: string) {
    return this.analytics.byBranch(user.organizationId, periodKey);
  }

  @Get('analytics/by-cost-center')
  @RequirePermissions('finance:read')
  byCostCenter(@CurrentUser() user: { organizationId: string }, @Query('budgetKey') budgetKey: string) {
    return this.analytics.byCostCenter(user.organizationId, budgetKey);
  }

  @Get('analytics/by-project')
  @RequirePermissions('finance:read')
  byProject(@CurrentUser() user: { organizationId: string }, @Query('budgetKey') budgetKey: string) {
    return this.analytics.byProject(user.organizationId, budgetKey);
  }

  @Get('analytics/trend')
  @RequirePermissions('finance:read')
  trend(
    @CurrentUser() user: { organizationId: string },
    @Query('kpiCode') kpiCode: string,
    @Query('months') months?: string,
  ) {
    return this.analytics.trendAnalysis(user.organizationId, kpiCode, months ? Number(months) : 12);
  }

  @Get('analytics/projection')
  @RequirePermissions('finance:read')
  projection(@CurrentUser() user: { organizationId: string }, @Query('horizonMonths') horizonMonths?: string) {
    return this.analytics.projection(user.organizationId, horizonMonths ? Number(horizonMonths) : 12);
  }

  @Get('scenarios')
  @RequirePermissions('finance:read')
  listScenarios(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.listScenarios(user.organizationId);
  }

  @Post('scenarios')
  @RequirePermissions('finance:fo_report')
  simulateScenario(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoScenarioDto) {
    return this.analytics.simulateScenario(user.organizationId, user.id, dto);
  }

  @Get('reports')
  @RequirePermissions('finance:read')
  listReports(@CurrentUser() user: { organizationId: string }, @Query('category') category?: EfmFoReportCategory) {
    return this.reports.list(user.organizationId, category);
  }

  @Get('reports/:reportKey')
  @RequirePermissions('finance:read')
  getReport(@CurrentUser() user: { organizationId: string }, @Param('reportKey') reportKey: string) {
    return this.reports.get(user.organizationId, reportKey);
  }

  @Post('reports/generate')
  @RequirePermissions('finance:fo_report')
  generateReport(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoGenerateReportDto) {
    return this.reports.generate(user.organizationId, user.id, dto);
  }

  @Post('reports/:reportKey/export')
  @RequirePermissions('finance:fo_report')
  exportReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reportKey') reportKey: string,
    @Body() dto: EfmFoExportReportDto,
  ) {
    return this.reports.export(user.organizationId, reportKey, user.id, dto.format);
  }

  @Get('custom-reports')
  @RequirePermissions('finance:read')
  listCustomReports(@CurrentUser() user: { organizationId: string }) {
    return this.reports.listCustomReports(user.organizationId);
  }

  @Post('custom-reports')
  @RequirePermissions('finance:fo_config')
  upsertCustomReport(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFoCustomReportDto) {
    return this.reports.upsertCustomReport(user.organizationId, user.id, dto);
  }

  @Post('custom-reports/:customReportKey/run')
  @RequirePermissions('finance:fo_report')
  runCustomReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('customReportKey') customReportKey: string,
    @Body() dto: EfmFoRunCustomReportDto,
  ) {
    return this.reports.runCustomReport(user.organizationId, user.id, customReportKey, dto.periodKey);
  }

  @Get('ai/insights')
  @RequirePermissions('finance:read')
  listInsights(@CurrentUser() user: { organizationId: string }, @Query('insightType') insightType?: string) {
    return this.ai.list(user.organizationId, insightType as never);
  }

  @Post('ai/generate')
  @RequirePermissions('finance:fo_ai')
  generateInsights(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
  ) {
    return this.ai.generateAll(user.organizationId, periodKey);
  }

  @Get('alerts')
  @RequirePermissions('finance:read')
  listAlerts(@CurrentUser() user: { organizationId: string }, @Query('unread') unread?: string) {
    return this.prisma.efmFoFinancialAlert.findMany({
      where: {
        organizationId: user.organizationId,
        ...(unread === 'true' ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('alerts/:alertKey/read')
  @RequirePermissions('finance:read')
  markAlertRead(@CurrentUser() user: { organizationId: string }, @Param('alertKey') alertKey: string) {
    return this.prisma.efmFoFinancialAlert.updateMany({
      where: { organizationId: user.organizationId, alertKey },
      data: { isRead: true },
    });
  }

  @Get('dashboard/executive')
  @RequirePermissions('finance:read')
  executiveDashboard(@CurrentUser() user: { organizationId: string }, @Query('periodKey') periodKey?: string) {
    const org = user.organizationId;
    const pk = periodKey ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return Promise.all([
      this.center.center(org),
      this.kpis.dashboard(org, pk),
      this.statements.list(org, { periodKey: pk }),
      this.ai.list(org),
      this.closing.list(org, { periodKey: pk }),
    ]).then(([center, kpiDashboard, statements, insights, closings]) => ({
      center,
      kpiDashboard,
      statements,
      insights,
      closings,
      periodKey: pk,
    }));
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.center.mobileSync(user.organizationId);
  }

  @Get('audit/recent')
  @RequirePermissions('finance:read')
  recentAudit(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId, undefined, 100);
  }
}
