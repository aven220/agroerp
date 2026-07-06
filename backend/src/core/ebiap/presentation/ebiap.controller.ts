import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BiDashboardDefinition } from '@agroerp/shared';
import { BiDashboardService } from '../application/bi-dashboard.service';
import { BiWidgetService } from '../application/bi-widget.service';
import { BiKpiService } from '../application/bi-kpi.service';
import { BiReportService } from '../application/bi-report.service';
import { BiQueryDefinitionService } from '../application/bi-query-definition.service';
import { BiQueryEngineService } from '../application/bi-query-engine.service';
import { BiAggregationService } from '../application/bi-aggregation.service';
import { BiAnalysisService } from '../application/bi-analysis.service';
import { BiRealtimeService } from '../application/bi-realtime.service';
import { BiExportService } from '../application/bi-export.service';
import {
  AnalysisCompareDto,
  AnalysisRankingDto,
  CaptureKpiDto,
  CreateDashboardDto,
  CreateKpiDto,
  CreateQueryDto,
  CreateReportDto,
  DuplicateDashboardDto,
  ExportDataDto,
  PreviewQueryDto,
  PublishDashboardDto,
  ResolveWidgetsDto,
  RunReportDto,
  ScheduleReportDto,
  ShareDashboardDto,
  UpdateDashboardDto,
  UpdateKpiDto,
  UpdateQueryDto,
  UpdateReportDto,
} from './ebiap.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';

@ApiTags('EBIAP — Business Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ebiap')
export class EbiapController {
  constructor(
    private readonly dashboards: BiDashboardService,
    private readonly widgets: BiWidgetService,
    private readonly kpis: BiKpiService,
    private readonly reports: BiReportService,
    private readonly queries: BiQueryDefinitionService,
    private readonly queryEngine: BiQueryEngineService,
    private readonly aggregation: BiAggregationService,
    private readonly analysis: BiAnalysisService,
    private readonly realtime: BiRealtimeService,
    private readonly exportService: BiExportService,
  ) {}

  @Get('center')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Centro BI — resumen' })
  async center(@CurrentUser() user: { id: string; organizationId: string }) {
    const [executive, dashboards, kpis, reports] = await Promise.all([
      this.aggregation.getExecutiveSummary(user.organizationId),
      this.dashboards.findAll(user.organizationId, user.id),
      this.kpis.findAll(user.organizationId),
      this.reports.findAll(user.organizationId),
    ]);
    return {
      executive,
      dashboardCount: dashboards.length,
      kpiCount: kpis.length,
      reportCount: reports.length,
      categories: dashboards.reduce(
        (acc, d) => {
          acc[d.category] = (acc[d.category] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      aiReadiness: executive.aiReadiness,
    };
  }

  @Get('realtime')
  @RequirePermissions('analytics:read')
  realtimeSnapshot(@CurrentUser() user: { organizationId: string }) {
    return this.realtime.getSnapshot(user.organizationId);
  }

  @Get('dashboards')
  @RequirePermissions('dashboard:read')
  listDashboards(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.dashboards.findAll(user.organizationId, user.id, { category, status });
  }

  @Post('dashboards')
  @RequirePermissions('dashboard:create')
  createDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboards.create(user.organizationId, user.id, {
      ...dto,
      definition: dto.definition as BiDashboardDefinition | undefined,
    });
  }

  @Get('dashboards/category/:category')
  @RequirePermissions('dashboard:read')
  categoryData(
    @CurrentUser() user: { organizationId: string },
    @Param('category') category: string,
  ) {
    return this.aggregation.getCategoryDashboard(user.organizationId, category);
  }

  @Get('dashboards/:id')
  @RequirePermissions('dashboard:read')
  getDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.dashboards.findOne(user.organizationId, id, user.id);
  }

  @Patch('dashboards/:id')
  @RequirePermissions('dashboard:update')
  updateDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboards.update(user.organizationId, id, user.id, {
      ...dto,
      definition: dto.definition as BiDashboardDefinition | undefined,
    });
  }

