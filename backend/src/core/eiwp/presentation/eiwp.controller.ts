import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EiwpAuditService } from '../application/eiwp-audit.service';
import { EiwpAutomationService, EiwpFieldEventService, EiwpRecommendationService } from '../application/eiwp-automation.service';
import { EiwpAlertService } from '../application/eiwp-alert.service';
import { EiwpBalanceService } from '../application/eiwp-balance.service';
import { EiwpEngineService, EiwpOfflineService } from '../application/eiwp-engine.service';
import { EiwpIrrigationService } from '../application/eiwp-irrigation.service';
import { EiwpBridgeService, EiwpMonitoringService } from '../application/eiwp-monitoring.service';
import { EiwpWaterService } from '../application/eiwp-water.service';
import { EiwpWeatherService } from '../application/eiwp-weather.service';
import {
  EiwpAutomationCommandDto,
  EiwpAutomationDeviceDto,
  EiwpBridgeDto,
  EiwpCompleteIrrigationDto,
  EiwpComputeBalanceDto,
  EiwpForecastDto,
  EiwpGenerateAlertsDto,
  EiwpIncidentDto,
  EiwpLogConsumptionDto,
  EiwpOfflineBatchDto,
  EiwpRainfallDto,
  EiwpRecommendationDto,
  EiwpRegisterNetworkDto,
  EiwpRegisterSectorDto,
  EiwpRegisterSourceDto,
  EiwpRegisterStationDto,
  EiwpRescheduleDto,
  EiwpScheduleIrrigationDto,
  EiwpWeatherReadingDto,
} from './eiwp.dto';

