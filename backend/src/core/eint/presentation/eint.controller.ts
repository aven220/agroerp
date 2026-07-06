import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BiVisualQueryDefinition } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EintAiService } from '../application/eint-ai.service';
import { EintAssistantService } from '../application/eint-assistant.service';
import { EintAuditService } from '../application/eint-audit.service';
import { EintBiService } from '../application/eint-bi.service';
import { EintDashboardService } from '../application/eint-dashboard.service';
import { EintDwhService, EintEtlService } from '../application/eint-dwh.service';
import { EintEngineService, EintOfflineService } from '../application/eint-engine.service';
import { EintBridgeService, EintMonitoringService } from '../application/eint-monitoring.service';
import { EintNotificationService } from '../application/eint-notification.service';
import { EintReportingService } from '../application/eint-reporting.service';
import {
  EintAiInvokeDto,
  EintAssistantChatDto,
  EintBridgeDto,
  EintChatDto,
  EintCompareDto,
  EintCreateDimensionDto,
  EintCreateEtlJobDto,
  EintCreateFactDto,
  EintCreateKpiDto,
  EintCreateNotificationRuleDto,
  EintCreateProviderDto,
  EintCreateReportDto,
  EintDispatchNotificationDto,
  EintLoadSnapshotDto,
  EintQueryDto,
  EintRunEtlDto,
  EintRunReportDto,
  EintScheduleReportDto,
  EintUpdateDashboardDto,
} from './eint.dto';

