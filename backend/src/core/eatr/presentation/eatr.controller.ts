import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EatrAuditService } from '../application/eatr-audit.service';
import { EatrBridgeService, EatrDashboardService, EatrOfflineService } from '../application/eatr-dashboard.service';
import { EatrCustodyService } from '../application/eatr-custody.service';
import { EatrEngineService } from '../application/eatr-engine.service';
import { EatrHarvestService } from '../application/eatr-harvest.service';
import { EatrExportService, EatrPackagingService, EatrPostharvestService, EatrQualityService } from '../application/eatr-postharvest.service';
import { EatrLotService, EatrTraceService } from '../application/eatr-trace.service';
import {
  EatrBridgeDto, EatrCommercialLotDto, EatrCustodyDto, EatrExportMarketDto, EatrHarvestRecordDto,
  EatrHarvestScheduleDto, EatrMergeLotsDto, EatrOfflineBatchDto, EatrPackageDto, EatrPostharvestDto,
  EatrProductionLotDto, EatrQualityDto, EatrShipmentDto, EatrSplitLotDto, EatrTraceEventDto,
  EatrTraceQueryDto, EatrWeighingDto,
} from './eatr.dto';

@ApiTags('EATR — Enterprise Agricultural Traceability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eatr')
export class EatrController {
  constructor(
    private readonly engine: EatrEngineService,
    private readonly dashboard: EatrDashboardService,
    private readonly trace: EatrTraceService,
    private readonly lots: EatrLotService,
    private readonly custody: EatrCustodyService,
    private readonly harvest: EatrHarvestService,
    private readonly postharvest: EatrPostharvestService,
    private readonly quality: EatrQualityService,
    private readonly packaging: EatrPackagingService,
    private readonly exportSvc: EatrExportService,
    private readonly bridge: EatrBridgeService,
    private readonly offline: EatrOfflineService,
    private readonly audit: EatrAuditService,
  ) {}

