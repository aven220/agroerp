import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EimsConfigService } from '../application/eims-config.service';
import { EimsCatalogService } from '../application/eims-catalog.service';
import { EimsParameterService } from '../application/eims-parameter.service';
import { EimsWarehouseService } from '../application/eims-warehouse.service';
import { EimsLocationService } from '../application/eims-location.service';
import { EimsItemService } from '../application/eims-item.service';
import { EimsAuditService } from '../application/eims-audit.service';
import { EimsMovementService } from '../application/eims-movement.service';
import { EimsKardexService } from '../application/eims-kardex.service';
import { EimsPeriodService } from '../application/eims-period.service';
import { EimsLotService } from '../application/eims-lot.service';
import { EimsTraceabilityService } from '../application/eims-traceability.service';
import { EimsTransformService } from '../application/eims-transform.service';
import { EimsSerialService } from '../application/eims-serial.service';
import { EimsCountService } from '../application/eims-count.service';
import { EimsReservationService } from '../application/eims-reservation.service';
import { EimsSupplyService } from '../application/eims-supply.service';
import { EimsForecastService } from '../application/eims-forecast.service';
import { EimsOpsService } from '../application/eims-ops.service';
import {
  EimsCatalogDto,
  EimsCountApprovalDto,
  EimsCountAssignDto,
  EimsCountCaptureBatchDto,
  EimsCountCaptureDto,
  EimsCountCloseDto,
  EimsCountPhotoDto,
  EimsCountPlanDto,
  EimsReservationDto,
  EimsReservationReleaseDto,
  EimsReservationReassignDto,
  EimsStockLevelDto,
  EimsSupplyRuleDto,
  EimsSuggestionRejectDto,
  EimsScenarioDto,
  EimsReportRunDto,
  EimsReportDefinitionDto,
  EimsImportCsvDto,
  EimsItemDto,
  EimsItemPhotoDto,
  EimsLocationDto,
  EimsLotDto,
  EimsLotIncidentDto,
  EimsLotReclassifyDto,
  EimsMergeDto,
  EimsMixDto,
  EimsMovementBatchDto,
  EimsMovementDto,
  EimsParameterDto,
  EimsPeriodCloseDto,
  EimsPeriodReasonDto,
  EimsSerialDto,
  EimsSerialMaintenanceDto,
  EimsSplitDto,
  EimsTransformDto,
  EimsVoidMovementDto,
  EimsWarehouseDto,
} from './eims.dto';

@ApiTags('EIMS — Enterprise Inventory Management System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eims')
export class EimsController {
  constructor(
    private readonly config: EimsConfigService,
    private readonly catalogs: EimsCatalogService,
    private readonly parameters: EimsParameterService,
    private readonly warehouses: EimsWarehouseService,
    private readonly locations: EimsLocationService,
    private readonly items: EimsItemService,
    private readonly audit: EimsAuditService,
    private readonly movements: EimsMovementService,
    private readonly kardex: EimsKardexService,
    private readonly periods: EimsPeriodService,
    private readonly lots: EimsLotService,
    private readonly trace: EimsTraceabilityService,
    private readonly transforms: EimsTransformService,
    private readonly serials: EimsSerialService,
    private readonly counts: EimsCountService,
    private readonly reservations: EimsReservationService,
    private readonly supply: EimsSupplyService,
    private readonly forecast: EimsForecastService,
    private readonly ops: EimsOpsService,
  ) {}

  @Get('center')
  @RequirePermissions('inventory:read')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.config.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('inventory:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.config.seed(user.organizationId, user.id);
  }

  @Get('catalogs/keys')
  @RequirePermissions('inventory:read')
  catalogKeys() {
    return this.catalogs.catalogKeys();
  }

  @Get('catalogs')
  @RequirePermissions('inventory:read')
  listCatalogs(
    @CurrentUser() user: { organizationId: string },
    @Query('catalogKey') catalogKey?: string,
    @Query('all') all?: string,
  ) {
    return this.catalogs.list(user.organizationId, catalogKey, all === 'true');
  }

  @Post('catalogs')
  @RequirePermissions('inventory:catalog')
  upsertCatalog(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsCatalogDto) {
    return this.catalogs.upsert(user.organizationId, user.id, dto);
  }

  @Get('parameters')
  @RequirePermissions('inventory:read')
  listParameters(@CurrentUser() user: { organizationId: string }) {
    return this.parameters.list(user.organizationId);
  }

  @Post('parameters')
  @RequirePermissions('inventory:config')
  upsertParameter(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsParameterDto) {
    return this.parameters.upsert(user.organizationId, user.id, dto);
  }

