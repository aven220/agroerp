import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmFaCenterService } from '../application/efm-fa-center.service';
import { EfmFaCategoryService } from '../application/efm-fa-category.service';
import { EfmFaAssetService } from '../application/efm-fa-asset.service';
import { EfmFaDepreciationService } from '../application/efm-fa-depreciation.service';
import { EfmFaLifecycleService } from '../application/efm-fa-lifecycle.service';
import { EfmFaInventoryService } from '../application/efm-fa-inventory.service';
import {
  EfmFaAssetDto,
  EfmFaCategoryDto,
  EfmFaDepreciationRunDto,
  EfmFaDisposalDto,
  EfmFaIncidentDto,
  EfmFaLocationDto,
  EfmFaMaintenanceDto,
  EfmFaPhotoDto,
  EfmFaPhysicalInventoryDto,
  EfmFaRevaluationDto,
  EfmFaScanDto,
  EfmFaTransferDto,
} from './efm-fa.dto';

@ApiTags('EFM — Activos Fijos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm/fa')
export class EfmFaController {
  constructor(
    private readonly center: EfmFaCenterService,
    private readonly categories: EfmFaCategoryService,
    private readonly assets: EfmFaAssetService,
    private readonly depreciation: EfmFaDepreciationService,
    private readonly lifecycle: EfmFaLifecycleService,
    private readonly inventory: EfmFaInventoryService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  faCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('categories')
  @RequirePermissions('finance:read')
  listCategories(@CurrentUser() user: { organizationId: string }) {
    return this.categories.list(user.organizationId);
  }

  @Post('categories')
  @RequirePermissions('finance:fa_config')
  upsertCategory(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaCategoryDto) {
    return this.categories.upsert(user.organizationId, user.id, dto);
  }

  @Post('categories/seed')
  @RequirePermissions('finance:config')
  seedCategories(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.categories.seed(user.organizationId, user.id);
  }

  @Get('assets')
  @RequirePermissions('finance:read')
  listAssets(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('categoryKey') categoryKey?: string,
    @Query('assetClass') assetClass?: string,
    @Query('locationKey') locationKey?: string,
  ) {
    return this.assets.list(user.organizationId, { status, categoryKey, assetClass, locationKey });
  }

  @Get('assets/scan/:tag')
  @RequirePermissions('finance:read')
  scanAsset(@CurrentUser() user: { organizationId: string }, @Param('tag') tag: string) {
    return this.assets.findByTag(user.organizationId, tag);
  }

  @Get('assets/:assetKey')
  @RequirePermissions('finance:read')
  getAsset(@CurrentUser() user: { organizationId: string }, @Param('assetKey') assetKey: string) {
    return this.assets.getOne(user.organizationId, assetKey);
  }

  @Get('assets/:assetKey/history')
  @RequirePermissions('finance:read')
  assetHistory(@CurrentUser() user: { organizationId: string }, @Param('assetKey') assetKey: string) {
    return this.assets.getHistory(user.organizationId, assetKey);
  }

  @Post('assets')
  @RequirePermissions('finance:fa_register')
  registerAsset(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaAssetDto) {
    return this.assets.register(user.organizationId, user.id, dto);
  }

  @Post('assets/:assetKey/activate')
  @RequirePermissions('finance:fa_register')
  activateAsset(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assetKey') assetKey: string,
  ) {
    return this.assets.activate(user.organizationId, assetKey, user.id);
  }

  @Post('assets/:assetKey/location')
  @RequirePermissions('finance:fa_register')
  updateLocation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EfmFaLocationDto,
  ) {
    return this.assets.updateLocation(user.organizationId, assetKey, user.id, dto);
  }