  @Get('center') @RequirePermissions('eatr:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('eatr:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('eatr:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('eatr:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('trace/events') @RequirePermissions('eatr:read')
  traceEvents(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.trace.listEvents(user.organizationId, fieldLotId);
  }

  @Post('trace/events') @RequirePermissions('eatr:execute')
  recordEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrTraceEventDto) {
    return this.trace.recordEvent(user.organizationId, user.id, dto);
  }

  @Get('trace/query') @RequirePermissions('eatr:read')
  traceQuery(@CurrentUser() user: { organizationId: string }, @Query() q: EatrTraceQueryDto) {
    return this.trace.queryTrace(user.organizationId, q);
  }

  @Get('lots/production') @RequirePermissions('eatr:read')
  productionLots(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.lots.listProduction(user.organizationId, fieldLotId);
  }

  @Post('lots/production') @RequirePermissions('eatr:execute')
  createProductionLot(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrProductionLotDto) {
    return this.lots.createProductionLot(user.organizationId, user.id, dto);
  }

  @Post('lots/merge') @RequirePermissions('eatr:execute')
  mergeLots(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrMergeLotsDto) {
    return this.lots.mergeLots(user.organizationId, user.id, dto.sourceLotKeys, dto.targetLotKey);
  }

  @Post('lots/:sourceLotKey/split') @RequirePermissions('eatr:execute')
  splitLot(@CurrentUser() user: { organizationId: string; id: string }, @Param('sourceLotKey') sourceLotKey: string, @Body() dto: EatrSplitLotDto) {
    return this.lots.splitLot(user.organizationId, user.id, sourceLotKey, dto.parts);
  }

  @Get('lots/commercial') @RequirePermissions('eatr:read')
  commercialLots(@CurrentUser() user: { organizationId: string }) {
    return this.lots.listCommercial(user.organizationId);
  }

  @Post('lots/commercial') @RequirePermissions('eatr:execute')
  createCommercialLot(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrCommercialLotDto) {
    return this.lots.createCommercialLot(user.organizationId, user.id, dto);
  }

  @Get('custody') @RequirePermissions('eatr:read')
  custodyList(@CurrentUser() user: { organizationId: string }) {
    return this.custody.list(user.organizationId);
  }

  @Post('custody') @RequirePermissions('eatr:execute')
  custodyTransfer(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrCustodyDto) {
    return this.custody.transfer(user.organizationId, user.id, dto);
  }

  @Post('custody/:transferKey/receive') @RequirePermissions('eatr:execute')
  custodyReceive(@CurrentUser() user: { organizationId: string; id: string }, @Param('transferKey') transferKey: string) {
    return this.custody.receive(user.organizationId, user.id, transferKey);
  }

  @Get('harvest/schedules') @RequirePermissions('eatr:read')
  harvestSchedules(@CurrentUser() user: { organizationId: string }) {
    return this.harvest.listSchedules(user.organizationId);
  }

  @Post('harvest/schedules') @RequirePermissions('eatr:execute')
  scheduleHarvest(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrHarvestScheduleDto) {
    return this.harvest.schedule(user.organizationId, user.id, { ...dto, plannedDate: new Date(dto.plannedDate) });
  }

  @Post('harvest/records') @RequirePermissions('eatr:execute')
  recordHarvest(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrHarvestRecordDto) {
    return this.harvest.recordHarvest(user.organizationId, user.id, dto);
  }

  @Get('harvest/weighings') @RequirePermissions('eatr:read')
  weighings(@CurrentUser() user: { organizationId: string }) {
    return this.harvest.listWeighings(user.organizationId);
  }

  @Post('harvest/weighings') @RequirePermissions('eatr:execute')
  recordWeighing(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrWeighingDto) {
    return this.harvest.recordWeighing(user.organizationId, user.id, dto);
  }

  @Get('postharvest') @RequirePermissions('eatr:read')
  postharvestList(@CurrentUser() user: { organizationId: string }) {
    return this.postharvest.list(user.organizationId);
  }

  @Post('postharvest') @RequirePermissions('eatr:execute')
  postharvestStep(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrPostharvestDto) {
    return this.postharvest.recordStep(user.organizationId, user.id, dto);
  }

  @Get('quality') @RequirePermissions('eatr:read')
  qualityList(@CurrentUser() user: { organizationId: string }) {
    return this.quality.list(user.organizationId);
  }

  @Post('quality') @RequirePermissions('eatr:execute')
  qualityInspect(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrQualityDto) {
    return this.quality.inspect(user.organizationId, user.id, dto);
  }

  @Get('packaging') @RequirePermissions('eatr:read')
  packages(@CurrentUser() user: { organizationId: string }) {
    return this.packaging.list(user.organizationId);
  }

  @Post('packaging') @RequirePermissions('eatr:execute')
  createPackage(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrPackageDto) {
    return this.packaging.createPackage(user.organizationId, user.id, dto);
  }

  @Get('export/markets') @RequirePermissions('eatr:read')
  exportMarkets(@CurrentUser() user: { organizationId: string }) {
    return this.exportSvc.listMarkets(user.organizationId);
  }

  @Post('export/markets') @RequirePermissions('eatr:config')
  registerMarket(@CurrentUser() user: { organizationId: string }, @Body() dto: EatrExportMarketDto) {
    return this.exportSvc.registerMarket(user.organizationId, dto);
  }

  @Get('export/shipments') @RequirePermissions('eatr:read')
  shipments(@CurrentUser() user: { organizationId: string }) {
    return this.exportSvc.listShipments(user.organizationId);
  }

  @Post('export/shipments') @RequirePermissions('eatr:execute')
  prepareShipment(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrShipmentDto) {
    return this.exportSvc.prepareShipment(user.organizationId, user.id, dto);
  }

  @Post('bridge') @RequirePermissions('eatr:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('eatr:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches') @RequirePermissions('eatr:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatrOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('eatr:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
