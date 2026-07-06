import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EappAuditService } from '../application/eapp-audit.service';
import { EappEngineService, EappOfflineService } from '../application/eapp-engine.service';
import { EappGisService } from '../application/eapp-gis.service';
import { EappGeoService } from '../application/eapp-geo.service';
import { EappSatelliteService } from '../application/eapp-satellite.service';
import { EappDroneService } from '../application/eapp-drone.service';
import { EappThematicService } from '../application/eapp-thematic.service';
import { EappIndexService } from '../application/eapp-index.service';
import { EappTelemetryService } from '../application/eapp-telemetry.service';
import { EappInspectionService } from '../application/eapp-inspection.service';
import { EappBridgeService, EappMonitoringService } from '../application/eapp-monitoring.service';
import {
  EappBridgeDto,
  EappCreateCustomIndexDto,
  EappCreateInfraDto,
  EappCreatePoiDto,
  EappCreateSubdivisionDto,
  EappCreateThematicMapDto,
  EappDroneAssetDto,
  EappDroneFlightDto,
  EappDroneMissionDto,
  EappIngestReadingDto,
  EappMeasureAreaDto,
  EappMeasureDistanceDto,
  EappMeasureLineDto,
  EappOfflineBatchDto,
  EappPolygonEditDto,
  EappRecordIndexReadingDto,
  EappRecordInspectionDto,
  EappRegisterDeviceDto,
  EappSatelliteSceneDto,
} from './eapp.dto';

