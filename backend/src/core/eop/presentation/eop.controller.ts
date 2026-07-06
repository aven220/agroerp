import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  EopLogPayload,
  EopMetricPayload,
  EopMobileTelemetryPayload,
  EopRumPayload,
  EopTraceSpanPayload,
} from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { Public } from '@/shared/presentation/decorators/public.decorator';
import { ObsCenterService } from '../application/obs-center.service';
import { ObsLoggingService } from '../application/obs-logging.service';
import { ObsTracingService } from '../application/obs-tracing.service';
import { ObsMetricsService } from '../application/obs-metrics.service';
import { ObsHealthService } from '../application/obs-health.service';
import { ObsAlertsService } from '../application/obs-alerts.service';
import { ObsIncidentsService } from '../application/obs-incidents.service';
import { ObsServiceMapService } from '../application/obs-service-map.service';
import { ObsErrorsService } from '../application/obs-errors.service';
import { ObsAiService } from '../application/obs-ai.service';
import { ObsRumService } from '../application/obs-rum.service';
import { ObsMobileService } from '../application/obs-mobile.service';
import { ObsSyntheticService } from '../application/obs-synthetic.service';
import { ObsAuditService } from '../application/obs-audit.service';
import {
  CreateAlertRuleDto,
  IngestLogBatchDto,
  IngestLogDto,
  IngestMetricBatchDto,
  IngestMetricDto,
  IngestMobileBatchDto,
  IngestMobileDto,
  IngestRumDto,
  IngestTraceSpanDto,
  OpenIncidentDto,
  RecordAiUsageDto,
  RegisterSyntheticDto,
  TrackErrorDto,
  UpdateIncidentStatusDto,
} from './eop.dto';

@ApiTags('EOP — Enterprise Observability Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eop')
export class EopController {
  constructor(
    private readonly center: ObsCenterService,
    private readonly logging: ObsLoggingService,
    private readonly tracing: ObsTracingService,
    private readonly metrics: ObsMetricsService,
    private readonly health: ObsHealthService,
    private readonly alerts: ObsAlertsService,
    private readonly incidents: ObsIncidentsService,
    private readonly serviceMapService: ObsServiceMapService,
    private readonly errors: ObsErrorsService,
    private readonly ai: ObsAiService,
    private readonly rum: ObsRumService,
    private readonly mobile: ObsMobileService,
    private readonly synthetic: ObsSyntheticService,
    private readonly audit: ObsAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('observability:read')
  operationsCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.dashboard(user.organizationId);
  }

  @Get('logs')
  @RequirePermissions('observability:read')
  listLogs(
    @CurrentUser() user: { organizationId: string },
    @Query('level') level?: string,
    @Query('component') component?: string,
  ) {
    return this.logging.findAll(user.organizationId, { level, component });
  }

  @Post('logs')
  @RequirePermissions('observability:ingest')
  ingestLog(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestLogDto) {
    return this.logging.ingest(user.organizationId, dto as EopLogPayload);
  }

  @Post('logs/batch')
  @RequirePermissions('observability:ingest')
  ingestLogBatch(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestLogBatchDto) {
    return this.logging.ingestBatch(user.organizationId, dto.logs as EopLogPayload[]);
  }

  @Get('traces')
  @RequirePermissions('observability:read')
  listTraces(@CurrentUser() user: { organizationId: string }) {
    return this.tracing.listRecent(user.organizationId);
  }

  @Get('traces/:traceId')
  @RequirePermissions('observability:read')
  getTrace(@Param('traceId') traceId: string) {
    return this.tracing.getTrace(traceId);
  }

  @Post('traces')
  @RequirePermissions('observability:ingest')
  ingestTrace(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestTraceSpanDto) {
    return this.tracing.recordSpan(user.organizationId, dto as EopTraceSpanPayload);
  }

  @Get('metrics')
  @RequirePermissions('observability:read')
  listMetrics(@CurrentUser() user: { organizationId: string }, @Query('kind') kind?: string) {
    return this.metrics.list(user.organizationId, kind);
  }

