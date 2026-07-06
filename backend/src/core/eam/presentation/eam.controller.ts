import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EamAssetStatus, EamAssetType } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EamAuditService } from '../application/eam-audit.service';
import { EamAssetService } from '../application/eam-asset.service';
import { EamCatalogService, EamLocationService } from '../application/eam-catalog.service';
import { EamEngineService } from '../application/eam-engine.service';
import { EamIndicatorsService } from '../application/eam-indicators.service';
import { EamOfflineService } from '../application/eam-engine.service';
import {
  EamAssetDto,
  EamClassificationDto,
  EamDocumentDto,
  EamFamilyDto,
  EamLoanDto,
  EamLocationDto,
  EamOfflineBatchDto,
  EamScanDto,
  EamStatusDto,
  EamSubfamilyDto,
  EamTransferDto,
} from './eam.dto';

@ApiTags('EAM — Asset Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eam')
export class EamController {
  constructor(
    private readonly engine: EamEngineService,
    private readonly catalog: EamCatalogService,
    private readonly locations: EamLocationService,
    private readonly assets: EamAssetService,
    private readonly indicators: EamIndicatorsService,
    private readonly offline: EamOfflineService,
    private readonly audit: EamAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('asset_management:read')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('asset_management:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('asset_management:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId, undefined, 100);
  }

  @Get('families')
  @RequirePermissions('asset_management:read')
  listFamilies(@CurrentUser() user: { organizationId: string }) {
    return this.catalog.listFamilies(user.organizationId);
  }

  @Post('families')
  @RequirePermissions('asset_management:config')
  createFamily(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamFamilyDto) {
    return this.catalog.createFamily(user.organizationId, user.id, dto.code, dto.name, dto.description);
  }

  @Post('subfamilies')
  @RequirePermissions('asset_management:config')
  createSubfamily(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamSubfamilyDto) {
    return this.catalog.createSubfamily(user.organizationId, user.id, dto.familyKey, dto.code, dto.name);
  }

  @Get('classifications')
  @RequirePermissions('asset_management:read')
  listClassifications(@CurrentUser() user: { organizationId: string }) {
    return this.catalog.listClassifications(user.organizationId);
  }

  @Post('classifications')
  @RequirePermissions('asset_management:config')
  createClassification(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamClassificationDto) {
    return this.catalog.createClassification(user.organizationId, user.id, dto.code, dto.name, dto.category);
  }

  @Get('locations')
  @RequirePermissions('asset_management:read')
  listLocations(@CurrentUser() user: { organizationId: string }) {
    return this.locations.list(user.organizationId);
  }

  @Get('locations/map')
  @RequirePermissions('asset_management:read')
  locationMap(@CurrentUser() user: { organizationId: string }) {
    return this.locations.map(user.organizationId);
  }

  @Post('locations')
  @RequirePermissions('asset_management:config')
  createLocation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamLocationDto) {
    return this.locations.create(user.organizationId, user.id, dto.code, dto.name, dto.locationType, dto.parentKey, dto.latitude, dto.longitude);
  }

  @Get('assets')
  @RequirePermissions('asset_management:read')
  listAssets(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EamAssetStatus,
    @Query('locationKey') locationKey?: string,
    @Query('assetType') assetType?: EamAssetType,
  ) {
    return this.assets.list(user.organizationId, { status, locationKey, assetType });
  }

  @Get('assets/:assetKey')
  @RequirePermissions('asset_management:read')
  getAsset(@CurrentUser() user: { organizationId: string }, @Param('assetKey') assetKey: string) {
    return this.assets.get(user.organizationId, assetKey);
  }

  @Post('assets')
  @RequirePermissions('asset_management:register')
  createAsset(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamAssetDto) {
    return this.assets.create(user.organizationId, user.id, {
      ...dto,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiresAt: dto.warrantyExpiresAt ? new Date(dto.warrantyExpiresAt) : undefined,
    });
  }

  @Post('assets/:assetKey/status')
  @RequirePermissions('asset_management:maintain')
  transitionStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EamStatusDto,
  ) {
    return this.assets.transitionStatus(user.organizationId, user.id, assetKey, dto.toStatus, dto.eventType, dto.notes);
  }

  @Post('assets/:assetKey/transfer')
  @RequirePermissions('asset_management:maintain')
  transfer(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EamTransferDto,
  ) {
    return this.assets.transfer(user.organizationId, user.id, assetKey, dto.toLocationKey, dto.transferType, dto.notes);
  }

  @Post('assets/:assetKey/loan')
  @RequirePermissions('asset_management:maintain')
  loan(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EamLoanDto,
  ) {
    return this.assets.loan(user.organizationId, user.id, assetKey, dto.borrowerName, dto.borrowerId, dto.dueAt ? new Date(dto.dueAt) : undefined, dto.notes);
  }

  @Post('loans/:loanKey/return')
  @RequirePermissions('asset_management:maintain')
  returnLoan(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('loanKey') loanKey: string,
  ) {
    return this.assets.returnLoan(user.organizationId, user.id, loanKey);
  }

  @Post('assets/:assetKey/documents')
  @RequirePermissions('asset_management:maintain')
  uploadDocument(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assetKey') assetKey: string,
    @Body() dto: EamDocumentDto,
  ) {
    return this.assets.uploadDocument(user.organizationId, user.id, assetKey, dto.docType, dto.title, dto.storageUrl);
  }

  @Post('scan')
  @RequirePermissions('asset_management:read')
  scan(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamScanDto) {
    return this.assets.scanCode(user.organizationId, user.id, dto.code, dto.scanType ?? 'qr');
  }

  @Get('dashboard')
  @RequirePermissions('asset_management:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Post('indicators/compute')
  @RequirePermissions('asset_management:read')
  computeIndicators(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.compute(user.organizationId);
  }

  @Get('mobile/sync')
  @RequirePermissions('asset_management:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.offline.mobileSync(user.organizationId);
  }

  @Post('offline/batches')
  @RequirePermissions('asset_management:maintain')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('asset_management:maintain')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
