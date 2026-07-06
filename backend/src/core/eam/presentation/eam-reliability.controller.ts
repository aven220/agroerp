import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EamConditionMetricKind, EamEnergyType } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EamAuditService } from '../application/eam-audit.service';
import { EamConditionService } from '../application/eam-condition.service';
import { EamDigitalTwinService } from '../application/eam-digital-twin.service';
import { EamEnergyService } from '../application/eam-energy.service';
import { EamIotService } from '../application/eam-iot.service';
import { EamPredictiveService } from '../application/eam-predictive.service';
import { EamReliabilityAnalyticsService } from '../application/eam-reliability-analytics.service';
import { EamReliabilityEngineService, EamReliabilityOfflineService } from '../application/eam-reliability-engine.service';
import { EamReliabilityIndicatorsService } from '../application/eam-reliability-indicators.service';
import { EamReliabilityMetricsService } from '../application/eam-reliability-metrics.service';
import { EamReliabilitySimulationService } from '../application/eam-reliability-simulation.service';
import {
  EamConditionReadingDto,
  EamDigitalTwinSlotDto,
  EamDigitalTwinSyncDto,
  EamEnergyReadingDto,
  EamIotEventDto,
  EamIotSlotDto,
  EamMetricProfileDto,
  EamPredictiveSuggestionDto,
  EamReliabilityEventDto,
  EamRelOfflineBatchDto,
  EamSimulationDto,
  EamSimulationScenarioDto,
} from './eam-reliability.dto';

@ApiTags('EAM — Reliability & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eam/reliability')
export class EamReliabilityController {
  constructor(
    private readonly engine: EamReliabilityEngineService,
    private readonly condition: EamConditionService,
    private readonly iot: EamIotService,
    private readonly predictive: EamPredictiveService,
    private readonly metrics: EamReliabilityMetricsService,
    private readonly energy: EamEnergyService,
    private readonly analyticsService: EamReliabilityAnalyticsService,
    private readonly simulation: EamReliabilitySimulationService,
    private readonly digitalTwin: EamDigitalTwinService,
    private readonly indicators: EamReliabilityIndicatorsService,
    private readonly offline: EamReliabilityOfflineService,
    private readonly audit: EamAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('asset_management:reliability')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('asset_management:reliability')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('asset_management:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId, undefined, 100).then((rows) =>
      rows.filter((r) =>
        ['condition_reading', 'reliability_computed', 'energy_recorded', 'alert_raised',
          'simulation_run', 'iot_event_queued', 'predictive_slot_ready', 'digital_twin_sync'].includes(r.action),
      ),
    );
  }