  @Get('warehouses')
  @RequirePermissions('inventory:read')
  listWarehouses(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.warehouses.list(user.organizationId, all === 'true');
  }

  @Get('warehouses/:warehouseKey')
  @RequirePermissions('inventory:read')
  getWarehouse(
    @CurrentUser() user: { organizationId: string },
    @Param('warehouseKey') warehouseKey: string,
  ) {
    return this.warehouses.findOne(user.organizationId, warehouseKey);
  }

  @Post('warehouses')
  @RequirePermissions('inventory:warehouse')
  upsertWarehouse(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsWarehouseDto) {
    return this.warehouses.upsert(user.organizationId, user.id, dto);
  }

  @Get('locations')
  @RequirePermissions('inventory:read')
  listLocations(
    @CurrentUser() user: { organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.locations.list(user.organizationId, warehouseKey);
  }

  @Get('locations/:locationKey')
  @RequirePermissions('inventory:read')
  getLocation(
    @CurrentUser() user: { organizationId: string },
    @Param('locationKey') locationKey: string,
  ) {
    return this.locations.findOne(user.organizationId, locationKey);
  }

  @Post('locations')
  @RequirePermissions('inventory:warehouse')
  upsertLocation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsLocationDto) {
    return this.locations.upsert(user.organizationId, user.id, dto);
  }

  @Get('items')
  @RequirePermissions('inventory:read')
  listItems(
    @CurrentUser() user: { organizationId: string },
    @Query('itemTypeKey') itemTypeKey?: string,
    @Query('categoryKey') categoryKey?: string,
    @Query('q') q?: string,
  ) {
    return this.items.list(user.organizationId, { itemTypeKey, categoryKey, q });
  }

  @Get('items/code/:code')
  @RequirePermissions('inventory:read')
  getItemByCode(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.items.findByCode(user.organizationId, code);
  }

  @Get('items/:itemKey')
  @RequirePermissions('inventory:read')
  getItem(
    @CurrentUser() user: { organizationId: string },
    @Param('itemKey') itemKey: string,
  ) {
    return this.items.findOne(user.organizationId, itemKey);
  }

  @Post('items')
  @RequirePermissions('inventory:item')
  upsertItem(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsItemDto) {
    return this.items.upsert(user.organizationId, user.id, dto);
  }