@ApiTags('EINT — Enterprise Intelligence Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eint')
export class EintController {
  constructor(
    private readonly engine: EintEngineService,
    private readonly ai: EintAiService,
    private readonly assistants: EintAssistantService,
    private readonly bi: EintBiService,
    private readonly reporting: EintReportingService,
    private readonly dashboardService: EintDashboardService,
    private readonly dwh: EintDwhService,
    private readonly etl: EintEtlService,
    private readonly notifications: EintNotificationService,
    private readonly monitoringService: EintMonitoringService,
    private readonly bridge: EintBridgeService,
    private readonly offline: EintOfflineService,
    private readonly audit: EintAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eint:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eint:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('eint:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('ai/catalog')
  @RequirePermissions('eint:read')
  aiCatalog() {
    return this.ai.catalog();
  }

  @Get('ai/providers')
  @RequirePermissions('eint:read')
  listProviders(@CurrentUser() user: { organizationId: string }) {
    return this.ai.listProviders(user.organizationId);
  }

  @Post('ai/providers')
  @RequirePermissions('eint:config')
  registerProvider(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintCreateProviderDto) {
    return this.ai.registerProvider(user.organizationId, user.id, dto.providerKey, dto.name, dto.vendor, dto);
  }

  @Post('ai/providers/:providerKey/activate')
  @RequirePermissions('eint:config')
  activateProvider(@CurrentUser() user: { organizationId: string; id: string }, @Param('providerKey') providerKey: string) {
    return this.ai.activateProvider(user.organizationId, user.id, providerKey);
  }

  @Post('ai/invoke')
  @RequirePermissions('eint:execute')
  invokeAi(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintAiInvokeDto) {
    return this.ai.invoke(user.organizationId, user.id, dto.serviceType, dto.prompt, dto.moduleRef);
  }

  @Post('ai/chat')
  @RequirePermissions('eint:execute')
  chat(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintChatDto) {
    return this.ai.chat(user.organizationId, user.id, dto.message);
  }

  @Get('ai/consumption')
  @RequirePermissions('eint:read')
  consumption(@CurrentUser() user: { organizationId: string }) {
    return this.ai.consumption(user.organizationId);
  }

  @Get('ai/usage')
  @RequirePermissions('eint:read')
  aiUsage(@CurrentUser() user: { organizationId: string }) {
    return this.ai.usageDashboard(user.organizationId);
  }

  @Get('assistants')
  @RequirePermissions('eint:read')
  listAssistants(@CurrentUser() user: { organizationId: string }) {
    return this.assistants.list(user.organizationId);
  }

  @Get('assistants/catalog')
  @RequirePermissions('eint:read')
  assistantCatalog() {
    return this.assistants.catalog();
  }

  @Post('assistants/:assistantKey/chat')
  @RequirePermissions('eint:execute')
  assistantChat(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assistantKey') assistantKey: string,
    @Body() dto: EintAssistantChatDto,
  ) {
    return this.assistants.chat(user.organizationId, user.id, assistantKey, dto.message);
  }

  @Get('dwh/dimensions')
  @RequirePermissions('eint:read')
  dimensions(@CurrentUser() user: { organizationId: string }) {
    return this.dwh.listDimensions(user.organizationId);
  }

  @Post('dwh/dimensions')
  @RequirePermissions('eint:config')
  createDimension(@CurrentUser() user: { organizationId: string }, @Body() dto: EintCreateDimensionDto) {
    return this.dwh.createDimension(user.organizationId, dto.dimensionKey, dto.name, dto.category, dto.sourceModule, dto.attributes);
  }

  @Get('dwh/facts')
  @RequirePermissions('eint:read')
  facts(@CurrentUser() user: { organizationId: string }) {
    return this.dwh.listFacts(user.organizationId);
  }

  @Post('dwh/facts')
  @RequirePermissions('eint:config')
  createFact(@CurrentUser() user: { organizationId: string }, @Body() dto: EintCreateFactDto) {
    return this.dwh.createFact(user.organizationId, dto.factKey, dto.name, dto.category, dto.sourceModule, dto.measures);
  }

  @Post('dwh/facts/:factKey/snapshot')
  @RequirePermissions('eint:execute')
  loadSnapshot(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('factKey') factKey: string,
    @Body() dto: EintLoadSnapshotDto,
  ) {
    return this.dwh.loadSnapshot(user.organizationId, factKey, dto.records, user.id);
  }

  @Get('dwh/snapshots')
  @RequirePermissions('eint:read')
  snapshots(@CurrentUser() user: { organizationId: string }) {
    return this.dwh.snapshots(user.organizationId);
  }

  @Get('etl/jobs')
  @RequirePermissions('eint:read')
  etlJobs(@CurrentUser() user: { organizationId: string }) {
    return this.etl.listJobs(user.organizationId);
  }

  @Post('etl/jobs')
  @RequirePermissions('eint:config')
  createEtlJob(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintCreateEtlJobDto) {
    return this.etl.createJob(user.organizationId, user.id, dto.jobKey, dto.name, dto.sourceModule, dto);
  }

  @Post('etl/jobs/:jobKey/publish')
  @RequirePermissions('eint:config')
  publishEtl(@Param('jobKey') jobKey: string, @CurrentUser() user: { organizationId: string }) {
    return this.etl.publishJob(user.organizationId, jobKey);
  }

  @Post('etl/jobs/:jobKey/run')
  @RequirePermissions('eint:execute')
  runEtl(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('jobKey') jobKey: string,
    @Body() dto: EintRunEtlDto,
  ) {
    return this.etl.runJob(user.organizationId, user.id, jobKey, dto.data ?? []);
  }

  @Get('etl/runs')
  @RequirePermissions('eint:read')
  etlRuns(@CurrentUser() user: { organizationId: string }) {
    return this.etl.runs(user.organizationId);
  }

  @Get('bi/kpis')
  @RequirePermissions('eint:read')
  kpiBindings(@CurrentUser() user: { organizationId: string }) {
    return this.bi.listBindings(user.organizationId);
  }

  @Post('bi/kpis')
  @RequirePermissions('eint:config')
  createKpi(@CurrentUser() user: { organizationId: string }, @Body() dto: EintCreateKpiDto) {
    return this.bi.createBinding(user.organizationId, dto.kpiKey, dto.name, dto.category, dto.moduleRef, dto.formula, dto.targetValue);
  }

  @Get('bi/ebiap-kpis')
  @RequirePermissions('eint:read')
  ebiapKpis(@CurrentUser() user: { organizationId: string }) {
    return this.bi.listEbiapKpis(user.organizationId);
  }

  @Post('bi/query')
  @RequirePermissions('eint:execute')
  runQuery(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintQueryDto) {
    return this.bi.executeQuery(user.organizationId, user.id, dto.query as unknown as BiVisualQueryDefinition);
  }

  @Post('bi/compare')
  @RequirePermissions('eint:read')
  compare(@Body() dto: EintCompareDto) {
    return this.bi.compare('', dto.values);
  }

  @Get('bi/queries')
  @RequirePermissions('eint:read')
  queryLogs(@CurrentUser() user: { organizationId: string }) {
    return this.bi.queryLogs(user.organizationId);
  }

  @Get('reports/templates')
  @RequirePermissions('eint:read')
  reportTemplates(@CurrentUser() user: { organizationId: string }) {
    return this.reporting.listTemplates(user.organizationId);
  }

  @Post('reports/templates')
  @RequirePermissions('eint:config')
  createReport(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintCreateReportDto) {
    return this.reporting.createTemplate(user.organizationId, user.id, dto.templateKey, dto.name, dto.category, dto.definition, dto);
  }

  @Post('reports/templates/:templateKey/publish')
  @RequirePermissions('eint:config')
  publishReport(@CurrentUser() user: { organizationId: string }, @Param('templateKey') templateKey: string) {
    return this.reporting.publishTemplate(user.organizationId, templateKey);
  }

  @Post('reports/templates/:templateKey/run')
  @RequirePermissions('eint:execute')
  runReport(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('templateKey') templateKey: string,
    @Body() dto: EintRunReportDto,
  ) {
    return this.reporting.runReport(user.organizationId, user.id, templateKey, dto.format, dto.filters);
  }

  @Get('reports/runs')
  @RequirePermissions('eint:read')
  reportRuns(@CurrentUser() user: { organizationId: string }) {
    return this.reporting.runs(user.organizationId);
  }

  @Post('reports/templates/:templateKey/schedule')
  @RequirePermissions('eint:config')
  scheduleReport(@CurrentUser() user: { organizationId: string }, @Param('templateKey') templateKey: string, @Body() dto: EintScheduleReportDto) {
    return this.reporting.schedule(user.organizationId, templateKey, dto.scheduleKey, dto.cron, dto.recipients);
  }

  @Get('dashboards')
  @RequirePermissions('eint:read')
  dashboards(@CurrentUser() user: { organizationId: string }) {
    return this.dashboardService.list(user.organizationId);
  }

  @Get('dashboards/catalog')
  @RequirePermissions('eint:read')
  dashboardCatalog() {
    return this.dashboardService.catalog();
  }

  @Get('dashboards/:dashboardKey')
  @RequirePermissions('eint:read')
  getDashboard(@CurrentUser() user: { organizationId: string; id: string }, @Param('dashboardKey') dashboardKey: string) {
    return this.dashboardService.getDashboard(user.organizationId, user.id, dashboardKey);
  }

  @Post('dashboards/:dashboardKey/layout')
  @RequirePermissions('eint:config')
  updateDashboard(@CurrentUser() user: { organizationId: string }, @Param('dashboardKey') dashboardKey: string, @Body() dto: EintUpdateDashboardDto) {
    return this.dashboardService.updateLayout(user.organizationId, dashboardKey, dto.layout, dto.widgets);
  }

  @Get('notifications/rules')
  @RequirePermissions('eint:read')
  notificationRules(@CurrentUser() user: { organizationId: string }) {
    return this.notifications.listRules(user.organizationId);
  }

  @Post('notifications/rules')
  @RequirePermissions('eint:config')
  createNotificationRule(@CurrentUser() user: { organizationId: string }, @Body() dto: EintCreateNotificationRuleDto) {
    return this.notifications.createRule(user.organizationId, dto.ruleKey, dto.name, dto.eventType, dto);
  }

  @Post('notifications/dispatch')
  @RequirePermissions('eint:execute')
  dispatchNotification(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintDispatchNotificationDto) {
    return this.notifications.dispatch(user.organizationId, user.id, dto.eventType, dto.payload);
  }

  @Get('notifications/deliveries')
  @RequirePermissions('eint:read')
  deliveries(@CurrentUser() user: { organizationId: string }) {
    return this.notifications.deliveries(user.organizationId);
  }

  @Get('notifications/inbox')
  @RequirePermissions('eint:read')
  inbox(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.notifications.getInbox(user.organizationId, user.id);
  }

  @Get('monitoring/dashboard')
  @RequirePermissions('eint:read')
  monitoring(@CurrentUser() user: { organizationId: string }) {
    return this.monitoringService.dashboard(user.organizationId);
  }

  @Get('bridge/modules')
  @RequirePermissions('eint:read')
  bridgeModules() {
    return this.bridge.moduleSlots();
  }

  @Post('bridge/analytics')
  @RequirePermissions('eint:execute')
  bridgeAnalytics(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EintBridgeDto) {
    return this.bridge.emitModuleAnalytics(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('eint:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }
}