  @Post('assets/:assetKey/photos')
  @RequirePermissions('finance:fa_register')
  addPhoto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EfmFaPhotoDto,
  ) {
    return this.assets.addPhoto(user.organizationId, assetKey, user.id, dto);
  }

  @Post('assets/:assetKey/incidents')
  @RequirePermissions('finance:fa_register')
  reportIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EfmFaIncidentDto,
  ) {
    return this.assets.reportIncident(user.organizationId, assetKey, user.id, dto);
  }

  @Get('depreciation/runs')
  @RequirePermissions('finance:read')
  listDepreciationRuns(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('runType') runType?: string,
    @Query('status') status?: string,
  ) {
    return this.depreciation.listRuns(user.organizationId, { periodKey, runType, status });
  }

  @Get('depreciation/runs/:runKey')
  @RequirePermissions('finance:read')
  getDepreciationRun(
    @CurrentUser() user: { organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.depreciation.getRun(user.organizationId, runKey);
  }

  @Get('depreciation/lines')
  @RequirePermissions('finance:read')
  listDepreciationLines(
    @CurrentUser() user: { organizationId: string },
    @Query('assetKey') assetKey?: string,
    @Query('periodKey') periodKey?: string,
    @Query('entryType') entryType?: string,
  ) {
    return this.depreciation.listLines(user.organizationId, { assetKey, periodKey, entryType });
  }

  @Post('depreciation/run')
  @RequirePermissions('finance:fa_depreciate')
  runDepreciation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaDepreciationRunDto) {
    return this.depreciation.runDepreciation(user.organizationId, user.id, dto as never);
  }

  @Post('amortization/run')
  @RequirePermissions('finance:fa_depreciate')
  runAmortization(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaDepreciationRunDto) {
    return this.depreciation.runDepreciation(user.organizationId, user.id, { ...dto, runType: 'amortization' } as never);
  }

  @Get('transfers')
  @RequirePermissions('finance:read')
  listTransfers(
    @CurrentUser() user: { organizationId: string },
    @Query('assetKey') assetKey?: string,
  ) {
    return this.lifecycle.listTransfers(user.organizationId, assetKey);
  }

  @Post('transfers')
  @RequirePermissions('finance:fa_register')
  createTransfer(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaTransferDto) {
    return this.lifecycle.createTransfer(user.organizationId, user.id, dto);
  }

  @Post('transfers/:transferKey/approve')
  @RequirePermissions('finance:fa_approve')
  approveTransfer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('transferKey') transferKey: string,
  ) {
    return this.lifecycle.approveTransfer(user.organizationId, transferKey, user.id);
  }

  @Post('revaluations')
  @RequirePermissions('finance:fa_approve')
  revalue(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaRevaluationDto) {
    return this.lifecycle.revalue(user.organizationId, user.id, dto as never);
  }

  @Post('maintenances')
  @RequirePermissions('finance:fa_register')
  addMaintenance(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaMaintenanceDto) {
    return this.lifecycle.addMaintenance(user.organizationId, user.id, dto as never);
  }

  @Get('disposals')
  @RequirePermissions('finance:read')
  listDisposals(@CurrentUser() user: { organizationId: string }) {
    return this.lifecycle.listDisposals(user.organizationId);
  }

  @Post('disposals')
  @RequirePermissions('finance:fa_dispose')
  dispose(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaDisposalDto) {
    return this.lifecycle.dispose(user.organizationId, user.id, dto as never);
  }

  @Get('physical-inventories')
  @RequirePermissions('finance:read')
  listInventories(@CurrentUser() user: { organizationId: string }) {
    return this.inventory.list(user.organizationId);
  }

  @Get('physical-inventories/:inventoryKey')
  @RequirePermissions('finance:read')
  getInventory(
    @CurrentUser() user: { organizationId: string },
    @Param('inventoryKey') inventoryKey: string,
  ) {
    return this.inventory.getOne(user.organizationId, inventoryKey);
  }

  @Post('physical-inventories')
  @RequirePermissions('finance:fa_inventory')
  createInventory(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EfmFaPhysicalInventoryDto) {
    return this.inventory.create(user.organizationId, user.id, dto);
  }

  @Post('physical-inventories/:inventoryKey/start')
  @RequirePermissions('finance:fa_inventory')
  startInventory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('inventoryKey') inventoryKey: string,
  ) {
    return this.inventory.start(user.organizationId, inventoryKey, user.id);
  }

  @Post('physical-inventories/:inventoryKey/scan')
  @RequirePermissions('finance:fa_inventory')
  scanInventory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('inventoryKey') inventoryKey: string,
    @Body() dto: EfmFaScanDto,
  ) {
    return this.inventory.scanLine(user.organizationId, inventoryKey, user.id, dto);
  }

  @Post('physical-inventories/:inventoryKey/complete')
  @RequirePermissions('finance:fa_inventory')
  completeInventory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('inventoryKey') inventoryKey: string,
  ) {
    return this.inventory.complete(user.organizationId, inventoryKey, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    const org = user.organizationId;
    return Promise.all([
      this.center.center(org),
      this.categories.list(org),
      this.assets.list(org, { status: 'active' }),
      this.depreciation.listRuns(org, { status: 'posted' }),
      this.inventory.list(org),
    ]).then(([center, categories, assets, depreciationRuns, physicalInventories]) => ({
      center,
      categories,
      assets: assets.slice(0, 300),
      depreciationRuns: depreciationRuns.slice(0, 24),
      physicalInventories: physicalInventories.filter((i) => i.status === 'in_progress').slice(0, 10),
      syncedAt: new Date().toISOString(),
    }));
  }
}
