import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EpscmTmsTripStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EpscmTmsFleetService } from '../application/epscm-tms-fleet.service';
import { EpscmTmsDriverService } from '../application/epscm-tms-driver.service';
import { EpscmTmsRouteService } from '../application/epscm-tms-route.service';
import { EpscmTmsTripService } from '../application/epscm-tms-trip.service';
import { EpscmTmsDeliveryService } from '../application/epscm-tms-delivery.service';
import { EpscmTmsPodService } from '../application/epscm-tms-pod.service';
import { EpscmTmsCostService } from '../application/epscm-tms-cost.service';
import { EpscmTmsTelemetryService } from '../application/epscm-tms-telemetry.service';
import { EpscmTmsIndicatorsService } from '../application/epscm-tms-indicators.service';
import { EpscmTmsOfflineService } from '../application/epscm-tms-offline.service';
import { EpscmTmsEngineService } from '../application/epscm-tms-engine.service';
import {
  EpscmTmsAssignDriverDto,
  EpscmTmsAssignOrdersDto,
  EpscmTmsAssignVehicleDto,
  EpscmTmsAutoRouteDto,
  EpscmTmsBarcodeDeliveryDto,
  EpscmTmsCloseTripDto,
  EpscmTmsCostDto,
  EpscmTmsDeliveryCompleteDto,
  EpscmTmsDeliveryRejectDto,
  EpscmTmsDriverDto,
  EpscmTmsDriverStatusDto,
  EpscmTmsIncidentDto,
  EpscmTmsLicenseDto,
  EpscmTmsOfflineBatchDto,
  EpscmTmsOptimizeDto,
  EpscmTmsPodAttachmentDto,
  EpscmTmsPodDto,
  EpscmTmsRescheduleDto,
  EpscmTmsRouteDto,
  EpscmTmsRouteStopDto,
  EpscmTmsScheduleTripDto,
  EpscmTmsTelemetryDto,
  EpscmTmsVehicleDocDto,
  EpscmTmsVehicleDto,
  EpscmTmsVehicleTypeDto,
} from './epscm-tms.dto';