  @Get('metrics/dashboard')
  @RequirePermissions('observability:read')
  metricsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.metrics.dashboard(user.organizationId);
  }

  @Post('metrics')
  @RequirePermissions('observability:ingest')
  ingestMetric(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestMetricDto) {
    return this.metrics.ingest(user.organizationId, dto as EopMetricPayload);
  }

  @Post('metrics/batch')
  @RequirePermissions('observability:ingest')
  ingestMetricBatch(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestMetricBatchDto) {
    return this.metrics.ingestBatch(user.organizationId, dto.metrics as EopMetricPayload[]);
  }

  @Get('health')
  @RequirePermissions('observability:read')
  healthStatus(@CurrentUser() user: { organizationId: string }) {
    return this.health.runAll(user.organizationId);
  }

  @Get('health/history')
  @RequirePermissions('observability:read')
  healthHistory(@CurrentUser() user: { organizationId: string }) {
    return this.health.latest(user.organizationId);
  }

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return this.health.checkApiLiveness();
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    return this.health.checkApiReadiness();
  }

  @Public()
  @Get('health/startup')
  @ApiOperation({ summary: 'Startup probe' })
  startup() {
    return this.health.checkStartup();
  }

  @Get('alerts')
  @RequirePermissions('observability:read')
  listAlerts(@CurrentUser() user: { organizationId: string }, @Query('all') all?: string) {
    return this.alerts.listAlerts(user.organizationId, all !== 'true');
  }

  @Get('alerts/rules')
  @RequirePermissions('observability:read')
  listAlertRules(@CurrentUser() user: { organizationId: string }) {
    return this.alerts.listRules(user.organizationId);
  }

  @Post('alerts/rules')
  @RequirePermissions('observability:alerts:manage')
  createAlertRule(@CurrentUser() user: { organizationId: string }, @Body() dto: CreateAlertRuleDto) {
    return this.alerts.createRule(user.organizationId, dto);
  }

  @Post('alerts/:id/acknowledge')
  @RequirePermissions('observability:alerts:manage')
  acknowledgeAlert(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.alerts.acknowledge(user.organizationId, id);
  }

  @Post('alerts/:id/resolve')
  @RequirePermissions('observability:alerts:manage')
  resolveAlert(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.alerts.resolve(user.organizationId, id);
  }

  @Get('incidents')
  @RequirePermissions('observability:read')
  listIncidents(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.incidents.list(user.organizationId, status);
  }

  @Get('incidents/timeline')
  @RequirePermissions('observability:read')
  incidentTimeline(@CurrentUser() user: { organizationId: string }) {
    return this.incidents.timeline(user.organizationId);
  }

  @Post('incidents')
  @RequirePermissions('observability:incidents:manage')
  openIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: OpenIncidentDto,
  ) {
    return this.incidents.open(user.organizationId, user.id, dto);
  }

  @Patch('incidents/:incidentKey/status')
  @RequirePermissions('observability:incidents:manage')
  updateIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('incidentKey') incidentKey: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.incidents.updateStatus(user.organizationId, incidentKey, dto.status, user.id, dto.note);
  }

  @Get('service-map')
  @RequirePermissions('observability:read')
  getServiceMap(@CurrentUser() user: { organizationId: string }) {
    return this.serviceMapService.graph(user.organizationId);
  }

  @Get('errors')
  @RequirePermissions('observability:read')
  listErrors(@CurrentUser() user: { organizationId: string }) {
    return this.errors.list(user.organizationId);
  }

  @Post('errors')
  @RequirePermissions('observability:ingest')
  trackError(@CurrentUser() user: { organizationId: string }, @Body() dto: TrackErrorDto) {
    return this.errors.track(user.organizationId, dto);
  }

  @Get('ai')
  @RequirePermissions('observability:read')
  aiSummary(@CurrentUser() user: { organizationId: string }) {
    return this.ai.summary(user.organizationId);
  }

  @Get('ai/history')
  @RequirePermissions('observability:read')
  aiHistory(@CurrentUser() user: { organizationId: string }) {
    return this.ai.list(user.organizationId);
  }

  @Post('ai')
  @RequirePermissions('observability:ingest')
  recordAi(@CurrentUser() user: { organizationId: string }, @Body() dto: RecordAiUsageDto) {
    return this.ai.record(user.organizationId, dto);
  }

  @Post('rum')
  @RequirePermissions('observability:ingest')
  ingestRum(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestRumDto) {
    return this.rum.ingest(user.organizationId, dto as EopRumPayload);
  }

  @Get('rum')
  @RequirePermissions('observability:read')
  listRum(@CurrentUser() user: { organizationId: string }) {
    return this.rum.list(user.organizationId);
  }

  @Get('synthetic')
  @RequirePermissions('observability:read')
  listSynthetic(@CurrentUser() user: { organizationId: string }) {
    return this.synthetic.list(user.organizationId);
  }

  @Post('synthetic')
  @RequirePermissions('observability:admin')
  registerSynthetic(@CurrentUser() user: { organizationId: string }, @Body() dto: RegisterSyntheticDto) {
    return this.synthetic.register(user.organizationId, dto);
  }

  @Post('synthetic/run')
  @RequirePermissions('observability:admin')
  runSynthetic(@CurrentUser() user: { organizationId: string }) {
    return this.synthetic.runAll(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('observability:audit:read')
  listAudit(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }

  @Get('mobile/telemetry')
  @ApiOperation({ summary: 'Telemetría móvil reciente' })
  @RequirePermissions('observability:read')
  mobileTelemetry(@CurrentUser() user: { organizationId: string }) {
    return this.mobile.list(user.organizationId);
  }

  @Post('mobile/telemetry')
  @ApiOperation({ summary: 'Ingest telemetría Android' })
  @RequirePermissions('observability:ingest')
  ingestMobile(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestMobileDto) {
    return this.mobile.ingest(user.organizationId, dto as EopMobileTelemetryPayload);
  }

  @Post('mobile/telemetry/batch')
  @RequirePermissions('observability:ingest')
  ingestMobileBatch(@CurrentUser() user: { organizationId: string }, @Body() dto: IngestMobileBatchDto) {
    return this.mobile.ingestBatch(user.organizationId, dto.events as EopMobileTelemetryPayload[]);
  }
}
