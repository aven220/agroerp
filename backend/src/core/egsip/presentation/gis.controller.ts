import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';
import { LayerDefinitionService } from '../application/layer-definition.service';
import { LayerProjectionService } from '../application/layer-projection.service';
import { SpatialOpsService } from '../application/spatial-ops.service';
import { GeofenceService } from '../application/geofence.service';
import { RoutePlanService } from '../application/route-plan.service';
import { GisAnalysisService } from '../application/gis-analysis.service';
import { GisImportExportService } from '../application/gis-import-export.service';
import { GisDashboardService } from '../application/gis-dashboard.service';
import { GisReportsService } from '../application/gis-reports.service';
import { GisMobileSyncService } from '../application/gis-mobile-sync.service';
import { BasemapService } from '../application/basemap.service';
import { GeoEventsService } from '../application/geo-events.service';
import {
  AnalysisDto,
  BufferDto,
  ClusterDto,
  ContainsDto,
  CreateGeofenceDto,
  CreateLayerDto,
  CreateRouteDto,
  ExportGeoDto,
  GeofenceCheckDto,
  GeometryDto,
  GeocodeDto,
  ImportGeoDto,
  IntersectDto,
  MeasureDistanceDto,
  MobileSyncDto,
  OptimizeRouteDto,
  ReverseGeocodeDto,
} from './gis.dto';
import { GeoJsonPolygon } from '@/shared/spatial/geometry.util';