  @Delete('dashboards/:id')
  @RequirePermissions('dashboard:update')
  removeDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.dashboards.remove(user.organizationId, id, user.id);
  }

  @Post('dashboards/:id/duplicate')
  @RequirePermissions('dashboard:create')
  duplicateDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: DuplicateDashboardDto,
  ) {
    return this.dashboards.duplicate(user.organizationId, id, user.id, dto.dashboardKey, dto.name);
  }

  @Post('dashboards/:id/publish')
  @RequirePermissions('dashboard:publish')
  publishDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: PublishDashboardDto,
  ) {
    return this.dashboards.publish(user.organizationId, id, user.id, dto.changelog);
  }

  @Post('dashboards/:id/share')
  @RequirePermissions('dashboard:share')
  shareDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: ShareDashboardDto,
  ) {
    return this.dashboards.share(user.organizationId, id, user.id, dto.sharedWith, dto.permission);
  }

  @Get('dashboards/:id/versions')
  @RequirePermissions('dashboard:read')
  dashboardVersions(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.dashboards.listVersions(user.organizationId, id, user.id);
  }

  @Post('dashboards/:id/versions/:version/restore')
  @RequirePermissions('dashboard:update')
  restoreVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.dashboards.restoreVersion(user.organizationId, id, Number(version), user.id);
  }

  @Post('widgets/resolve')
  @RequirePermissions('analytics:read')
  resolveWidgets(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: ResolveWidgetsDto,
  ) {
    return this.widgets.resolveDashboard(
      user.organizationId,
      dto.widgets as unknown as import('@agroerp/shared').BiWidgetDefinition[],
      dto.category,
    );
  }

  @Get('kpis')
  @RequirePermissions('kpi:read')
  listKpis(@CurrentUser() user: { organizationId: string }) {
    return this.kpis.findAll(user.organizationId);
  }

  @Post('kpis')
  @RequirePermissions('kpi:create')
  createKpi(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateKpiDto,
  ) {
    return this.kpis.create(user.organizationId, user.id, {
      ...dto,
      alertRules: dto.alertRules as import('../application/bi-kpi.engine').KpiAlertRule[] | undefined,
      queryDef: dto.queryDef as import('@agroerp/shared').BiVisualQueryDefinition | undefined,
    });
  }

  @Get('kpis/realtime')
  @RequirePermissions('kpi:read')
  kpiRealtime(@CurrentUser() user: { organizationId: string }) {
    return this.kpis.getRealtime(user.organizationId);
  }

  @Get('kpis/:id')
  @RequirePermissions('kpi:read')
  getKpi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.kpis.findOne(user.organizationId, id);
  }

  @Patch('kpis/:id')
  @RequirePermissions('kpi:update')
  updateKpi(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateKpiDto,
  ) {
    return this.kpis.update(user.organizationId, id, {
      ...dto,
      alertRules: dto.alertRules as import('../application/bi-kpi.engine').KpiAlertRule[] | undefined,
      queryDef: dto.queryDef as import('@agroerp/shared').BiVisualQueryDefinition | undefined,
    });
  }

  @Delete('kpis/:id')
  @RequirePermissions('kpi:admin')
  removeKpi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.kpis.remove(user.organizationId, id);
  }

  @Get('kpis/:id/history')
  @RequirePermissions('kpi:read')
  kpiHistory(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.kpis.getHistory(user.organizationId, id);
  }

  @Post('kpis/:id/capture')
  @RequirePermissions('kpi:update')
  captureKpi(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: CaptureKpiDto,
  ) {
    return this.kpis.captureValue(user.organizationId, id, dto.value);
  }

  @Post('kpis/capture-all')
  @RequirePermissions('kpi:admin')
  captureAllKpis(@CurrentUser() user: { organizationId: string }) {
    return this.kpis.captureAll(user.organizationId);
  }

  @Get('reports')
  @RequirePermissions('analytics:read')
  listReports(@CurrentUser() user: { organizationId: string }) {
    return this.reports.findAll(user.organizationId);
  }

  @Post('reports')
  @RequirePermissions('analytics:create')
  createReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateReportDto,
  ) {
    return this.reports.create(user.organizationId, user.id, {
      ...dto,
      queryDef: dto.queryDef as unknown as import('@agroerp/shared').BiVisualQueryDefinition,
    });
  }

  @Get('reports/:id')
  @RequirePermissions('analytics:read')
  getReport(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.reports.findOne(user.organizationId, id);
  }

  @Patch('reports/:id')
  @RequirePermissions('analytics:update')
  updateReport(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reports.update(user.organizationId, id, {
      ...dto,
      queryDef: dto.queryDef as import('@agroerp/shared').BiVisualQueryDefinition | undefined,
    });
  }

  @Delete('reports/:id')
  @RequirePermissions('analytics:delete')
  removeReport(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.reports.remove(user.organizationId, id);
  }

  @Post('reports/:id/run')
  @RequirePermissions('report:export')
  runReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: RunReportDto,
  ) {
    return this.reports.run(
      user.organizationId,
      id,
      user.id,
      (dto.format ?? 'json') as 'json',
      dto.parameters,
    );
  }

  @Post('reports/:id/schedule')
  @RequirePermissions('report:schedule')
  scheduleReport(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: ScheduleReportDto,
  ) {
    return this.reports.schedule(user.organizationId, id, {
      ...dto,
      format: dto.format as import('@agroerp/shared').BiReportFormat | undefined,
    });
  }

  @Get('reports/:id/runs')
  @RequirePermissions('analytics:read')
  reportRuns(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.reports.listRuns(user.organizationId, id);
  }

  @Get('queries')
  @RequirePermissions('query:read')
  listQueries(@CurrentUser() user: { organizationId: string }) {
    return this.queries.findAll(user.organizationId);
  }

  @Post('queries')
  @RequirePermissions('query:create')
  createQuery(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateQueryDto,
  ) {
    return this.queries.create(user.organizationId, user.id, {
      ...dto,
      definition: { ...dto.definition, dataSource: dto.dataSource } as import('@agroerp/shared').BiVisualQueryDefinition,
    });
  }

  @Get('queries/:id')
  @RequirePermissions('query:read')
  getQuery(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.queries.findOne(user.organizationId, id);
  }

  @Patch('queries/:id')
  @RequirePermissions('query:create')
  updateQuery(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateQueryDto,
  ) {
    return this.queries.update(user.organizationId, id, {
      ...dto,
      definition: dto.definition as import('@agroerp/shared').BiVisualQueryDefinition | undefined,
    });
  }

  @Delete('queries/:id')
  @RequirePermissions('analytics:delete')
  removeQuery(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.queries.remove(user.organizationId, id);
  }

  @Post('queries/preview')
  @RequirePermissions('query:execute')
  previewQuery(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: PreviewQueryDto,
  ) {
    return this.queries.preview(user.organizationId, dto.definition as unknown as import('@agroerp/shared').BiVisualQueryDefinition);
  }

  @Post('queries/:id/execute')
  @RequirePermissions('query:execute')
  executeQuery(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() body?: { parameters?: Record<string, unknown> },
  ) {
    return this.queries.execute(user.organizationId, id, body?.parameters);
  }

  @Post('queries/execute')
  @RequirePermissions('query:execute')
  executeAdHoc(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: PreviewQueryDto,
  ) {
    return this.queryEngine.execute(user.organizationId, dto.definition as unknown as import('@agroerp/shared').BiVisualQueryDefinition);
  }

  @Post('export')
  @RequirePermissions('analytics:export')
  exportData(@Body() dto: ExportDataDto) {
    return this.exportService.export(
      dto.rows,
      dto.columns ?? [],
      dto.format as 'json',
      dto.title,
    );
  }

  @Get('analysis/geographic')
  @RequirePermissions('analytics:read')
  analysisGeographic(@CurrentUser() user: { organizationId: string }) {
    return this.analysis.geographic(user.organizationId);
  }

  @Get('analysis/financial')
  @RequirePermissions('analytics:read')
  analysisFinancial(@CurrentUser() user: { organizationId: string }) {
    return this.analysis.financial(user.organizationId);
  }

  @Get('analysis/operational')
  @RequirePermissions('analytics:read')
  analysisOperational(@CurrentUser() user: { organizationId: string }) {
    return this.analysis.operational(user.organizationId);
  }

  @Get('analysis/productivity')
  @RequirePermissions('analytics:read')
  analysisProductivity(@CurrentUser() user: { organizationId: string }) {
    return this.analysis.productivity(user.organizationId);
  }

  @Post('analysis/ranking')
  @RequirePermissions('analytics:read')
  analysisRanking(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: AnalysisRankingDto,
  ) {
    return this.analysis.ranking(
      user.organizationId,
      dto.dataSource,
      dto.groupField,
      dto.metricField ?? 'id',
      dto.fn ?? 'count',
      dto.limit ?? 10,
    );
  }

  @Post('analysis/compare')
  @RequirePermissions('analytics:read')
  analysisCompare(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: AnalysisCompareDto,
  ) {
    return this.analysis.compareHistorical(
      user.organizationId,
      dto.dataSource,
      dto.groupField,
      dto.period,
    );
  }

  @Get('analysis/top/:dataSource/:field')
  @RequirePermissions('analytics:read')
  analysisTop(
    @CurrentUser() user: { organizationId: string },
    @Param('dataSource') dataSource: string,
    @Param('field') field: string,
    @Query('n') n?: string,
  ) {
    return this.analysis.topN(user.organizationId, dataSource, field, Number(n ?? 10));
  }

  @Get('analysis/bottom/:dataSource/:field')
  @RequirePermissions('analytics:read')
  analysisBottom(
    @CurrentUser() user: { organizationId: string },
    @Param('dataSource') dataSource: string,
    @Param('field') field: string,
    @Query('n') n?: string,
  ) {
    return this.analysis.bottomN(user.organizationId, dataSource, field, Number(n ?? 10));
  }

  @Get('data-sources')
  @RequirePermissions('analytics:read')
  dataSources() {
    return {
      sources: [
        'producers', 'farms', 'lots', 'form_submissions', 'workflows', 'events',
        'lot_twins', 'farm_twins', 'kpi_history', 'notifications',
      ],
    };
  }
}
