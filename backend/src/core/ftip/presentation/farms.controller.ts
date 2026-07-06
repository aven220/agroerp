import {
  Body,
  Controller,
  Delete,
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
import { FarmsService } from '../application/farms.service';
import { FarmLifecycleService } from '../application/farm-lifecycle.service';
import { FarmRelationsService } from '../application/farm-relations.service';
import { FarmGeometryService } from '../application/farm-geometry.service';
import { FarmTwinService } from '../application/farm-twin.service';
import { FarmSyncService } from '../application/farm-sync.service';
import {
  CreateCropStandDto,
  CreateFarmDto,
  CreateInfrastructureDto,
  CreateLotDto,
  CreateNaturalResourceDto,
  CreateParcelDto,
  CreateRiskDto,
  CreateTerritoryDocumentDto,
  FarmLifecycleDto,
  ImportFarmsDto,
  LinkProducerDto,
  SetGeometryDto,
  SyncFarmsDto,
  UpdateFarmDto,
} from './farms.dto';

@ApiTags('FTIP — Fincas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ftip')
export class FarmsController {
  constructor(
    private readonly farms: FarmsService,
    private readonly lifecycle: FarmLifecycleService,
    private readonly relations: FarmRelationsService,
    private readonly geometry: FarmGeometryService,
    private readonly twin: FarmTwinService,
    private readonly sync: FarmSyncService,
  ) {}

  @Get('farms')
  @RequirePermissions('farm:read')
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('municipalityCode') municipalityCode?: string,
    @Query('producerId') producerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.farms.findAll(user.organizationId, {
      status: status as never,
      municipalityCode,
      producerId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('farms')
  @RequirePermissions('farm:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFarmDto,
    @Req() req: AgroRequest,
  ) {
    return this.farms.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('farms/dashboard')
  @RequirePermissions('farm:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.farms.getDashboard(user.organizationId);
  }

  @Get('farms/map')
  @RequirePermissions('farm:read')
  map(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.farms.getMapData(user.organizationId, { status: status as never });
  }

  @Get('farms/export')
  @RequirePermissions('farm:export')
  @Header('Content-Type', 'text/csv')
  export(@CurrentUser() user: { organizationId: string }) {
    return this.farms.exportCsv(user.organizationId);
  }

  @Post('farms/import')
  @RequirePermissions('farm:import')
  importFarms(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportFarmsDto,
    @Req() req: AgroRequest,
  ) {
    return this.farms.importBatch(user.organizationId, user.id, dto.items, req.agroContext);
  }

  @Post('farms/sync')
  @RequirePermissions('farm:create')
  syncBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SyncFarmsDto,
    @Req() req: AgroRequest,
  ) {
    return this.sync.syncBatch(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('farms/bootstrap')
  @RequirePermissions('farm:read')
  bootstrap(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sync.getBootstrap(user.organizationId, user.id);
  }

  @Get('farms/check-overlap')
  @RequirePermissions('farm:read')
  checkOverlap(
    @CurrentUser() user: { organizationId: string },
    @Query('geometry') geometryJson: string,
    @Query('excludeFarmId') excludeFarmId?: string,
  ) {
    const geometry = JSON.parse(geometryJson);
    return this.geometry.checkOverlap(user.organizationId, geometry, excludeFarmId);
  }

  @Get('farms/:id')
  @RequirePermissions('farm:read')
  findOne(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.farms.findOne(user.organizationId, id);
  }

  @Patch('farms/:id')
  @RequirePermissions('farm:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFarmDto,
    @Req() req: AgroRequest,
  ) {
    return this.farms.update(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Delete('farms/:id')
  @RequirePermissions('farm:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.farms.remove(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('farms/:id/lifecycle')
  @RequirePermissions('farm:approve')
  transitionLifecycle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: FarmLifecycleDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.transition(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Get('farms/:id/twin')
  @RequirePermissions('farm:read')
  twinView(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.getTwin(user.organizationId, id);
  }

  @Get('farms/:id/timeline')
  @RequirePermissions('farm:read')
  timeline(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.farms.getTimeline(user.organizationId, id);
  }

  @Get('farms/:id/kpis')
  @RequirePermissions('farm:read')
  kpis(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.getKpis(user.organizationId, id);
  }

  @Post('farms/:id/kpis/snapshot')
  @RequirePermissions('farm:read')
  snapshotKpis(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.captureKpiSnapshots(user.organizationId, id);
  }

  @Post('farms/:id/geometry')
  @RequirePermissions('territory:geometry')
  setGeometry(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: SetGeometryDto,
    @Req() req: AgroRequest,
  ) {
    return this.geometry.setBoundary(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Get('farms/:id/geometry/history')
  @RequirePermissions('farm:read')
  geometryHistory(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.geometry.getHistory(user.organizationId, id);
  }

  @Post('farms/:id/producers')
  @RequirePermissions('farm:update')
  linkProducer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LinkProducerDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.linkProducer(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Delete('farms/:id/producers/:linkId')
  @RequirePermissions('farm:update')
  unlinkProducer(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Req() req: AgroRequest,
  ) {
    return this.relations.unlinkProducer(user.organizationId, id, linkId, req.agroContext);
  }

  @Get('farms/:id/parcels')
  @RequirePermissions('farm:read')
  parcels(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getParcels(user.organizationId, id);
  }

  @Post('farms/:id/parcels')
  @RequirePermissions('farm:update')
  addParcel(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateParcelDto,
  ) {
    return this.relations.addParcel(user.organizationId, id, user.id, dto);
  }

  @Get('farms/:id/lots')
  @RequirePermissions('farm:read')
  lots(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getLots(user.organizationId, id);
  }

  @Post('farms/:id/lots')
  @RequirePermissions('farm:update')
  addLot(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateLotDto,
  ) {
    return this.relations.addLot(user.organizationId, id, user.id, dto);
  }

  @Post('farms/:id/crop-stands')
  @RequirePermissions('farm:update')
  addCropStand(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateCropStandDto,
  ) {
    return this.relations.addCropStand(user.organizationId, id, user.id, dto);
  }

  @Get('farms/:id/documents')
  @RequirePermissions('farm:read')
  documents(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getDocuments(user.organizationId, id);
  }

  @Post('farms/:id/documents')
  @RequirePermissions('document:upload')
  addDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateTerritoryDocumentDto,
  ) {
    return this.relations.addDocument(user.organizationId, id, user.id, dto);
  }

  @Get('farms/:id/natural-resources')
  @RequirePermissions('farm:read')
  naturalResources(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getNaturalResources(user.organizationId, id);
  }

  @Post('farms/:id/natural-resources')
  @RequirePermissions('farm:update')
  addNaturalResource(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateNaturalResourceDto,
  ) {
    return this.relations.addNaturalResource(user.organizationId, id, user.id, dto);
  }

  @Get('farms/:id/infrastructure')
  @RequirePermissions('farm:read')
  infrastructure(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getInfrastructure(user.organizationId, id);
  }

  @Post('farms/:id/infrastructure')
  @RequirePermissions('farm:update')
  addInfrastructure(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateInfrastructureDto,
  ) {
    return this.relations.addInfrastructure(user.organizationId, id, user.id, dto);
  }

  @Get('farms/:id/risks')
  @RequirePermissions('farm:read')
  risks(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getRisks(user.organizationId, id);
  }

  @Post('farms/:id/risks')
  @RequirePermissions('farm:update')
  addRisk(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateRiskDto,
  ) {
    return this.relations.addRisk(user.organizationId, id, user.id, dto);
  }

  @Patch('lots/:lotId')
  @RequirePermissions('farm:update')
  updateLot(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('lotId') lotId: string,
    @Body() dto: CreateLotDto,
  ) {
    return this.relations.updateLot(user.organizationId, lotId, user.id, dto);
  }
}