@ApiTags('EPSCM — TMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('epscm/tms')
export class EpscmTmsController {
  constructor(
    private readonly engine: EpscmTmsEngineService,
    private readonly fleet: EpscmTmsFleetService,
    private readonly driver: EpscmTmsDriverService,
    private readonly route: EpscmTmsRouteService,
    private readonly trip: EpscmTmsTripService,
    private readonly delivery: EpscmTmsDeliveryService,
    private readonly pod: EpscmTmsPodService,
    private readonly cost: EpscmTmsCostService,
    private readonly telemetry: EpscmTmsTelemetryService,
    private readonly indicators: EpscmTmsIndicatorsService,
    private readonly offline: EpscmTmsOfflineService,
  ) {}

  @Get('center')
  @RequirePermissions('supply_chain:tms')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('supply_chain:tms')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard/logistics')
  @RequirePermissions('supply_chain:tms')
  logisticsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.logisticsDashboard(user.organizationId);
  }

  @Get('dashboard/costs')
  @RequirePermissions('supply_chain:tms')
  costDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.cost.dashboard(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('supply_chain:tms')
  audit(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.auditTrail(user.organizationId);
  }

  @Get('fleet/types')
  @RequirePermissions('supply_chain:tms')
  listVehicleTypes(@CurrentUser() user: { organizationId: string }) {
    return this.fleet.listTypes(user.organizationId);
  }

  @Post('fleet/types')
  @RequirePermissions('supply_chain:tms')
  createVehicleType(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsVehicleTypeDto) {
    return this.fleet.createType(user.organizationId, user.id, dto.code, dto.name, dto.maxWeight, dto.maxVolume);
  }

  @Get('fleet/vehicles')
  @RequirePermissions('supply_chain:tms')
  listVehicles(@CurrentUser() user: { organizationId: string }) {
    return this.fleet.listVehicles(user.organizationId);
  }

  @Get('fleet/vehicles/:vehicleKey')
  @RequirePermissions('supply_chain:tms')
  getVehicle(@CurrentUser() user: { organizationId: string }, @Param('vehicleKey') vehicleKey: string) {
    return this.fleet.getVehicle(user.organizationId, vehicleKey);
  }

  @Post('fleet/vehicles')
  @RequirePermissions('supply_chain:tms')
  createVehicle(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsVehicleDto) {
    return this.fleet.createVehicle(user.organizationId, user.id, dto);
  }

  @Post('fleet/vehicles/:vehicleKey/documents')
  @RequirePermissions('supply_chain:tms')
  addVehicleDoc(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('vehicleKey') vehicleKey: string,
    @Body() dto: EpscmTmsVehicleDocDto,
  ) {
    return this.fleet.addDocument(
      user.organizationId, user.id, vehicleKey, dto.docType,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined, dto.docNumber, dto.storageUrl,
    );
  }

  @Get('fleet/documents/expiring')
  @RequirePermissions('supply_chain:tms')
  expiringDocs(@CurrentUser() user: { organizationId: string }) {
    return this.fleet.expiringDocuments(user.organizationId);
  }

  @Get('drivers')
  @RequirePermissions('supply_chain:tms')
  listDrivers(@CurrentUser() user: { organizationId: string }) {
    return this.driver.list(user.organizationId);
  }

  @Get('drivers/:driverKey')
  @RequirePermissions('supply_chain:tms')
  getDriver(@CurrentUser() user: { organizationId: string }, @Param('driverKey') driverKey: string) {
    return this.driver.get(user.organizationId, driverKey);
  }

  @Post('drivers')
  @RequirePermissions('supply_chain:tms')
  createDriver(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsDriverDto) {
    return this.driver.create(user.organizationId, user.id, dto);
  }

  @Post('drivers/:driverKey/licenses')
  @RequirePermissions('supply_chain:tms')
  addLicense(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('driverKey') driverKey: string,
    @Body() dto: EpscmTmsLicenseDto,
  ) {
    return this.driver.addLicense(
      user.organizationId, user.id, driverKey, dto.category, dto.licenseNumber,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  @Patch('drivers/:driverKey/status')
  @RequirePermissions('supply_chain:tms')
  setDriverStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('driverKey') driverKey: string,
    @Body() dto: EpscmTmsDriverStatusDto,
  ) {
    return this.driver.setAvailability(user.organizationId, user.id, driverKey, dto.status);
  }

  @Get('drivers/licenses/expiring')
  @RequirePermissions('supply_chain:tms')
  expiringLicenses(@CurrentUser() user: { organizationId: string }) {
    return this.driver.expiringLicenses(user.organizationId);
  }

  @Get('routes')
  @RequirePermissions('supply_chain:tms')
  listRoutes(@CurrentUser() user: { organizationId: string }) {
    return this.route.list(user.organizationId);
  }

  @Post('routes')
  @RequirePermissions('supply_chain:tms')
  createRoute(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsRouteDto) {
    return this.route.create(user.organizationId, user.id, {
      ...dto,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
    });
  }

  @Post('routes/auto')
  @RequirePermissions('supply_chain:tms')
  autoRoute(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsAutoRouteDto) {
    return this.route.autoGenerateFromOrders(user.organizationId, user.id, dto.orderKeys);
  }

  @Post('routes/:routeKey/stops')
  @RequirePermissions('supply_chain:tms')
  addStop(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('routeKey') routeKey: string,
    @Body() dto: EpscmTmsRouteStopDto,
  ) {
    return this.route.addStop(user.organizationId, user.id, routeKey, {
      ...dto,
      windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
    });
  }

  @Post('routes/:routeKey/optimize')
  @RequirePermissions('supply_chain:tms')
  optimizeRoute(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('routeKey') routeKey: string,
    @Body() dto: EpscmTmsOptimizeDto,
  ) {
    return this.route.optimize(user.organizationId, user.id, routeKey, dto.mode, dto.maxWeight, dto.maxVolume);
  }

  @Post('routes/:routeKey/reschedule')
  @RequirePermissions('supply_chain:tms')
  rescheduleRoute(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('routeKey') routeKey: string,
    @Body() dto: EpscmTmsRescheduleDto,
  ) {
    return this.route.reschedule(user.organizationId, user.id, routeKey, new Date(dto.scheduledDate));
  }

  @Get('routes/:routeKey/grouping')
  @RequirePermissions('supply_chain:tms')
  routeGrouping(@CurrentUser() user: { organizationId: string }, @Param('routeKey') routeKey: string) {
    return this.route.groupingPreview(user.organizationId, routeKey);
  }

  @Get('trips')
  @RequirePermissions('supply_chain:tms')
  listTrips(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmTmsTripStatus,
  ) {
    return this.trip.list(user.organizationId, status);
  }

  @Get('trips/:tripKey')
  @RequirePermissions('supply_chain:tms')
  getTrip(@CurrentUser() user: { organizationId: string }, @Param('tripKey') tripKey: string) {
    return this.trip.get(user.organizationId, tripKey);
  }

  @Post('trips')
  @RequirePermissions('supply_chain:tms_execute')
  scheduleTrip(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsScheduleTripDto) {
    return this.trip.schedule(user.organizationId, user.id, dto.routeKey, dto.scheduledAt ? new Date(dto.scheduledAt) : undefined);
  }

  @Post('trips/:tripKey/vehicle')
  @RequirePermissions('supply_chain:tms_execute')
  assignVehicle(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('tripKey') tripKey: string,
    @Body() dto: EpscmTmsAssignVehicleDto,
  ) {
    return this.trip.assignVehicle(user.organizationId, user.id, tripKey, dto.vehicleKey);
  }

  @Post('trips/:tripKey/driver')
  @RequirePermissions('supply_chain:tms_execute')
  assignDriver(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('tripKey') tripKey: string,
    @Body() dto: EpscmTmsAssignDriverDto,
  ) {
    return this.trip.assignDriver(user.organizationId, user.id, tripKey, dto.driverKey);
  }

  @Post('trips/:tripKey/orders')
  @RequirePermissions('supply_chain:tms_execute')
  assignOrders(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('tripKey') tripKey: string,
    @Body() dto: EpscmTmsAssignOrdersDto,
  ) {
    return this.trip.assignOrders(user.organizationId, user.id, tripKey, dto.orderKeys);
  }

  @Post('trips/:tripKey/accept')
  @RequirePermissions('supply_chain:tms_execute')
  acceptTrip(@CurrentUser() user: { organizationId: string; id: string }, @Param('tripKey') tripKey: string) {
    return this.trip.acceptRoute(user.organizationId, user.id, tripKey);
  }

  @Post('trips/:tripKey/start')
  @RequirePermissions('supply_chain:tms_execute')
  startTrip(@CurrentUser() user: { organizationId: string; id: string }, @Param('tripKey') tripKey: string) {
    return this.trip.start(user.organizationId, user.id, tripKey);
  }

  @Post('trips/:tripKey/incidents')
  @RequirePermissions('supply_chain:tms_execute')
  recordIncident(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('tripKey') tripKey: string,
    @Body() dto: EpscmTmsIncidentDto,
  ) {
    return this.trip.recordIncident(user.organizationId, user.id, tripKey, dto.incidentType, dto.description);
  }

  @Post('trips/:tripKey/close')
  @RequirePermissions('supply_chain:tms_execute')
  closeTrip(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('tripKey') tripKey: string,
    @Body() dto: EpscmTmsCloseTripDto,
  ) {
    return this.trip.close(user.organizationId, user.id, tripKey, dto.observations);
  }

  @Get('deliveries')
  @RequirePermissions('supply_chain:tms')
  listDeliveries(@CurrentUser() user: { organizationId: string }, @Query('tripKey') tripKey?: string) {
    return this.delivery.list(user.organizationId, tripKey);
  }

  @Post('deliveries/:deliveryKey/complete')
  @RequirePermissions('supply_chain:tms_execute')
  completeDelivery(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body() dto: EpscmTmsDeliveryCompleteDto,
  ) {
    return this.delivery.complete(user.organizationId, user.id, deliveryKey, dto.deliveredQty, dto.issueNotes);
  }

  @Post('deliveries/:deliveryKey/reject')
  @RequirePermissions('supply_chain:tms_execute')
  rejectDelivery(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body() dto: EpscmTmsDeliveryRejectDto,
  ) {
    return this.delivery.reject(user.organizationId, user.id, deliveryKey, dto.rejectionReason);
  }

  @Post('deliveries/:deliveryKey/retry')
  @RequirePermissions('supply_chain:tms_execute')
  retryDelivery(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body('notes') notes?: string,
  ) {
    return this.delivery.scheduleRetry(user.organizationId, user.id, deliveryKey, notes);
  }

  @Post('deliveries/barcode')
  @RequirePermissions('supply_chain:tms_execute')
  barcodeDelivery(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsBarcodeDeliveryDto) {
    return this.delivery.confirmByBarcode(user.organizationId, user.id, dto.barcode, dto.deliveredQty);
  }

  @Get('pod')
  @RequirePermissions('supply_chain:tms')
  listPods(@CurrentUser() user: { organizationId: string }, @Query('deliveryKey') deliveryKey?: string) {
    return this.pod.list(user.organizationId, deliveryKey);
  }

  @Post('deliveries/:deliveryKey/pod')
  @RequirePermissions('supply_chain:tms_execute')
  capturePod(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body() dto: EpscmTmsPodDto,
  ) {
    return this.pod.capture(user.organizationId, user.id, deliveryKey, dto);
  }

  @Post('pod/:podKey/attachments')
  @RequirePermissions('supply_chain:tms_execute')
  addPodAttachment(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('podKey') podKey: string,
    @Body() dto: EpscmTmsPodAttachmentDto,
  ) {
    return this.pod.addAttachment(user.organizationId, user.id, podKey, dto.fileType, dto.storageUrl);
  }

  @Get('costs')
  @RequirePermissions('supply_chain:tms')
  listCosts(@CurrentUser() user: { organizationId: string }, @Query('tripKey') tripKey?: string) {
    return this.cost.list(user.organizationId, tripKey);
  }

  @Post('costs')
  @RequirePermissions('supply_chain:tms')
  recordCost(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsCostDto) {
    return this.cost.record(user.organizationId, user.id, dto);
  }

  @Get('telemetry')
  @RequirePermissions('supply_chain:tms')
  listTelemetry(@CurrentUser() user: { organizationId: string }) {
    return this.telemetry.list(user.organizationId);
  }

  @Post('telemetry/slots')
  @RequirePermissions('supply_chain:tms')
  provisionTelemetry(@CurrentUser() user: { organizationId: string }, @Body() dto: EpscmTmsTelemetryDto) {
    return this.telemetry.provisionSlot(user.organizationId, dto.slotType, dto.vehicleKey, dto.tripKey);
  }

  @Post('telemetry/bootstrap')
  @RequirePermissions('supply_chain:tms')
  bootstrapTelemetry(
    @CurrentUser() user: { organizationId: string },
    @Body('vehicleKey') vehicleKey?: string,
  ) {
    return this.telemetry.bootstrapArchitecture(user.organizationId, vehicleKey);
  }

  @Get('mobile/sync')
  @RequirePermissions('supply_chain:tms')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.offline.mobileSync(user.organizationId);
  }

  @Post('offline/batches')
  @RequirePermissions('supply_chain:tms_execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmTmsOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('supply_chain:tms_execute')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
