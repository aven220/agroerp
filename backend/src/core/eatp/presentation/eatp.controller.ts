import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EatpAuditService } from '../application/eatp-audit.service';
import { EatpCampaignService } from '../application/eatp-campaign.service';
import { EatpCropService } from '../application/eatp-crop.service';
import { EatpEngineService, EatpOfflineService } from '../application/eatp-engine.service';
import { EatpFarmService } from '../application/eatp-farm.service';
import { EatpInputService } from '../application/eatp-input.service';
import { EatpLaborService } from '../application/eatp-labor.service';
import { EatpLotService } from '../application/eatp-lot.service';
import { EatpBridgeService, EatpMonitoringService } from '../application/eatp-monitoring.service';
import { EatpScheduleService } from '../application/eatp-schedule.service';
import {
  EatpBridgeDto,
  EatpCampaignStatusDto,
  EatpCreateCampaignDto,
  EatpCreateSeasonDto,
  EatpCreateTaskDto,
  EatpCropRegistryDto,
  EatpInputBindingDto,
  EatpOfflineBatchDto,
  EatpQrRegisterDto,
  EatpRecordLaborDto,
  EatpScheduleEntryDto,
} from './eatp.dto';

@ApiTags('EATP — Enterprise AgriTech Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eatp')
export class EatpController {
  constructor(
    private readonly engine: EatpEngineService,
    private readonly farms: EatpFarmService,
    private readonly lots: EatpLotService,
    private readonly crops: EatpCropService,
    private readonly campaigns: EatpCampaignService,
    private readonly labor: EatpLaborService,
    private readonly schedule: EatpScheduleService,
    private readonly inputs: EatpInputService,
    private readonly monitoring: EatpMonitoringService,
    private readonly bridge: EatpBridgeService,
    private readonly offline: EatpOfflineService,
    private readonly audit: EatpAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eatp:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eatp:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('eatp:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('farms')
  @RequirePermissions('eatp:read')
  listFarms(@CurrentUser() user: { organizationId: string }, @Query('search') search?: string) {
    return this.farms.list(user.organizationId, { search });
  }

  @Get('farms/:farmId')
  @RequirePermissions('eatp:read')
  getFarm(@CurrentUser() user: { organizationId: string }, @Param('farmId') farmId: string) {
    return this.farms.get(user.organizationId, farmId);
  }

  @Get('farms/:farmId/sectors')
  @RequirePermissions('eatp:read')
  farmSectors(@CurrentUser() user: { organizationId: string }, @Param('farmId') farmId: string) {
    return this.farms.listSectors(user.organizationId, farmId);
  }

  @Get('lots')
  @RequirePermissions('eatp:read')
  listLots(@CurrentUser() user: { organizationId: string }, @Query('farmUnitId') farmUnitId?: string) {
    return this.lots.list(user.organizationId, farmUnitId);
  }

  @Get('lots/ftip')
  @RequirePermissions('eatp:read')
  listFtipLots(@CurrentUser() user: { organizationId: string }, @Query('farmUnitId') farmUnitId?: string) {
    return this.lots.listFtipLots(user.organizationId, farmUnitId);
  }

  @Get('lots/:lotId')
  @RequirePermissions('eatp:read')
  getLot(@CurrentUser() user: { organizationId: string }, @Param('lotId') lotId: string) {
    return this.lots.get(user.organizationId, lotId);
  }

  @Get('qr/:qrCode')
  @RequirePermissions('eatp:read')
  resolveQr(@CurrentUser() user: { organizationId: string }, @Param('qrCode') qrCode: string) {
    return this.lots.resolveQr(user.organizationId, qrCode);
  }

  @Post('qr')
  @RequirePermissions('eatp:config')
  registerQr(@CurrentUser() user: { organizationId: string }, @Body() dto: EatpQrRegisterDto) {
    return this.lots.registerQr(user.organizationId, dto.qrCode, dto.entityType, dto.entityId, dto.payload);
  }

  @Get('crops/stands')
  @RequirePermissions('eatp:read')
  cropStands(@CurrentUser() user: { organizationId: string }, @Query('farmUnitId') farmUnitId?: string) {
    return this.crops.listStands(user.organizationId, farmUnitId);
  }

  @Get('crops/agronomic')
  @RequirePermissions('eatp:read')
  agronomic(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.crops.listAgronomic(user.organizationId, fieldLotId);
  }

  @Get('crops/registry')
  @RequirePermissions('eatp:read')
  cropRegistry(@CurrentUser() user: { organizationId: string }) {
    return this.crops.listRegistry(user.organizationId);
  }

  @Post('crops/registry')
  @RequirePermissions('eatp:config')
  upsertCrop(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpCropRegistryDto) {
    return this.crops.upsertRegistry(user.organizationId, user.id, dto.registryKey, {
      ...dto,
      plantingDate: dto.plantingDate ? new Date(dto.plantingDate) : undefined,
      harvestEstDate: dto.harvestEstDate ? new Date(dto.harvestEstDate) : undefined,
    });
  }

  @Post('crops/sync-ftip')
  @RequirePermissions('eatp:execute')
  syncCrops(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.crops.syncFromFtip(user.organizationId, user.id);
  }

  @Get('campaigns')
  @RequirePermissions('eatp:read')
  listCampaigns(@CurrentUser() user: { organizationId: string }) {
    return this.campaigns.list(user.organizationId);
  }

  @Post('campaigns')
  @RequirePermissions('eatp:config')
  createCampaign(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpCreateCampaignDto) {
    return this.campaigns.createCampaign(user.organizationId, user.id, dto.campaignKey, dto.name, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Post('campaigns/:campaignKey/status')
  @RequirePermissions('eatp:config')
  campaignStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('campaignKey') campaignKey: string,
    @Body() dto: EatpCampaignStatusDto,
  ) {
    return this.campaigns.updateStatus(user.organizationId, user.id, campaignKey, dto.status);
  }

  @Get('seasons')
  @RequirePermissions('eatp:read')
  seasons(@CurrentUser() user: { organizationId: string }) {
    return this.campaigns.listSeasons(user.organizationId);
  }

  @Post('seasons')
  @RequirePermissions('eatp:config')
  createSeason(@CurrentUser() user: { organizationId: string }, @Body() dto: EatpCreateSeasonDto) {
    return this.campaigns.createSeason(user.organizationId, dto.seasonKey, dto.name, dto.yearFrom, dto.yearTo);
  }

  @Get('labors/catalog')
  @RequirePermissions('eatp:read')
  laborCatalog() {
    return this.labor.catalog();
  }

  @Get('labors/tasks')
  @RequirePermissions('eatp:read')
  laborTasks(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.labor.listTasks(user.organizationId, fieldLotId);
  }

  @Post('labors/tasks')
  @RequirePermissions('eatp:config')
  createTask(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpCreateTaskDto) {
    return this.labor.createTask(user.organizationId, user.id, {
      ...dto,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
    });
  }

  @Post('labors/record')
  @RequirePermissions('eatp:execute')
  recordLabor(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpRecordLaborDto) {
    return this.labor.recordLabor(user.organizationId, user.id, dto);
  }

  @Get('schedule/calendar')
  @RequirePermissions('eatp:read')
  calendar(@CurrentUser() user: { organizationId: string }) {
    return this.schedule.calendar(user.organizationId);
  }

  @Get('schedule/tasks')
  @RequirePermissions('eatp:read')
  scheduleTasks(@CurrentUser() user: { organizationId: string }) {
    return this.schedule.listTasks(user.organizationId);
  }

  @Post('schedule/entries')
  @RequirePermissions('eatp:config')
  createSchedule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpScheduleEntryDto) {
    return this.schedule.createEntry(user.organizationId, user.id, {
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
  }

  @Get('inputs/categories')
  @RequirePermissions('eatp:read')
  inputCategories() {
    return this.inputs.categories();
  }

  @Get('inputs/items')
  @RequirePermissions('eatp:read')
  inventoryItems(@CurrentUser() user: { organizationId: string }, @Query('search') search?: string) {
    return this.inputs.listInventoryItems(user.organizationId, search);
  }

  @Get('inputs/bindings')
  @RequirePermissions('eatp:read')
  inputBindings(@CurrentUser() user: { organizationId: string }, @Query('category') category?: string) {
    return this.inputs.listBindings(user.organizationId, category);
  }

  @Post('inputs/bindings')
  @RequirePermissions('eatp:config')
  bindInput(@CurrentUser() user: { organizationId: string }, @Body() dto: EatpInputBindingDto) {
    return this.inputs.bindInput(user.organizationId, dto.category, dto);
  }

  @Get('dashboard')
  @RequirePermissions('eatp:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.dashboard(user.organizationId);
  }

  @Get('bridge/modules')
  @RequirePermissions('eatp:read')
  bridgeModules() {
    return this.bridge.moduleSlots();
  }

  @Post('bridge/events')
  @RequirePermissions('eatp:execute')
  bridgeEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('eatp:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches')
  @RequirePermissions('eatp:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EatpOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync')
  @RequirePermissions('eatp:execute')
  syncBatch(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
