import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EpscmWmsDispatchStatus, EpscmWmsPickStatus, EpscmWmsReceiptStatus, EpscmWmsTransferStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EpscmWmsWarehouseService, EpscmWmsLocationService } from '../application/epscm-wms-warehouse.service';
import { EpscmWmsTransferService } from '../application/epscm-wms-transfer.service';
import { EpscmWmsPickingService } from '../application/epscm-wms-picking.service';
import { EpscmWmsPackingService } from '../application/epscm-wms-packing.service';
import { EpscmWmsDispatchService } from '../application/epscm-wms-dispatch.service';
import { EpscmWmsReceivingService } from '../application/epscm-wms-receiving.service';
import { EpscmWmsCrossDockService } from '../application/epscm-wms-crossdock.service';
import { EpscmWmsIndicatorsService } from '../application/epscm-wms-indicators.service';
import { EpscmWmsOfflineService } from '../application/epscm-wms-offline.service';
import { EpscmWmsEngineService } from '../application/epscm-wms-engine.service';
import {
  EpscmWmsAisleDto,
  EpscmWmsBarcodePickDto,
  EpscmWmsBarcodeReceiveDto,
  EpscmWmsCaptureDto,
  EpscmWmsConfirmPickDto,
  EpscmWmsConsolidateDto,
  EpscmWmsCrossDockAssignDto,
  EpscmWmsCrossDockDto,
  EpscmWmsDispatchPrepareDto,
  EpscmWmsDispatchShipDto,
  EpscmWmsLevelDto,
  EpscmWmsLocationDto,
  EpscmWmsOfflineBatchDto,
  EpscmWmsPackBoxDto,
  EpscmWmsPickTaskDto,
  EpscmWmsRackDto,
  EpscmWmsReceiptFromPoDto,
  EpscmWmsReceiptScheduleDto,
  EpscmWmsReceiveLineDto,
  EpscmWmsRelocateDto,
  EpscmWmsSuggestDto,
  EpscmWmsTransferDto,
  EpscmWmsWaveDto,
  EpscmWmsZoneDto,
} from './epscm-wms.dto';