  @Post('items/:itemKey/photos')
  @RequirePermissions('inventory:item')
  addItemPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('itemKey') itemKey: string,
    @Body() dto: EimsItemPhotoDto,
  ) {
    return this.items.addPhoto(user.organizationId, user.id, itemKey, dto);
  }

  @Get('audit')
  @RequirePermissions('inventory:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }

  @Get('movements')
  @RequirePermissions('inventory:read')
  listMovements(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
    @Query('lotKey') lotKey?: string,
    @Query('userId') userId?: string,
    @Query('movementType') movementType?: string,
    @Query('status') status?: string,
  ) {
    return this.movements.list(user.organizationId, {
      itemKey,
      warehouseKey,
      lotKey,
      userId,
      movementType,
      status,
    });
  }

  @Get('movements/monitor')
  @RequirePermissions('inventory:read')
  movementsMonitor(@CurrentUser() user: { organizationId: string }) {
    return this.movements.monitor(user.organizationId);
  }

  @Get('movements/:movementKey')
  @RequirePermissions('inventory:read')
  getMovement(
    @CurrentUser() user: { organizationId: string },
    @Param('movementKey') movementKey: string,
  ) {
    return this.movements.getOne(user.organizationId, movementKey);
  }

  @Post('movements')
  @RequirePermissions('inventory:item')
  postMovement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsMovementDto) {
    return this.movements.post(user.organizationId, user.id, {
      ...dto,
      movementType: dto.movementType as never,
    });
  }

  @Post('movements/batch')
  @RequirePermissions('inventory:item')
  postMovementBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsMovementBatchDto,
  ) {
    return this.movements.postBatch(
      user.organizationId,
      user.id,
      (dto.movements ?? []).map((m) => ({ ...m, movementType: m.movementType as never })),
    );
  }

  @Post('movements/import')
  @RequirePermissions('inventory:item')
  importMovements(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsImportCsvDto,
  ) {
    return this.movements.importCsv(user.organizationId, user.id, dto.csv);
  }

  @Post('movements/:movementKey/void')
  @RequirePermissions('inventory:item')
  voidMovement(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('movementKey') movementKey: string,
    @Body() dto: EimsVoidMovementDto,
  ) {
    return this.movements.voidMovement(user.organizationId, user.id, movementKey, dto.reason);
  }

  @Get('stock')
  @RequirePermissions('inventory:read')
  listStock(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.movements.listBalances(user.organizationId, { itemKey, warehouseKey });
  }

  @Get('kardex')
  @RequirePermissions('inventory:read')
  listKardex(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
    @Query('lotKey') lotKey?: string,
  ) {
    return this.kardex.list(user.organizationId, { itemKey, warehouseKey, lotKey });
  }

  @Get('costs/history')
  @RequirePermissions('inventory:read')
  costHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
  ) {
    return this.kardex.costHistory(user.organizationId, itemKey);
  }

  @Get('costs/value')
  @RequirePermissions('inventory:read')
  inventoryValue(@CurrentUser() user: { organizationId: string }) {
    return this.kardex.inventoryValue(user.organizationId);
  }

  @Get('costs/compare')
  @RequirePermissions('inventory:read')
  compareMethods(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey = '',
    @Query('warehouseKey') warehouseKey = '',
  ) {
    return this.kardex.compareMethods(user.organizationId, itemKey, warehouseKey);
  }

  @Get('periods')
  @RequirePermissions('inventory:read')
  listPeriods(@CurrentUser() user: { organizationId: string }) {
    return this.periods.list(user.organizationId);
  }

  @Get('periods/:periodKey')
  @RequirePermissions('inventory:read')
  getPeriod(
    @CurrentUser() user: { organizationId: string },
    @Param('periodKey') periodKey: string,
  ) {
    return this.periods.getOne(user.organizationId, periodKey);
  }

  @Post('periods/close')
  @RequirePermissions('inventory:config')
  closePeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsPeriodCloseDto,
  ) {
    return this.periods.close(
      user.organizationId,
      user.id,
      dto.periodType as 'daily' | 'monthly' | 'yearly',
      dto.refDate,
    );
  }

  @Post('periods/:periodKey/reopen')
  @RequirePermissions('inventory:config')
  reopenPeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
    @Body() dto: EimsPeriodReasonDto,
  ) {
    return this.periods.reopen(user.organizationId, user.id, periodKey, dto.reason);
  }

  @Post('periods/:periodKey/recalculate')
  @RequirePermissions('inventory:config')
  recalculatePeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
    @Body() dto: EimsPeriodReasonDto,
  ) {
    return this.periods.recalculate(user.organizationId, user.id, periodKey, dto.reason);
  }

  @Get('reports/financial')
  @RequirePermissions('inventory:read')
  financialReport(@CurrentUser() user: { organizationId: string }) {
    return this.periods.financialReport(user.organizationId);
  }

  @Get('mobile/kardex')
  @RequirePermissions('inventory:read')
  mobileKardex(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
  ) {
    return this.kardex.list(user.organizationId, { itemKey });
  }

  @Get('mobile/costs')
  @RequirePermissions('inventory:read')
  mobileCosts(@CurrentUser() user: { organizationId: string }) {
    return this.kardex.inventoryValue(user.organizationId);
  }

  @Get('mobile/items')
  @RequirePermissions('inventory:read')
  mobileItems(@CurrentUser() user: { organizationId: string }) {
    return this.items.list(user.organizationId);
  }

  @Post('mobile/movements')
  @RequirePermissions('inventory:item')
  mobileMovement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsMovementDto) {
    return this.movements.post(user.organizationId, user.id, {
      ...dto,
      movementType: dto.movementType as never,
      source: dto.source ?? 'mobile',
    });
  }

  @Get('mobile/items/code/:code')
  @RequirePermissions('inventory:read')
  mobileItemByCode(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.items.findByCode(user.organizationId, code);
  }

  @Get('mobile/catalogs')
  @RequirePermissions('inventory:read')
  mobileCatalogs(@CurrentUser() user: { organizationId: string }) {
    return this.catalogs.list(user.organizationId);
  }

  @Get('lots')
  @RequirePermissions('inventory:read')
  listLots(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('producer') producer?: string,
    @Query('farm') farm?: string,
    @Query('agriculturalLot') agriculturalLot?: string,
    @Query('customer') customer?: string,
    @Query('documentKey') documentKey?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    return this.lots.list(user.organizationId, {
      itemKey,
      warehouseKey,
      status,
      q,
      producer,
      farm,
      agriculturalLot,
      customer,
      documentKey,
      fromDate,
      toDate,
      expiringWithinDays: expiringWithinDays ? Number(expiringWithinDays) : undefined,
    });
  }

  @Get('lots/expiry')
  @RequirePermissions('inventory:read')
  expiryPanel(@CurrentUser() user: { organizationId: string }) {
    return this.lots.expiryPanel(user.organizationId);
  }

  @Get('lots/alerts')
  @RequirePermissions('inventory:read')
  alertsPanel(
    @CurrentUser() user: { organizationId: string },
    @Query('acknowledged') acknowledged?: string,
  ) {
    return this.lots.alertsPanel(
      user.organizationId,
      acknowledged == null ? undefined : acknowledged === 'true',
    );
  }

  @Get('lots/transformations')
  @RequirePermissions('inventory:read')
  transformationsPanel(@CurrentUser() user: { organizationId: string }) {
    return this.transforms.list(user.organizationId);
  }

  @Get('lots/code/:code')
  @RequirePermissions('inventory:read')
  lotByCode(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.lots.findByCode(user.organizationId, code);
  }

  @Get('lots/:lotKey')
  @RequirePermissions('inventory:read')
  getLot(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.lots.getOne(user.organizationId, lotKey);
  }

  @Get('lots/:lotKey/360')
  @RequirePermissions('inventory:read')
  lot360(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.trace.view360(user.organizationId, lotKey);
  }

  @Get('lots/:lotKey/genealogy')
  @RequirePermissions('inventory:read')
  lotGenealogy(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.trace.genealogy(user.organizationId, lotKey);
  }

  @Get('lots/:lotKey/movements-map')
  @RequirePermissions('inventory:read')
  lotMovementsMap(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.trace.movementMap(user.organizationId, lotKey);
  }

  @Get('lots/:lotKey/timeline')
  @RequirePermissions('inventory:read')
  lotTimeline(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.trace.timeline(user.organizationId, lotKey);
  }

  @Post('lots')
  @RequirePermissions('inventory:item')
  createLot(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsLotDto) {
    return this.lots.createManual(user.organizationId, user.id, {
      ...dto,
      status: dto.status as never,
    });
  }

  @Post('lots/:lotKey/reclassify')
  @RequirePermissions('inventory:item')
  reclassifyLot(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('lotKey') lotKey: string,
    @Body() dto: EimsLotReclassifyDto,
  ) {
    return this.lots.reclassify(user.organizationId, user.id, lotKey, {
      status: dto.status as never,
      reason: dto.reason,
      itemKey: dto.itemKey,
    });
  }

  @Post('lots/block-expired')
  @RequirePermissions('inventory:item')
  blockExpired(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.lots.blockExpired(user.organizationId, user.id);
  }

  @Post('lots/alerts/refresh')
  @RequirePermissions('inventory:item')
  refreshAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.lots.refreshExpiryAlerts(user.organizationId);
  }

  @Post('lots/alerts/:alertKey/acknowledge')
  @RequirePermissions('inventory:item')
  acknowledgeAlert(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.lots.acknowledgeAlert(user.organizationId, user.id, alertKey);
  }

  @Post('lots/incidents')
  @RequirePermissions('inventory:item')
  registerIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsLotIncidentDto,
  ) {
    return this.lots.registerIncident(user.organizationId, user.id, dto);
  }

  @Post('transforms')
  @RequirePermissions('inventory:item')
  postTransform(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsTransformDto,
  ) {
    return this.transforms.post(user.organizationId, user.id, {
      ...dto,
      transformType: dto.transformType as never,
    });
  }

  @Post('transforms/split')
  @RequirePermissions('inventory:item')
  splitLot(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsSplitDto) {
    return this.transforms.split(user.organizationId, user.id, dto);
  }

  @Post('transforms/merge')
  @RequirePermissions('inventory:item')
  mergeLots(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsMergeDto) {
    return this.transforms.merge(user.organizationId, user.id, dto);
  }

  @Post('transforms/mix')
  @RequirePermissions('inventory:item')
  mixLots(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsMixDto) {
    return this.transforms.mix(user.organizationId, user.id, dto);
  }

  @Get('serials')
  @RequirePermissions('inventory:read')
  listSerials(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('lotKey') lotKey?: string,
    @Query('serialType') serialType?: string,
  ) {
    return this.serials.list(user.organizationId, { itemKey, lotKey, serialType });
  }

  @Post('serials')
  @RequirePermissions('inventory:item')
  createSerial(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsSerialDto) {
    return this.serials.create(user.organizationId, user.id, {
      ...dto,
      serialType: dto.serialType as never,
    });
  }

  @Post('serials/:serialKey/maintenance')
  @RequirePermissions('inventory:item')
  serialMaintenance(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('serialKey') serialKey: string,
    @Body() dto: EimsSerialMaintenanceDto,
  ) {
    return this.serials.addMaintenance(user.organizationId, user.id, serialKey, dto);
  }

  @Get('mobile/lots')
  @RequirePermissions('inventory:read')
  mobileLots(@CurrentUser() user: { organizationId: string }, @Query('q') q?: string) {
    return this.lots.list(user.organizationId, { q });
  }

  @Get('mobile/lots/code/:code')
  @RequirePermissions('inventory:read')
  mobileLotByCode(
    @CurrentUser() user: { organizationId: string },
    @Param('code') code: string,
  ) {
    return this.lots.findByCode(user.organizationId, code);
  }

  @Get('mobile/lots/:lotKey/timeline')
  @RequirePermissions('inventory:read')
  mobileLotTimeline(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.trace.timeline(user.organizationId, lotKey);
  }

  @Post('mobile/lots/incidents')
  @RequirePermissions('inventory:item')
  mobileIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsLotIncidentDto,
  ) {
    return this.lots.registerIncident(user.organizationId, user.id, dto);
  }

  @Get('counts/center')
  @RequirePermissions('inventory:read')
  countsCenter(@CurrentUser() user: { organizationId: string }) {
    return this.counts.center(user.organizationId);
  }

  @Get('counts')
  @RequirePermissions('inventory:read')
  listCounts(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('countType') countType?: string,
    @Query('q') q?: string,
  ) {
    return this.counts.list(user.organizationId, { status, countType, q });
  }

  @Get('counts/history')
  @RequirePermissions('inventory:read')
  countsHistory(@CurrentUser() user: { organizationId: string }) {
    return this.counts.history(user.organizationId);
  }

  @Get('counts/acts')
  @RequirePermissions('inventory:read')
  countsActs(
    @CurrentUser() user: { organizationId: string },
    @Query('countKey') countKey?: string,
  ) {
    return this.counts.closureActs(user.organizationId, countKey);
  }

  @Get('counts/:countKey')
  @RequirePermissions('inventory:read')
  getCount(
    @CurrentUser() user: { organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.getOne(user.organizationId, countKey);
  }

  @Get('counts/:countKey/differences')
  @RequirePermissions('inventory:read')
  countDifferences(
    @CurrentUser() user: { organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.differences(user.organizationId, countKey);
  }

  @Get('counts/:countKey/reconciliation')
  @RequirePermissions('inventory:read')
  countReconciliation(
    @CurrentUser() user: { organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.reconciliationPanel(user.organizationId, countKey);
  }

  @Post('counts')
  @RequirePermissions('inventory:item')
  planCount(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EimsCountPlanDto) {
    return this.counts.plan(user.organizationId, user.id, {
      ...dto,
      countType: dto.countType as never,
    });
  }

  @Post('counts/:countKey/assign')
  @RequirePermissions('inventory:item')
  assignCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountAssignDto,
  ) {
    return this.counts.assign(user.organizationId, user.id, countKey, dto.assignees);
  }

  @Post('counts/:countKey/start')
  @RequirePermissions('inventory:item')
  startCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.start(user.organizationId, user.id, countKey);
  }

  @Post('counts/:countKey/capture')
  @RequirePermissions('inventory:item')
  captureCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountCaptureDto,
  ) {
    return this.counts.capture(user.organizationId, user.id, countKey, {
      ...dto,
      round: dto.round as never,
      method: dto.method as never,
    });
  }

  @Post('counts/:countKey/capture/batch')
  @RequirePermissions('inventory:item')
  captureCountBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountCaptureBatchDto,
  ) {
    return this.counts.captureBatch(
      user.organizationId,
      user.id,
      countKey,
      (dto.captures ?? []).map((c) => ({
        ...c,
        round: c.round as never,
        method: c.method as never,
      })),
    );
  }

  @Post('counts/:countKey/reconcile')
  @RequirePermissions('inventory:item')
  reconcileCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.reconcile(user.organizationId, user.id, countKey);
  }

  @Post('counts/:countKey/adjustments/request-all')
  @RequirePermissions('inventory:item')
  requestAllAdjustments(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.requestAllApprovals(user.organizationId, user.id, countKey);
  }

  @Post('counts/:countKey/adjustments/:adjustmentKey/request')
  @RequirePermissions('inventory:item')
  requestAdjustment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Param('adjustmentKey') adjustmentKey: string,
    @Body() dto: EimsCountApprovalDto,
  ) {
    return this.counts.requestApproval(
      user.organizationId,
      user.id,
      countKey,
      adjustmentKey,
      dto.justification,
    );
  }

  @Post('counts/:countKey/adjustments/:adjustmentKey/approve')
  @RequirePermissions('inventory:item')
  approveAdjustment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Param('adjustmentKey') adjustmentKey: string,
    @Body() dto: EimsCountApprovalDto,
  ) {
    return this.counts.approve(user.organizationId, user.id, countKey, adjustmentKey, {
      comments: dto.comments,
      decision: (dto.decision as 'approved' | 'rejected') ?? 'approved',
      rejectedReason: dto.rejectedReason,
    });
  }

  @Post('counts/:countKey/approve-all')
  @RequirePermissions('inventory:item')
  approveAllAdjustments(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountApprovalDto,
  ) {
    return this.counts.approveAll(user.organizationId, user.id, countKey, dto.comments);
  }

  @Post('counts/:countKey/close')
  @RequirePermissions('inventory:item')
  closeCount(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountCloseDto,
  ) {
    return this.counts.close(user.organizationId, user.id, countKey, dto.notes);
  }

  @Post('counts/:countKey/photos')
  @RequirePermissions('inventory:item')
  addCountPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountPhotoDto,
  ) {
    return this.counts.addPhoto(user.organizationId, user.id, countKey, dto);
  }

  @Get('mobile/counts')
  @RequirePermissions('inventory:read')
  mobileCounts(@CurrentUser() user: { organizationId: string }) {
    return this.counts.list(user.organizationId, {
      status: undefined,
    });
  }

  @Get('mobile/counts/:countKey')
  @RequirePermissions('inventory:read')
  mobileCount(
    @CurrentUser() user: { organizationId: string },
    @Param('countKey') countKey: string,
  ) {
    return this.counts.getOne(user.organizationId, countKey);
  }

  @Post('mobile/counts/:countKey/capture')
  @RequirePermissions('inventory:item')
  mobileCapture(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountCaptureDto,
  ) {
    return this.counts.capture(user.organizationId, user.id, countKey, {
      ...dto,
      round: dto.round as never,
      method: (dto.method as never) ?? 'offline',
      offline: dto.offline ?? true,
    });
  }

  @Post('mobile/counts/:countKey/capture/batch')
  @RequirePermissions('inventory:item')
  mobileCaptureBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountCaptureBatchDto,
  ) {
    return this.counts.captureBatch(
      user.organizationId,
      user.id,
      countKey,
      (dto.captures ?? []).map((c) => ({
        ...c,
        round: c.round as never,
        method: (c.method as never) ?? 'offline',
        offline: c.offline ?? true,
      })),
    );
  }

  @Post('mobile/counts/:countKey/photos')
  @RequirePermissions('inventory:item')
  mobileCountPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('countKey') countKey: string,
    @Body() dto: EimsCountPhotoDto,
  ) {
    return this.counts.addPhoto(user.organizationId, user.id, countKey, {
      ...dto,
      offline: dto.offline ?? true,
    });
  }

  @Get('supply/center')
  @RequirePermissions('inventory:read')
  supplyCenter(@CurrentUser() user: { organizationId: string }) {
    return this.supply.center(user.organizationId);
  }

  @Get('reservations')
  @RequirePermissions('inventory:read')
  listReservations(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('reservationType') reservationType?: string,
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
    @Query('customerKey') customerKey?: string,
    @Query('projectKey') projectKey?: string,
    @Query('documentKey') documentKey?: string,
  ) {
    return this.reservations.list(user.organizationId, {
      status,
      reservationType,
      itemKey,
      warehouseKey,
      customerKey,
      projectKey,
      documentKey,
    });
  }

  @Get('reservations/:reservationKey')
  @RequirePermissions('inventory:read')
  getReservation(
    @CurrentUser() user: { organizationId: string },
    @Param('reservationKey') reservationKey: string,
  ) {
    return this.reservations.getOne(user.organizationId, reservationKey);
  }

  @Post('reservations')
  @RequirePermissions('inventory:item')
  createReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsReservationDto,
  ) {
    return this.reservations.create(user.organizationId, user.id, {
      ...dto,
      reservationType: dto.reservationType as never,
    });
  }

  @Post('reservations/:reservationKey/release')
  @RequirePermissions('inventory:item')
  releaseReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reservationKey') reservationKey: string,
    @Body() dto: EimsReservationReleaseDto,
  ) {
    return this.reservations.release(user.organizationId, user.id, reservationKey, dto);
  }

  @Post('reservations/:reservationKey/reassign')
  @RequirePermissions('inventory:item')
  reassignReservation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('reservationKey') reservationKey: string,
    @Body() dto: EimsReservationReassignDto,
  ) {
    return this.reservations.reassign(user.organizationId, user.id, reservationKey, dto);
  }

  @Post('reservations/expire')
  @RequirePermissions('inventory:item')
  expireReservations(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.reservations.expireAutomatic(user.organizationId, user.id);
  }

  @Get('supply/levels')
  @RequirePermissions('inventory:read')
  listStockLevels(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.supply.listLevels(user.organizationId, { itemKey, warehouseKey });
  }

  @Post('supply/levels')
  @RequirePermissions('inventory:config')
  upsertStockLevel(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsStockLevelDto,
  ) {
    return this.supply.upsertLevel(user.organizationId, user.id, dto);
  }

  @Get('supply/rules')
  @RequirePermissions('inventory:read')
  listSupplyRules(@CurrentUser() user: { organizationId: string }) {
    return this.supply.listRules(user.organizationId);
  }

  @Post('supply/rules')
  @RequirePermissions('inventory:config')
  upsertSupplyRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsSupplyRuleDto,
  ) {
    return this.supply.upsertRule(user.organizationId, user.id, dto);
  }

  @Get('supply/suggestions')
  @RequirePermissions('inventory:read')
  listSuggestions(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.supply.listSuggestions(user.organizationId, status);
  }

  @Post('supply/suggestions/generate')
  @RequirePermissions('inventory:item')
  generateSuggestions(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.supply.generateSuggestions(user.organizationId, user.id);
  }

  @Post('supply/suggestions/:suggestionKey/accept')
  @RequirePermissions('inventory:item')
  acceptSuggestion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('suggestionKey') suggestionKey: string,
  ) {
    return this.supply.acceptSuggestion(user.organizationId, user.id, suggestionKey);
  }

  @Post('supply/suggestions/:suggestionKey/reject')
  @RequirePermissions('inventory:item')
  rejectSuggestion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('suggestionKey') suggestionKey: string,
    @Body() dto: EimsSuggestionRejectDto,
  ) {
    return this.supply.rejectSuggestion(user.organizationId, user.id, suggestionKey, dto.reason);
  }

  @Get('supply/alerts')
  @RequirePermissions('inventory:read')
  listSupplyAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('acknowledged') acknowledged?: string,
  ) {
    const ack = acknowledged == null ? undefined : acknowledged === 'true';
    return this.supply.listAlerts(user.organizationId, ack);
  }

  @Post('supply/alerts/evaluate')
  @RequirePermissions('inventory:item')
  evaluateSupplyAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.supply.evaluateAlerts(user.organizationId, user.id);
  }

  @Post('supply/alerts/:alertKey/acknowledge')
  @RequirePermissions('inventory:item')
  acknowledgeSupplyAlert(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.supply.acknowledgeAlert(user.organizationId, user.id, alertKey);
  }

  @Get('supply/calendar')
  @RequirePermissions('inventory:read')
  listSupplyCalendar(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.supply.listCalendar(user.organizationId, from, to);
  }

  @Get('supply/projection')
  @RequirePermissions('inventory:read')
  supplyProjection(
    @CurrentUser() user: { organizationId: string },
    @Query('horizonDays') horizonDays?: string,
  ) {
    return this.supply.projection(user.organizationId, horizonDays ? Number(horizonDays) : 90);
  }

  @Get('planning/forecasts')
  @RequirePermissions('inventory:read')
  listForecasts(
    @CurrentUser() user: { organizationId: string },
    @Query('itemKey') itemKey?: string,
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.forecast.listForecasts(user.organizationId, { itemKey, warehouseKey });
  }

  @Post('planning/forecasts/generate')
  @RequirePermissions('inventory:item')
  generateForecasts(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('horizonDays') horizonDays?: string,
  ) {
    return this.forecast.generateForecasts(
      user.organizationId,
      user.id,
      horizonDays ? Number(horizonDays) : 90,
    );
  }

  @Get('planning/scenarios')
  @RequirePermissions('inventory:read')
  listScenarios(@CurrentUser() user: { organizationId: string }) {
    return this.forecast.listScenarios(user.organizationId);
  }

  @Post('planning/scenarios')
  @RequirePermissions('inventory:item')
  createScenario(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsScenarioDto,
  ) {
    return this.forecast.createScenario(user.organizationId, user.id, dto);
  }

  @Post('planning/scenarios/:scenarioKey/simulate')
  @RequirePermissions('inventory:item')
  simulateScenario(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('scenarioKey') scenarioKey: string,
  ) {
    return this.forecast.simulateScenario(user.organizationId, user.id, scenarioKey);
  }

  @Get('planning/planner')
  @RequirePermissions('inventory:read')
  planner(@CurrentUser() user: { organizationId: string }) {
    return this.forecast.planner(user.organizationId);
  }

  @Get('planning/ai-insights')
  @RequirePermissions('inventory:read')
  listAiInsights(@CurrentUser() user: { organizationId: string }) {
    return this.forecast.listAiInsights(user.organizationId);
  }

  @Post('planning/ai-insights/refresh')
  @RequirePermissions('inventory:item')
  refreshAiInsights(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.forecast.refreshAiInsights(user.organizationId, user.id);
  }

  @Get('mobile/reservations')
  @RequirePermissions('inventory:read')
  mobileReservations(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.reservations.list(user.organizationId, { status });
  }

  @Get('mobile/supply/alerts')
  @RequirePermissions('inventory:read')
  mobileSupplyAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.supply.listAlerts(user.organizationId, false);
  }

  @Get('mobile/supply/suggestions')
  @RequirePermissions('inventory:read')
  mobileSupplySuggestions(@CurrentUser() user: { organizationId: string }) {
    return this.supply.listSuggestions(user.organizationId, 'proposed');
  }

  @Get('ops/center')
  @RequirePermissions('inventory:read')
  opsCenter(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.operationsCenter(user.organizationId, user.id);
  }

  @Get('ops/kpis')
  @RequirePermissions('inventory:read')
  opsKpis(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.kpis(user.organizationId, user.id);
  }

  @Get('ops/analytics')
  @RequirePermissions('inventory:read')
  opsAnalytics(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
    @Query('itemKey') itemKey?: string,
    @Query('days') days?: string,
  ) {
    return this.ops.analytics(user.organizationId, user.id, {
      warehouseKey,
      itemKey,
      days: days ? Number(days) : undefined,
    });
  }

  @Get('ops/warehouse-map')
  @RequirePermissions('inventory:read')
  warehouseMap(@CurrentUser() user: { organizationId: string }) {
    return this.ops.warehouseMap(user.organizationId);
  }

  @Get('ops/dashboard/executive')
  @RequirePermissions('inventory:read')
  executiveDashboard(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.executiveDashboard(user.organizationId, user.id);
  }

  @Get('ops/dashboard/operational')
  @RequirePermissions('inventory:read')
  operationalDashboard(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.operationalDashboard(user.organizationId, user.id);
  }

  @Get('ops/ai')
  @RequirePermissions('inventory:read')
  opsAi(@CurrentUser() user: { organizationId: string }) {
    return this.ops.aiOpsInsights(user.organizationId);
  }

  @Get('ops/alerts')
  @RequirePermissions('inventory:read')
  listOpsAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('acknowledged') acknowledged?: string,
  ) {
    const ack = acknowledged == null ? undefined : acknowledged === 'true';
    return this.ops.listOpsAlerts(user.organizationId, ack);
  }

  @Post('ops/alerts/refresh')
  @RequirePermissions('inventory:item')
  refreshOpsAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.ops.refreshOpsAlerts(user.organizationId, user.id);
  }

  @Post('ops/alerts/:alertKey/acknowledge')
  @RequirePermissions('inventory:item')
  acknowledgeOpsAlert(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.ops.acknowledgeOpsAlert(user.organizationId, user.id, alertKey);
  }

  @Get('ops/reports')
  @RequirePermissions('inventory:read')
  async listSystemReports(@CurrentUser() user: { organizationId: string }) {
    await this.ops.ensureSystemReports(user.organizationId);
    return this.ops.listReportDefinitions(user.organizationId);
  }

  @Get('ops/reports/definitions')
  @RequirePermissions('inventory:read')
  listReportDefinitions(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listReportDefinitions(user.organizationId);
  }

  @Post('ops/reports/definitions')
  @RequirePermissions('inventory:config')
  saveReportDefinition(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsReportDefinitionDto,
  ) {
    return this.ops.saveReportDefinition(user.organizationId, user.id, dto);
  }

  @Post('ops/reports/run')
  @RequirePermissions('inventory:read')
  runReport(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EimsReportRunDto,
  ) {
    return this.ops.runReport(user.organizationId, user.id, dto as Parameters<EimsOpsService['runReport']>[2]);
  }

  @Get('ops/reports/runs')
  @RequirePermissions('inventory:read')
  listReportRuns(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listReportRuns(user.organizationId);
  }

  @Get('ops/reports/runs/:runKey')
  @RequirePermissions('inventory:read')
  getReportRun(
    @CurrentUser() user: { organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.ops.getReportRun(user.organizationId, runKey);
  }

  @Get('mobile/ops/kpis')
  @RequirePermissions('inventory:read')
  mobileOpsKpis(@CurrentUser() user: { organizationId: string }) {
    return this.ops.kpis(user.organizationId);
  }

  @Get('mobile/ops/alerts')
  @RequirePermissions('inventory:read')
  mobileOpsAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listOpsAlerts(user.organizationId, false);
  }

  @Get('mobile/ops/reports/runs')
  @RequirePermissions('inventory:read')
  mobileReportRuns(@CurrentUser() user: { organizationId: string }) {
    return this.ops.listReportRuns(user.organizationId);
  }
}