@ApiTags('EGSIP — Enterprise GIS & Spatial Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('gis')
export class GisController {
  constructor(
    private readonly layers: LayerDefinitionService,
    private readonly projection: LayerProjectionService,
    private readonly spatial: SpatialOpsService,
    private readonly geofences: GeofenceService,
    private readonly routes: RoutePlanService,
    private readonly analysis: GisAnalysisService,
    private readonly importExport: GisImportExportService,
    private readonly dashboard: GisDashboardService,
    private readonly reports: GisReportsService,
    private readonly mobileSyncService: GisMobileSyncService,
    private readonly basemaps: BasemapService,
    private readonly geoEvents: GeoEventsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('gis:read')
  getDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.getDashboard(user.organizationId);
  }

  @Get('timeline')
  @RequirePermissions('gis:read')
  getTimeline(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.getTimeline(user.organizationId, from, to);
  }

  @Get('layers')
  @RequirePermissions('gis:read')
  listLayers(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.layers.findAll(user.organizationId, status as never);
  }

  @Post('layers')
  @RequirePermissions('gis:layer:admin')
  createLayer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateLayerDto,
    @Req() req: AgroRequest,
  ) {
    return this.layers.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Patch('layers/:id')
  @RequirePermissions('gis:layer:admin')
  updateLayer(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateLayerDto,
    @Req() req: AgroRequest,
  ) {
    return this.layers.update(user.organizationId, id, dto, req.agroContext);
  }

  @Post('layers/:id/publish')
  @RequirePermissions('gis:layer:admin')
  publishLayer(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.layers.publish(user.organizationId, id, req.agroContext);
  }

  @Get('layers/:id/features')
  @RequirePermissions('gis:read')
  getFeatures(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Query('minLat') minLat: string,
    @Query('minLng') minLng: string,
    @Query('maxLat') maxLat: string,
    @Query('maxLng') maxLng: string,
    @Query('limit') limit?: string,
  ) {
    return this.projection.getFeaturesInBbox(
      user.organizationId,
      id,
      parseFloat(minLat),
      parseFloat(minLng),
      parseFloat(maxLat),
      parseFloat(maxLng),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('layers/:id/refresh')
  @RequirePermissions('gis:layer:admin')
  refreshLayer(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.projection.refreshLayer(user.organizationId, id, req.agroContext);
  }

  @Post('layers/refresh-all')
  @RequirePermissions('gis:layer:admin')
  refreshAll(
    @CurrentUser() user: { id: string; organizationId: string },
    @Req() req: AgroRequest,
  ) {
    return this.projection.refreshAll(user.organizationId, user.id, req.agroContext);
  }

  @Get('basemaps')
  @RequirePermissions('gis:read')
  listBasemaps(@CurrentUser() user: { organizationId: string }) {
    return this.basemaps.listBasemaps(user.organizationId);
  }

  @Post('measure/area')
  @RequirePermissions('gis:measure')
  measureArea(@Body() dto: GeometryDto) {
    return this.spatial.measureArea(dto.geometry);
  }

  @Post('measure/distance')
  @RequirePermissions('gis:measure')
  measureDistance(@Body() dto: MeasureDistanceDto) {
    return this.spatial.measureDistance(dto.lat1, dto.lng1, dto.lat2, dto.lng2);
  }

  @Post('measure/perimeter')
  @RequirePermissions('gis:measure')
  measurePerimeter(@Body() dto: GeometryDto) {
    return this.spatial.measurePerimeter(dto.geometry);
  }

  @Post('ops/centroid')
  @RequirePermissions('gis:measure')
  centroid(@Body() dto: GeometryDto) {
    return this.spatial.centroid(dto.geometry);
  }

  @Post('ops/buffer')
  @RequirePermissions('gis:analyze')
  buffer(@Body() dto: BufferDto) {
    return this.spatial.buffer(dto.geometry as unknown as GeoJsonPolygon, dto.distanceM);
  }

  @Post('ops/intersect')
  @RequirePermissions('gis:analyze')
  intersect(@Body() dto: IntersectDto) {
    return this.spatial.intersect(
      dto.geometryA as unknown as GeoJsonPolygon,
      dto.geometryB as unknown as GeoJsonPolygon,
    );
  }

  @Post('ops/validate')
  @RequirePermissions('gis:measure')
  validate(@Body() dto: GeometryDto) {
    return this.spatial.validate(dto.geometry);
  }

  @Post('ops/contains')
  @RequirePermissions('gis:read')
  contains(@Body() dto: ContainsDto) {
    return this.spatial.contains({ lat: dto.lat, lng: dto.lng }, dto.geometry as never);
  }

  @Post('ops/cluster')
  @RequirePermissions('gis:analyze')
  cluster(@Body() dto: ClusterDto) {
    return this.spatial.cluster(dto.points, dto.cellSizeDeg);
  }

  @Post('geofence/check')
  @RequirePermissions('gis:read')
  checkGeofence(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: GeofenceCheckDto,
    @Req() req: AgroRequest,
  ) {
    return this.geofences.checkPoint(
      user.organizationId,
      dto.lat,
      dto.lng,
      dto.entityType,
      dto.entityId,
      req.agroContext,
    );
  }

  @Get('geofences')
  @RequirePermissions('gis:read')
  listGeofences(@CurrentUser() user: { organizationId: string }) {
    return this.geofences.findAll(user.organizationId);
  }

  @Post('geofences')
  @RequirePermissions('gis:layer:admin')
  createGeofence(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateGeofenceDto,
  ) {
    return this.geofences.create(user.organizationId, user.id, dto);
  }

  @Get('geo-events')
  @RequirePermissions('gis:read')
  listGeoEvents(
    @CurrentUser() user: { organizationId: string },
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.geoEvents.listEvents(user.organizationId, {
      eventType: eventType as never,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('routes/optimize')
  @RequirePermissions('gis:route')
  optimizeRoute(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: OptimizeRouteDto,
  ) {
    return this.routes.optimize(user.organizationId, dto.stops);
  }

  @Get('routes')
  @RequirePermissions('gis:route')
  listRoutes(@CurrentUser() user: { organizationId: string }) {
    return this.routes.findAll(user.organizationId);
  }

  @Post('routes')
  @RequirePermissions('gis:route')
  createRoute(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateRouteDto,
    @Req() req: AgroRequest,
  ) {
    return this.routes.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Post('routes/:id/approve')
  @RequirePermissions('gis:route:approve')
  approveRoute(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.routes.approve(user.organizationId, id, user.id, req.agroContext);
  }

  @Get('routes/:id/export/gpx')
  @RequirePermissions('gis:route')
  @Header('Content-Type', 'application/gpx+xml')
  exportGpx(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.routes.exportGpx(user.organizationId, id);
  }

  @Post('analyze')
  @RequirePermissions('gis:analyze')
  startAnalysis(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: AnalysisDto,
    @Req() req: AgroRequest,
  ) {
    return this.analysis.startAnalysis(
      user.organizationId,
      user.id,
      dto.analysisType,
      dto.parameters ?? {},
      req.agroContext,
    );
  }

  @Get('analyze/:jobId')
  @RequirePermissions('gis:analyze')
  getAnalysis(
    @CurrentUser() user: { organizationId: string },
    @Param('jobId') jobId: string,
  ) {
    return this.analysis.getJob(user.organizationId, jobId);
  }

  @Post('import')
  @RequirePermissions('gis:import')
  importGeo(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportGeoDto,
    @Req() req: AgroRequest,
  ) {
    return this.importExport.importData(user.organizationId, user.id, dto, req.agroContext);
  }

  @Post('export')
  @RequirePermissions('gis:export')
  exportGeo(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ExportGeoDto,
    @Req() req: AgroRequest,
  ) {
    return this.importExport.exportData(
      user.organizationId,
      user.id,
      dto as never,
      req.agroContext,
    );
  }

  @Get('reports/:reportCode')
  @RequirePermissions('gis:export')
  getReport(
    @CurrentUser() user: { organizationId: string },
    @Param('reportCode') reportCode: string,
    @Query() query: Record<string, string>,
  ) {
    return this.reports.generate(user.organizationId, reportCode, query);
  }

  @Post('sync/mobile')
  @RequirePermissions('gis:capture')
  syncMobile(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: MobileSyncDto,
    @Req() req: AgroRequest,
  ) {
    return this.mobileSyncService.sync(user.organizationId, user.id, dto as never, req.agroContext);
  }

  @Post('geocode')
  @RequirePermissions('gis:read')
  geocode(@Body() dto: GeocodeDto) {
    return {
      query: dto.query,
      results: [],
      provider: 'nominatim-ready',
      message: 'Integración geocoding externo preparada',
    };
  }

  @Post('reverse-geocode')
  @RequirePermissions('gis:read')
  reverseGeocode(@Body() dto: ReverseGeocodeDto) {
    return {
      lat: dto.lat,
      lng: dto.lng,
      address: null,
      provider: 'nominatim-ready',
    };
  }
}