@ApiTags('EPSCM — WMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('epscm/wms')
export class EpscmWmsController {
  constructor(
    private readonly engine: EpscmWmsEngineService,
    private readonly warehouse: EpscmWmsWarehouseService,
    private readonly location: EpscmWmsLocationService,
    private readonly transfer: EpscmWmsTransferService,
    private readonly picking: EpscmWmsPickingService,
    private readonly packing: EpscmWmsPackingService,
    private readonly dispatch: EpscmWmsDispatchService,
    private readonly receiving: EpscmWmsReceivingService,
    private readonly crossDock: EpscmWmsCrossDockService,
    private readonly indicators: EpscmWmsIndicatorsService,
    private readonly offline: EpscmWmsOfflineService,
  ) {}

  @Get('center')
  @RequirePermissions('supply_chain:wms')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('supply_chain:wms')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard')
  @RequirePermissions('supply_chain:wms')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('supply_chain:wms')
  audit(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.auditTrail(user.organizationId);
  }

  @Get('warehouses/:warehouseKey/hierarchy')
  @RequirePermissions('supply_chain:wms')
  hierarchy(
    @CurrentUser() user: { organizationId: string },
    @Param('warehouseKey') warehouseKey: string,
  ) {
    return this.warehouse.hierarchy(user.organizationId, warehouseKey);
  }

  @Get('warehouses/:warehouseKey/map')
  @RequirePermissions('supply_chain:wms')
  storageMap(
    @CurrentUser() user: { organizationId: string },
    @Param('warehouseKey') warehouseKey: string,
  ) {
    return this.warehouse.storageMap(user.organizationId, warehouseKey);
  }

  @Post('warehouses/:warehouseKey/seed')
  @RequirePermissions('supply_chain:wms')
  seedHierarchy(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('warehouseKey') warehouseKey: string,
  ) {
    return this.warehouse.seedHierarchy(user.organizationId, user.id, warehouseKey);
  }

  @Post('zones')
  @RequirePermissions('supply_chain:wms')
  createZone(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsZoneDto) {
    return this.warehouse.createZone(user.organizationId, user.id, dto.warehouseKey, dto.code, dto.name, dto.zoneType);
  }

  @Post('aisles')
  @RequirePermissions('supply_chain:wms')
  createAisle(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsAisleDto) {
    return this.warehouse.createAisle(user.organizationId, user.id, dto.zoneKey, dto.code, dto.name);
  }

  @Post('racks')
  @RequirePermissions('supply_chain:wms')
  createRack(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsRackDto) {
    return this.warehouse.createRack(user.organizationId, user.id, dto.aisleKey, dto.code, dto.name);
  }

  @Post('levels')
  @RequirePermissions('supply_chain:wms')
  createLevel(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsLevelDto) {
    return this.warehouse.createLevel(user.organizationId, user.id, dto.rackKey, dto.levelNumber, dto.code);
  }

  @Post('locations')
  @RequirePermissions('supply_chain:wms')
  createLocation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsLocationDto) {
    return this.warehouse.createLocation(user.organizationId, user.id, dto);
  }

  @Get('locations')
  @RequirePermissions('supply_chain:wms')
  listLocations(
    @CurrentUser() user: { organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.location.list(user.organizationId, warehouseKey);
  }

  @Get('locations/occupancy')
  @RequirePermissions('supply_chain:wms')
  occupancy(
    @CurrentUser() user: { organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.location.occupancyReport(user.organizationId, warehouseKey);
  }

  @Post('locations/suggest')
  @RequirePermissions('supply_chain:wms')
  suggest(@CurrentUser() user: { organizationId: string }, @Body() dto: EpscmWmsSuggestDto) {
    return this.location.suggest(user.organizationId, dto.warehouseKey, dto.itemKey, dto.qty);
  }

  @Patch('locations/:locationKey/block')
  @RequirePermissions('supply_chain:wms')
  blockLocation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('locationKey') locationKey: string,
    @Body('reason') reason?: string,
  ) {
    return this.location.block(user.organizationId, user.id, locationKey, reason);
  }

  @Patch('locations/:locationKey/unblock')
  @RequirePermissions('supply_chain:wms')
  unblockLocation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('locationKey') locationKey: string,
  ) {
    return this.location.unblock(user.organizationId, user.id, locationKey);
  }

  @Post('locations/relocate')
  @RequirePermissions('supply_chain:wms_execute')
  relocate(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsRelocateDto) {
    return this.location.relocate(
      user.organizationId, user.id, dto.fromLocationKey, dto.toLocationKey, dto.itemKey, dto.qty, dto.lotKey,
    );
  }

  @Post('locations/consolidate')
  @RequirePermissions('supply_chain:wms_execute')
  consolidate(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsConsolidateDto) {
    return this.location.consolidate(user.organizationId, user.id, dto.targetLocationKey, dto.sourceLocationKeys);
  }

  @Get('transfers')
  @RequirePermissions('supply_chain:wms')
  listTransfers(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmWmsTransferStatus,
  ) {
    return this.transfer.list(user.organizationId, status);
  }

  @Post('transfers')
  @RequirePermissions('supply_chain:wms_execute')
  createTransfer(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsTransferDto) {
    return this.transfer.create(user.organizationId, user.id, dto);
  }

  @Post('transfers/:transferKey/submit')
  @RequirePermissions('supply_chain:wms_execute')
  submitTransfer(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfer.submit(user.organizationId, user.id, transferKey);
  }

  @Post('transfers/:transferKey/approve')
  @RequirePermissions('supply_chain:wms')
  approveTransfer(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfer.approve(user.organizationId, user.id, transferKey);
  }

  @Post('transfers/:transferKey/transit')
  @RequirePermissions('supply_chain:wms_execute')
  startTransit(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfer.startTransit(user.organizationId, user.id, transferKey);
  }

  @Post('transfers/:transferKey/complete')
  @RequirePermissions('supply_chain:wms_execute')
  completeTransfer(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfer.complete(user.organizationId, user.id, transferKey);
  }

  @Get('transfers/:transferKey/tracking')
  @RequirePermissions('supply_chain:wms')
  tracking(
    @CurrentUser() user: { organizationId: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.transfer.tracking(user.organizationId, transferKey);
  }

  @Get('picking/waves')
  @RequirePermissions('supply_chain:wms')
  listWaves(
    @CurrentUser() user: { organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.picking.listWaves(user.organizationId, warehouseKey);
  }

  @Get('picking/tasks')
  @RequirePermissions('supply_chain:wms')
  listPickTasks(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmWmsPickStatus,
    @Query('orderKey') orderKey?: string,
  ) {
    return this.picking.listTasks(user.organizationId, status, orderKey);
  }

  @Get('picking/panel')
  @RequirePermissions('supply_chain:wms')
  pickPanel(
    @CurrentUser() user: { organizationId: string },
    @Query('warehouseKey') warehouseKey?: string,
  ) {
    return this.picking.panel(user.organizationId, warehouseKey);
  }

  @Post('picking/waves')
  @RequirePermissions('supply_chain:wms_execute')
  createWave(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsWaveDto) {
    return this.picking.createWave(user.organizationId, user.id, dto.warehouseKey, dto.pickMode, dto.orderKeys, dto.priority);
  }

  @Post('picking/waves/:waveKey/release')
  @RequirePermissions('supply_chain:wms_execute')
  releaseWave(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('waveKey') waveKey: string,
  ) {
    return this.picking.releaseWave(user.organizationId, user.id, waveKey);
  }

  @Post('picking/tasks')
  @RequirePermissions('supply_chain:wms_execute')
  createPickTask(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsPickTaskDto) {
    return this.picking.createManualTask(user.organizationId, user.id, dto);
  }

  @Post('picking/tasks/:taskKey/confirm')
  @RequirePermissions('supply_chain:wms_execute')
  confirmPick(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('taskKey') taskKey: string,
    @Body() dto: EpscmWmsConfirmPickDto,
  ) {
    return this.picking.confirmPick(user.organizationId, user.id, taskKey, dto.pickedQty, dto.pickerKey);
  }

  @Post('picking/barcode')
  @RequirePermissions('supply_chain:wms_execute')
  barcodePick(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsBarcodePickDto) {
    return this.picking.confirmByBarcode(user.organizationId, user.id, dto.barcode, dto.pickedQty);
  }

  @Get('packing')
  @RequirePermissions('supply_chain:wms')
  listPacking(@CurrentUser() user: { organizationId: string }) {
    return this.packing.list(user.organizationId);
  }

  @Get('packing/panel')
  @RequirePermissions('supply_chain:wms')
  packPanel(@CurrentUser() user: { organizationId: string }) {
    return this.packing.panel(user.organizationId);
  }

  @Post('packing/:orderKey/start')
  @RequirePermissions('supply_chain:wms_execute')
  startPacking(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.packing.start(user.organizationId, user.id, orderKey);
  }

  @Post('packing/:packKey/boxes')
  @RequirePermissions('supply_chain:wms_execute')
  addBox(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('packKey') packKey: string,
    @Body() dto: EpscmWmsPackBoxDto,
  ) {
    return this.packing.addBox(user.organizationId, user.id, packKey, dto);
  }

  @Post('packing/:packKey/repack')
  @RequirePermissions('supply_chain:wms_execute')
  repack(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('packKey') packKey: string,
  ) {
    return this.packing.repack(user.organizationId, user.id, packKey);
  }

  @Post('packing/:packKey/complete')
  @RequirePermissions('supply_chain:wms_execute')
  completePacking(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('packKey') packKey: string,
  ) {
    return this.packing.complete(user.organizationId, user.id, packKey);
  }

  @Get('dispatches')
  @RequirePermissions('supply_chain:wms')
  listDispatches(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmWmsDispatchStatus,
  ) {
    return this.dispatch.list(user.organizationId, status);
  }

  @Post('dispatches/prepare')
  @RequirePermissions('supply_chain:wms_execute')
  prepareDispatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsDispatchPrepareDto) {
    return this.dispatch.prepare(user.organizationId, user.id, dto.orderKey, dto.warehouseKey);
  }

  @Post('dispatches/:dispatchKey/loading')
  @RequirePermissions('supply_chain:wms_execute')
  assignLoading(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.dispatch.assignLoading(user.organizationId, user.id, dispatchKey);
  }

  @Post('dispatches/:dispatchKey/ship')
  @RequirePermissions('supply_chain:wms_execute')
  shipLine(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('dispatchKey') dispatchKey: string,
    @Body() dto: EpscmWmsDispatchShipDto,
  ) {
    return this.dispatch.shipLine(user.organizationId, user.id, dispatchKey, dto.lineKey, dto.shippedQty);
  }

  @Post('dispatches/:dispatchKey/confirm')
  @RequirePermissions('supply_chain:wms_execute')
  confirmDispatch(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('dispatchKey') dispatchKey: string,
  ) {
    return this.dispatch.confirmExit(user.organizationId, user.id, dispatchKey);
  }

  @Get('receipts')
  @RequirePermissions('supply_chain:wms')
  listReceipts(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EpscmWmsReceiptStatus,
  ) {
    return this.receiving.list(user.organizationId, status);
  }

  @Post('receipts/schedule')
  @RequirePermissions('supply_chain:wms_execute')
  scheduleReceipt(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsReceiptScheduleDto) {
    return this.receiving.schedule(user.organizationId, user.id, dto.warehouseKey, new Date(dto.scheduledAt), dto.purchaseKey);
  }

  @Post('receipts/from-purchase')
  @RequirePermissions('supply_chain:wms_execute')
  receiptFromPo(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsReceiptFromPoDto) {
    return this.receiving.fromPurchaseOrder(user.organizationId, user.id, dto.purchaseKey, dto.warehouseKey, dto.lines);
  }

  @Post('receipts/:receiptKey/lines/:lineKey/receive')
  @RequirePermissions('supply_chain:wms_execute')
  receiveLine(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('receiptKey') receiptKey: string,
    @Param('lineKey') lineKey: string,
    @Body() dto: EpscmWmsReceiveLineDto,
  ) {
    return this.receiving.receiveLine(
      user.organizationId, user.id, receiptKey, lineKey, dto.receivedQty, dto.locationKey, dto.issueNotes,
    );
  }

  @Post('receipts/barcode')
  @RequirePermissions('supply_chain:wms_execute')
  barcodeReceive(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsBarcodeReceiveDto) {
    return this.receiving.confirmByBarcode(user.organizationId, user.id, dto.barcode, dto.receivedQty, dto.locationKey);
  }

  @Get('cross-dock')
  @RequirePermissions('supply_chain:wms')
  listCrossDock(@CurrentUser() user: { organizationId: string }) {
    return this.crossDock.list(user.organizationId);
  }

  @Post('cross-dock')
  @RequirePermissions('supply_chain:wms_execute')
  createCrossDock(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsCrossDockDto) {
    return this.crossDock.create(user.organizationId, user.id, dto.receiptKey, dto.orderKey);
  }

  @Post('cross-dock/:crossDockKey/assign')
  @RequirePermissions('supply_chain:wms_execute')
  assignCrossDock(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('crossDockKey') crossDockKey: string,
    @Body() dto: EpscmWmsCrossDockAssignDto,
  ) {
    return this.crossDock.autoAssign(user.organizationId, user.id, crossDockKey, dto.warehouseKey);
  }

  @Post('cross-dock/:crossDockKey/complete')
  @RequirePermissions('supply_chain:wms_execute')
  completeCrossDock(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('crossDockKey') crossDockKey: string,
  ) {
    return this.crossDock.complete(user.organizationId, user.id, crossDockKey);
  }

  @Get('mobile/sync')
  @RequirePermissions('supply_chain:wms')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.offline.mobileSync(user.organizationId);
  }

  @Post('offline/batches')
  @RequirePermissions('supply_chain:wms_execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('supply_chain:wms_execute')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }

  @Post('captures')
  @RequirePermissions('supply_chain:wms_execute')
  capture(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmWmsCaptureDto) {
    return this.offline.capturePhoto(user.organizationId, user.id, dto.refType, dto.refKey, dto.storageUrl, dto.captureType);
  }

  @Get('captures')
  @RequirePermissions('supply_chain:wms')
  listCaptures(
    @CurrentUser() user: { organizationId: string },
    @Query('refType') refType?: string,
    @Query('refKey') refKey?: string,
  ) {
    return this.offline.listCaptures(user.organizationId, refType, refKey);
  }
}