@ApiTags('EAPP — Enterprise Agriculture Precision Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eapp')
export class EappController {
  constructor(
    private readonly engine: EappEngineService,
    private readonly monitoring: EappMonitoringService,
    private readonly gis: EappGisService,
    private readonly geo: EappGeoService,
    private readonly satellite: EappSatelliteService,
    private readonly drone: EappDroneService,
    private readonly thematic: EappThematicService,
    private readonly indices: EappIndexService,
    private readonly telemetry: EappTelemetryService,
    private readonly inspections: EappInspectionService,
    private readonly bridge: EappBridgeService,
    private readonly offline: EappOfflineService,
    private readonly audit: EappAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eapp:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eapp:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard')
  @RequirePermissions('eapp:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.dashboard(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('eapp:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('audit/map-edits')
  @RequirePermissions('eapp:audit')
  mapEdits(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findMapEdits(user.organizationId);
  }

  @Get('gis/map')
  @RequirePermissions('eapp:read')
  mapContext(@CurrentUser() user: { organizationId: string }) {
    return this.gis.mapContext(user.organizationId);
  }

  @Get('gis/layers')
  @RequirePermissions('eapp:read')
  listLayers(@CurrentUser() user: { organizationId: string }) {
    return this.gis.listLayers(user.organizationId);
  }

  @Get('gis/layers/:layerId/features')
  @RequirePermissions('eapp:read')
  layerFeatures(
    @CurrentUser() user: { organizationId: string },
    @Param('layerId') layerId: string,
    @Query('minLat') minLat: string,
    @Query('minLng') minLng: string,
    @Query('maxLat') maxLat: string,
    @Query('maxLng') maxLng: string,
  ) {
    return this.gis.getFeaturesInBbox(
      user.organizationId,
      layerId,
      Number(minLat),
      Number(minLng),
      Number(maxLat),
      Number(maxLng),
    );
  }

  @Post('gis/layers/:layerId/refresh')
  @RequirePermissions('eapp:config')
  refreshLayer(@CurrentUser() user: { organizationId: string; id: string }, @Param('layerId') layerId: string) {
    return this.gis.refreshLayer(user.organizationId, layerId, user.id);
  }

  @Post('gis/measure/area')
  @RequirePermissions('eapp:execute')
  measureArea(@Body() dto: EappMeasureAreaDto) {
    return this.gis.measureArea(dto.geometry);
  }

  @Post('gis/measure/distance')
  @RequirePermissions('eapp:execute')
  measureDistance(@Body() dto: EappMeasureDistanceDto) {
    return this.gis.measureDistance(dto.lat1, dto.lng1, dto.lat2, dto.lng2);
  }

  @Post('gis/measure/line')
  @RequirePermissions('eapp:execute')
  measureLine(@Body() dto: EappMeasureLineDto) {
    return this.gis.measureLineLength(dto.coordinates);
  }

  @Post('gis/measure/perimeter')
  @RequirePermissions('eapp:execute')
  measurePerimeter(@Body() dto: EappMeasureAreaDto) {
    return this.gis.measurePerimeter(dto.geometry);
  }

  @Post('gis/polygon-edit')
  @RequirePermissions('eapp:execute')
  logPolygonEdit(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappPolygonEditDto) {
    return this.gis.logPolygonEdit(user.organizationId, user.id, dto.entityType, dto.entityKey, dto.before, dto.after);
  }

  @Get('geo/pois')
  @RequirePermissions('eapp:read')
  listPois(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.geo.listPois(user.organizationId, fieldLotId);
  }

  @Post('geo/pois')
  @RequirePermissions('eapp:execute')
  createPoi(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappCreatePoiDto) {
    return this.geo.createPoi(user.organizationId, user.id, dto);
  }

  @Get('geo/infrastructure')
  @RequirePermissions('eapp:read')
  listInfra(@CurrentUser() user: { organizationId: string }, @Query('infraType') infraType?: string) {
    return this.geo.listInfrastructure(user.organizationId, infraType);
  }

  @Post('geo/infrastructure')
  @RequirePermissions('eapp:execute')
  createInfra(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappCreateInfraDto) {
    return this.geo.createInfrastructure(user.organizationId, user.id, dto);
  }

  @Get('geo/subdivisions')
  @RequirePermissions('eapp:read')
  listSubdivisions(@CurrentUser() user: { organizationId: string }, @Query('parentLotId') parentLotId?: string) {
    return this.geo.listSubdivisions(user.organizationId, parentLotId);
  }

  @Post('geo/subdivisions')
  @RequirePermissions('eapp:execute')
  createSubdivision(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappCreateSubdivisionDto) {
    return this.geo.createSubdivision(user.organizationId, user.id, dto);
  }

  @Get('satellite/providers')
  @RequirePermissions('eapp:read')
  satelliteProviders(@CurrentUser() user: { organizationId: string }) {
    return this.satellite.listProviders(user.organizationId);
  }

  @Get('satellite/catalog')
  @RequirePermissions('eapp:read')
  satelliteCatalog() {
    return this.satellite.providerCatalog();
  }

  @Get('satellite/scenes')
  @RequirePermissions('eapp:read')
  satelliteScenes(@CurrentUser() user: { organizationId: string }, @Query('vendor') vendor?: string) {
    return this.satellite.listScenes(user.organizationId, vendor);
  }

  @Post('satellite/scenes')
  @RequirePermissions('eapp:config')
  registerScene(@CurrentUser() user: { organizationId: string }, @Body() dto: EappSatelliteSceneDto) {
    return this.satellite.registerScene(user.organizationId, dto);
  }

  @Get('drones/assets')
  @RequirePermissions('eapp:read')
  droneAssets(@CurrentUser() user: { organizationId: string }) {
    return this.drone.listAssets(user.organizationId);
  }

  @Post('drones/assets')
  @RequirePermissions('eapp:config')
  registerDrone(@CurrentUser() user: { organizationId: string }, @Body() dto: EappDroneAssetDto) {
    return this.drone.registerAsset(user.organizationId, dto);
  }

  @Get('drones/missions')
  @RequirePermissions('eapp:read')
  droneMissions(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.drone.listMissions(user.organizationId, fieldLotId);
  }

  @Post('drones/missions')
  @RequirePermissions('eapp:execute')
  createMission(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappDroneMissionDto) {
    return this.drone.createMission(user.organizationId, user.id, {
      ...dto,
      plannedAt: dto.plannedAt ? new Date(dto.plannedAt) : undefined,
    });
  }

  @Get('drones/flights')
  @RequirePermissions('eapp:read')
  droneFlights(@CurrentUser() user: { organizationId: string }, @Query('missionId') missionId?: string) {
    return this.drone.listFlights(user.organizationId, missionId);
  }

  @Post('drones/flights')
  @RequirePermissions('eapp:execute')
  registerFlight(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappDroneFlightDto) {
    return this.drone.registerFlight(user.organizationId, user.id, dto);
  }

  @Get('thematic-maps')
  @RequirePermissions('eapp:read')
  thematicMaps(
    @CurrentUser() user: { organizationId: string },
    @Query('mapType') mapType?: string,
    @Query('fieldLotId') fieldLotId?: string,
  ) {
    return this.thematic.list(user.organizationId, mapType, fieldLotId);
  }

  @Get('thematic-maps/types')
  @RequirePermissions('eapp:read')
  thematicTypes() {
    return this.thematic.mapTypes();
  }

  @Post('thematic-maps')
  @RequirePermissions('eapp:execute')
  createThematicMap(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappCreateThematicMapDto) {
    return this.thematic.create(user.organizationId, user.id, {
      ...dto,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
    });
  }

  @Get('indices')
  @RequirePermissions('eapp:read')
  listIndices(@CurrentUser() user: { organizationId: string }) {
    return this.indices.list(user.organizationId);
  }

  @Get('indices/catalog')
  @RequirePermissions('eapp:read')
  indexCatalog() {
    return this.indices.catalog();
  }

  @Post('indices/custom')
  @RequirePermissions('eapp:config')
  createCustomIndex(@CurrentUser() user: { organizationId: string }, @Body() dto: EappCreateCustomIndexDto) {
    return this.indices.createCustom(user.organizationId, dto);
  }

  @Get('indices/readings')
  @RequirePermissions('eapp:read')
  indexReadings(
    @CurrentUser() user: { organizationId: string },
    @Query('indexKey') indexKey?: string,
    @Query('fieldLotId') fieldLotId?: string,
  ) {
    return this.indices.listReadings(user.organizationId, indexKey, fieldLotId);
  }

  @Post('indices/readings')
  @RequirePermissions('eapp:execute')
  recordIndexReading(@CurrentUser() user: { organizationId: string }, @Body() dto: EappRecordIndexReadingDto) {
    return this.indices.recordReading(user.organizationId, dto);
  }

  @Get('telemetry/devices')
  @RequirePermissions('eapp:read')
  telemetryDevices(@CurrentUser() user: { organizationId: string }, @Query('deviceType') deviceType?: string) {
    return this.telemetry.listDevices(user.organizationId, deviceType);
  }

  @Get('telemetry/types')
  @RequirePermissions('eapp:read')
  telemetryTypes() {
    return this.telemetry.deviceTypes();
  }

  @Post('telemetry/devices')
  @RequirePermissions('eapp:config')
  registerDevice(@CurrentUser() user: { organizationId: string }, @Body() dto: EappRegisterDeviceDto) {
    return this.telemetry.registerDevice(user.organizationId, dto);
  }

  @Get('telemetry/readings')
  @RequirePermissions('eapp:read')
  telemetryReadings(@CurrentUser() user: { organizationId: string }, @Query('deviceKey') deviceKey?: string) {
    return this.telemetry.listReadings(user.organizationId, deviceKey);
  }

  @Post('telemetry/readings')
  @RequirePermissions('eapp:execute')
  ingestReading(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappIngestReadingDto) {
    return this.telemetry.ingestReading(user.organizationId, user.id, dto);
  }

  @Get('inspections')
  @RequirePermissions('eapp:read')
  listInspections(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.inspections.list(user.organizationId, fieldLotId);
  }

  @Post('inspections')
  @RequirePermissions('eapp:execute')
  recordInspection(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappRecordInspectionDto) {
    return this.inspections.record(user.organizationId, user.id, dto);
  }

  @Post('bridge')
  @RequirePermissions('eapp:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('eapp:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches')
  @RequirePermissions('eapp:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EappOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync')
  @RequirePermissions('eapp:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