  @Get('dashboard/executive')
  @RequirePermissions('asset_management:reliability')
  executiveDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('dashboard/energy')
  @RequirePermissions('asset_management:reliability')
  energyDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.energy.dashboard(user.organizationId);
  }

  @Get('dashboard/indicators')
  @RequirePermissions('asset_management:reliability')
  indicatorsPanel(@CurrentUser() user: { organizationId: string }) {
    return Promise.all([
      this.metrics.listSnapshots(user.organizationId),
      this.indicators.dashboard(user.organizationId),
    ]).then(([snapshots, dash]) => ({ snapshots, ...dash }));
  }

  @Post('indicators/compute')
  @RequirePermissions('asset_management:reliability')
  computeIndicators(@CurrentUser() user: { organizationId: string; id: string }) {
    return Promise.all([
      this.metrics.computeOrg(user.organizationId, user.id),
      this.energy.computeSnapshot(user.organizationId, user.id),
      this.analyticsService.compute(user.organizationId, user.id),
    ]).then(([reliability, energy, analytics]) => ({ reliability, energy, analytics }));
  }

  @Get('condition/profiles')
  @RequirePermissions('asset_management:reliability')
  listProfiles(@CurrentUser() user: { organizationId: string }, @Query('assetType') assetType?: string) {
    return this.condition.listProfiles(user.organizationId, assetType);
  }

  @Post('condition/profiles')
  @RequirePermissions('asset_management:reliability')
  createProfile(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamMetricProfileDto) {
    return this.condition.createProfile(
      user.organizationId, user.id, dto.assetType, dto.metricKind, dto.label,
      dto.unit, dto.warnThreshold, dto.critThreshold,
    );
  }

  @Get('condition/readings')
  @RequirePermissions('asset_management:reliability')
  listReadings(
    @CurrentUser() user: { organizationId: string },
    @Query('assetKey') assetKey?: string,
    @Query('metricKind') metricKind?: EamConditionMetricKind,
  ) {
    return this.condition.listReadings(user.organizationId, assetKey, metricKind);
  }

  @Post('condition/readings')
  @RequirePermissions('asset_management:reliability_execute')
  recordReading(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamConditionReadingDto) {
    return this.condition.recordReading(
      user.organizationId, user.id, dto.assetKey, dto.metricKind, dto.value, dto.unit, dto.source,
    );
  }

  @Get('condition/trend')
  @RequirePermissions('asset_management:reliability')
  conditionTrend(
    @CurrentUser() user: { organizationId: string },
    @Query('assetKey') assetKey: string,
    @Query('metricKind') metricKind: EamConditionMetricKind,
  ) {
    return this.condition.trend(user.organizationId, assetKey, metricKind);
  }

  @Get('iot/panel')
  @RequirePermissions('asset_management:reliability')
  iotPanel(@CurrentUser() user: { organizationId: string }) {
    return this.iot.panel(user.organizationId);
  }

  @Get('iot/slots')
  @RequirePermissions('asset_management:reliability')
  iotSlots(@CurrentUser() user: { organizationId: string }) {
    return this.iot.listSlots(user.organizationId);
  }

  @Post('iot/slots')
  @RequirePermissions('asset_management:reliability')
  registerIotSlot(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamIotSlotDto) {
    return this.iot.registerSlot(user.organizationId, user.id, dto.name, dto.protocol, dto.endpointConfig);
  }

  @Post('iot/events')
  @RequirePermissions('asset_management:reliability_execute')
  enqueueIotEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamIotEventDto) {
    return this.iot.enqueueEvent(user.organizationId, user.id, dto.slotKey, dto.payload, dto.assetKey);
  }

  @Get('predictive/slots')
  @RequirePermissions('asset_management:reliability')
  predictiveSlots(@CurrentUser() user: { organizationId: string }) {
    return this.predictive.listSlots(user.organizationId);
  }

  @Post('predictive/suggest')
  @RequirePermissions('asset_management:reliability')
  predictiveSuggest(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamPredictiveSuggestionDto) {
    return this.predictive.requestSuggestion(user.organizationId, user.id, dto.assetKey);
  }

  @Get('reliability/events')
  @RequirePermissions('asset_management:reliability')
  reliabilityEvents(@CurrentUser() user: { organizationId: string }, @Query('assetKey') assetKey?: string) {
    return this.metrics.listEvents(user.organizationId, assetKey);
  }

  @Post('reliability/events')
  @RequirePermissions('asset_management:reliability_execute')
  recordReliabilityEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamReliabilityEventDto) {
    return this.metrics.recordEvent(
      user.organizationId, user.id, dto.assetKey, dto.eventType,
      dto.downtimeHours, dto.repairHours, dto.costImpact,
      new Date(dto.occurredAt), dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
    );
  }

  @Post('reliability/compute')
  @RequirePermissions('asset_management:reliability')
  computeReliability(@CurrentUser() user: { organizationId: string; id: string }, @Query('assetKey') assetKey?: string) {
    if (assetKey) return this.metrics.computeForAsset(user.organizationId, user.id, assetKey);
    return this.metrics.computeOrg(user.organizationId, user.id);
  }

  @Get('energy/readings')
  @RequirePermissions('asset_management:reliability')
  energyReadings(
    @CurrentUser() user: { organizationId: string },
    @Query('assetKey') assetKey?: string,
    @Query('energyType') energyType?: EamEnergyType,
  ) {
    return this.energy.listReadings(user.organizationId, assetKey, energyType);
  }

  @Post('energy/readings')
  @RequirePermissions('asset_management:reliability_execute')
  recordEnergy(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamEnergyReadingDto) {
    return this.energy.recordReading(
      user.organizationId, user.id, dto.energyType, dto.quantity,
      new Date(dto.periodStart), new Date(dto.periodEnd), dto.unitCost,
      dto.assetKey, dto.locationKey, dto.unit,
    );
  }

  @Get('analytics')
  @RequirePermissions('asset_management:reliability')
  analytics(@CurrentUser() user: { organizationId: string }) {
    return this.analyticsService.get(user.organizationId);
  }

  @Post('analytics/compute')
  @RequirePermissions('asset_management:reliability')
  computeAnalytics(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.analyticsService.compute(user.organizationId, user.id);
  }

  @Get('simulations')
  @RequirePermissions('asset_management:reliability')
  simulations(@CurrentUser() user: { organizationId: string }) {
    return this.simulation.list(user.organizationId);
  }

  @Post('simulations')
  @RequirePermissions('asset_management:reliability')
  createSimulation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamSimulationDto) {
    return this.simulation.create(
      user.organizationId, user.id, dto.name, dto.simulationType,
      dto.baseline as never, dto.parameters as never,
    );
  }

  @Post('simulations/{simulationKey}/scenarios')
  @RequirePermissions('asset_management:reliability')
  addScenario(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('simulationKey') simulationKey: string,
    @Body() dto: EamSimulationScenarioDto,
  ) {
    return this.simulation.addScenario(user.organizationId, user.id, simulationKey, dto.name, dto.parameters as never);
  }

  @Get('simulations/{simulationKey}/compare')
  @RequirePermissions('asset_management:reliability')
  compareSimulation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('simulationKey') simulationKey: string,
  ) {
    return this.simulation.compare(user.organizationId, user.id, simulationKey);
  }

  @Get('digital-twin/slots')
  @RequirePermissions('asset_management:reliability')
  twinSlots(@CurrentUser() user: { organizationId: string }, @Query('assetKey') assetKey?: string) {
    return this.digitalTwin.listSlots(user.organizationId, assetKey);
  }

  @Post('digital-twin/slots')
  @RequirePermissions('asset_management:reliability')
  registerTwin(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamDigitalTwinSlotDto) {
    return this.digitalTwin.registerSlot(user.organizationId, user.id, dto.assetKey, dto.syncConfig);
  }

  @Post('digital-twin/slots/{slotKey}/sync')
  @RequirePermissions('asset_management:reliability_execute')
  syncTwin(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('slotKey') slotKey: string,
    @Body() dto: EamDigitalTwinSyncDto,
  ) {
    return this.digitalTwin.syncState(user.organizationId, user.id, slotKey, dto.telemetry, dto.virtualState);
  }

  @Get('alerts')
  @RequirePermissions('asset_management:reliability')
  alerts(@CurrentUser() user: { organizationId: string }, @Query('unread') unread?: string) {
    return this.indicators.listAlerts(user.organizationId, unread === 'true');
  }

  @Post('alerts/{alertKey}/read')
  @RequirePermissions('asset_management:reliability')
  markAlertRead(@CurrentUser() user: { organizationId: string }, @Param('alertKey') alertKey: string) {
    return this.indicators.markAlertRead(user.organizationId, alertKey);
  }

  @Get('mobile/sync')
  @RequirePermissions('asset_management:reliability')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.offline.mobileSync(user.organizationId);
  }

  @Post('offline/batches')
  @RequirePermissions('asset_management:reliability_execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamRelOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/{batchKey}/sync')
  @RequirePermissions('asset_management:reliability_execute')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