@ApiTags('EIWP — Enterprise Irrigation & Water Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eiwp')
export class EiwpController {
  constructor(
    private readonly engine: EiwpEngineService,
    private readonly monitoring: EiwpMonitoringService,
    private readonly water: EiwpWaterService,
    private readonly irrigation: EiwpIrrigationService,
    private readonly weather: EiwpWeatherService,
    private readonly balance: EiwpBalanceService,
    private readonly alerts: EiwpAlertService,
    private readonly automation: EiwpAutomationService,
    private readonly recommendations: EiwpRecommendationService,
    private readonly fieldEvents: EiwpFieldEventService,
    private readonly bridge: EiwpBridgeService,
    private readonly offline: EiwpOfflineService,
    private readonly audit: EiwpAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eiwp:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eiwp:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard')
  @RequirePermissions('eiwp:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.dashboard(user.organizationId);
  }

  @Post('processes/run')
  @RequirePermissions('eiwp:execute')
  runProcesses(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.monitoring.runAutoProcesses(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('eiwp:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('water/sources')
  @RequirePermissions('eiwp:read')
  listSources(@CurrentUser() user: { organizationId: string }) {
    return this.water.listSources(user.organizationId);
  }

  @Post('water/sources')
  @RequirePermissions('eiwp:config')
  registerSource(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpRegisterSourceDto) {
    return this.water.registerSource(user.organizationId, user.id, dto);
  }

  @Get('water/networks')
  @RequirePermissions('eiwp:read')
  listNetworks(@CurrentUser() user: { organizationId: string }) {
    return this.water.listNetworks(user.organizationId);
  }

  @Post('water/networks')
  @RequirePermissions('eiwp:config')
  registerNetwork(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpRegisterNetworkDto) {
    return this.water.registerNetwork(user.organizationId, dto);
  }

  @Get('water/sectors')
  @RequirePermissions('eiwp:read')
  listSectors(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.water.listSectors(user.organizationId, fieldLotId);
  }

  @Post('water/sectors')
  @RequirePermissions('eiwp:config')
  registerSector(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpRegisterSectorDto) {
    return this.water.registerSector(user.organizationId, dto);
  }

  @Get('water/consumption')
  @RequirePermissions('eiwp:read')
  listConsumption(@CurrentUser() user: { organizationId: string }) {
    return this.water.listConsumption(user.organizationId);
  }

  @Post('water/consumption')
  @RequirePermissions('eiwp:execute')
  logConsumption(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpLogConsumptionDto) {
    return this.water.logConsumption(user.organizationId, user.id, dto);
  }

  @Get('irrigation/methods')
  @RequirePermissions('eiwp:read')
  irrigationMethods() {
    return this.irrigation.methods();
  }

  @Get('irrigation/schedules')
  @RequirePermissions('eiwp:read')
  listSchedules(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.irrigation.listSchedules(user.organizationId, fieldLotId);
  }

  @Post('irrigation/schedules')
  @RequirePermissions('eiwp:execute')
  schedule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpScheduleIrrigationDto) {
    return this.irrigation.schedule(user.organizationId, user.id, {
      ...dto,
      plannedStart: new Date(dto.plannedStart),
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
    });
  }

  @Post('irrigation/schedules/:scheduleKey/suspend')
  @RequirePermissions('eiwp:execute')
  suspend(@CurrentUser() user: { organizationId: string; id: string }, @Param('scheduleKey') scheduleKey: string) {
    return this.irrigation.suspend(user.organizationId, user.id, scheduleKey);
  }

  @Post('irrigation/schedules/:scheduleKey/reschedule')
  @RequirePermissions('eiwp:execute')
  reschedule(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('scheduleKey') scheduleKey: string,
    @Body() dto: EiwpRescheduleDto,
  ) {
    return this.irrigation.reschedule(
      user.organizationId,
      user.id,
      scheduleKey,
      new Date(dto.plannedStart),
      dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
    );
  }

  @Post('irrigation/schedules/:scheduleKey/complete')
  @RequirePermissions('eiwp:execute')
  complete(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('scheduleKey') scheduleKey: string,
    @Body() dto: EiwpCompleteIrrigationDto,
  ) {
    return this.irrigation.complete(user.organizationId, user.id, scheduleKey, dto);
  }

  @Get('irrigation/events')
  @RequirePermissions('eiwp:read')
  irrigationEvents(@CurrentUser() user: { organizationId: string }) {
    return this.irrigation.listEvents(user.organizationId);
  }

  @Get('weather/stations')
  @RequirePermissions('eiwp:read')
  listStations(@CurrentUser() user: { organizationId: string }) {
    return this.weather.listStations(user.organizationId);
  }

  @Post('weather/stations')
  @RequirePermissions('eiwp:config')
  registerStation(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpRegisterStationDto) {
    return this.weather.registerStation(user.organizationId, dto);
  }

  @Get('weather/readings')
  @RequirePermissions('eiwp:read')
  weatherReadings(@CurrentUser() user: { organizationId: string }, @Query('stationKey') stationKey?: string) {
    return this.weather.listReadings(user.organizationId, stationKey);
  }

  @Post('weather/readings')
  @RequirePermissions('eiwp:execute')
  ingestReading(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpWeatherReadingDto) {
    return this.weather.ingestReading(user.organizationId, dto);
  }

  @Get('weather/snapshot')
  @RequirePermissions('eiwp:read')
  climateSnapshot(@CurrentUser() user: { organizationId: string }) {
    return this.weather.latestClimateSnapshot(user.organizationId);
  }

  @Get('forecasts')
  @RequirePermissions('eiwp:read')
  listForecasts(@CurrentUser() user: { organizationId: string }, @Query('horizon') horizon?: string) {
    return this.weather.listForecasts(user.organizationId, horizon);
  }

  @Post('forecasts')
  @RequirePermissions('eiwp:config')
  registerForecast(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpForecastDto) {
    return this.weather.registerForecast(user.organizationId, user.id, {
      ...dto,
      validFrom: new Date(dto.validFrom),
      validTo: new Date(dto.validTo),
    });
  }

  @Get('balance')
  @RequirePermissions('eiwp:read')
  listBalances(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.balance.list(user.organizationId, fieldLotId);
  }

  @Post('balance/compute')
  @RequirePermissions('eiwp:execute')
  computeBalance(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpComputeBalanceDto) {
    return this.balance.compute(user.organizationId, user.id, {
      ...dto,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
    });
  }

  @Get('alerts')
  @RequirePermissions('eiwp:read')
  listAlerts(@CurrentUser() user: { organizationId: string }, @Query('active') active?: string) {
    return active === 'true' ? this.alerts.listActive(user.organizationId) : this.alerts.listAll(user.organizationId);
  }

  @Post('alerts/generate')
  @RequirePermissions('eiwp:execute')
  generateAlerts(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpGenerateAlertsDto) {
    return this.alerts.generateFromClimate(user.organizationId, user.id, dto);
  }

  @Post('alerts/:alertKey/resolve')
  @RequirePermissions('eiwp:execute')
  resolveAlert(@CurrentUser() user: { organizationId: string }, @Param('alertKey') alertKey: string) {
    return this.alerts.resolve(user.organizationId, alertKey);
  }

  @Get('automation/devices')
  @RequirePermissions('eiwp:read')
  automationDevices(@CurrentUser() user: { organizationId: string }) {
    return this.automation.listDevices(user.organizationId);
  }

  @Post('automation/devices')
  @RequirePermissions('eiwp:config')
  registerAutomation(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpAutomationDeviceDto) {
    return this.automation.registerDevice(user.organizationId, dto);
  }

  @Post('automation/commands')
  @RequirePermissions('eiwp:execute')
  issueCommand(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpAutomationCommandDto) {
    return this.automation.issueCommand(user.organizationId, user.id, dto);
  }

  @Get('recommendations')
  @RequirePermissions('eiwp:read')
  listRecommendations(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.recommendations.list(user.organizationId, fieldLotId);
  }

  @Post('recommendations')
  @RequirePermissions('eiwp:execute')
  generateRecommendation(@CurrentUser() user: { organizationId: string }, @Body() dto: EiwpRecommendationDto) {
    return this.recommendations.generate(user.organizationId, dto);
  }

  @Get('rainfall')
  @RequirePermissions('eiwp:read')
  listRainfall(@CurrentUser() user: { organizationId: string }) {
    return this.fieldEvents.listRainfall(user.organizationId);
  }

  @Post('rainfall')
  @RequirePermissions('eiwp:execute')
  recordRainfall(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpRainfallDto) {
    return this.fieldEvents.recordRainfall(user.organizationId, user.id, dto);
  }

  @Get('incidents')
  @RequirePermissions('eiwp:read')
  listIncidents(@CurrentUser() user: { organizationId: string }) {
    return this.fieldEvents.listIncidents(user.organizationId);
  }

  @Post('incidents')
  @RequirePermissions('eiwp:execute')
  recordIncident(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpIncidentDto) {
    return this.fieldEvents.recordIncident(user.organizationId, user.id, dto);
  }

  @Post('bridge')
  @RequirePermissions('eiwp:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('eiwp:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches')
  @RequirePermissions('eiwp:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EiwpOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync')
  @RequirePermissions('eiwp:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
