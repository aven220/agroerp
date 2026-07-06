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
import { FIELD_OPERATION_TYPES } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';
import { LotsService } from '../application/lots.service';
import { LotLifecycleService } from '../application/lot-lifecycle.service';
import { LotTwinService } from '../application/lot-twin.service';
import { LotOperationsService } from '../application/lot-operations.service';
import { LotRelationsService } from '../application/lot-relations.service';
import { LotImportService } from '../application/lot-import.service';
import { LotSyncService } from '../application/lot-sync.service';
import {
  CreateFieldLotDto,
  CreateFieldOperationDto,
  CreateHarvestDto,
  CreateLotCostDto,
  CreateLotDocumentDto,
  CreateManagementZoneDto,
  CreateSensorBindingDto,
  FieldLotLifecycleDto,
  ImportLotsDto,
  SetLotGeometryDto,
  SyncLotsDto,
  UpdateAgronomicStateDto,
  UpdateFieldLotDto,
  VoidOperationDto,
} from './lots.dto';

@ApiTags('FMDT — Lotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fmdt')
export class LotsController {
  constructor(
    private readonly lots: LotsService,
    private readonly lifecycle: LotLifecycleService,
    private readonly twin: LotTwinService,
    private readonly operations: LotOperationsService,
    private readonly relations: LotRelationsService,
    private readonly importSvc: LotImportService,
    private readonly sync: LotSyncService,
  ) {}

  @Get('lots')
  @RequirePermissions('lot:read')
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('farmUnitId') farmUnitId?: string,
    @Query('producerId') producerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lots.findAll(user.organizationId, {
      status: status as never,
      farmUnitId,
      producerId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('lots')
  @RequirePermissions('lot:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFieldLotDto,
    @Req() req: AgroRequest,
  ) {
    return this.lots.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('lots/dashboard')
  @RequirePermissions('lot:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.lots.getDashboard(user.organizationId);
  }

  @Get('lots/map')
  @RequirePermissions('lot:read')
  map(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.lots.getMapData(user.organizationId, { status: status as never });
  }

  @Get('lots/export')
  @RequirePermissions('lot:export')
  @Header('Content-Type', 'text/csv')
  export(@CurrentUser() user: { organizationId: string }) {
    return this.lots.exportCsv(user.organizationId);
  }

  @Get('lots/import/template')
  @RequirePermissions('lot:import')
  @Header('Content-Type', 'text/csv')
  importTemplate() {
    return this.importSvc.getTemplateCsv();
  }

  @Post('lots/import/validate')
  @RequirePermissions('lot:import')
  validateImport(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: ImportLotsDto,
  ) {
    return this.importSvc.validate(user.organizationId, dto.items);
  }

  @Post('lots/import')
  @RequirePermissions('lot:import')
  importLots(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportLotsDto,
    @Req() req: AgroRequest,
  ) {
    return this.importSvc.importBatch(user.organizationId, user.id, dto, req.agroContext);
  }

  @Post('lots/sync')
  @RequirePermissions('field_operation:create')
  syncBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SyncLotsDto,
    @Req() req: AgroRequest,
  ) {
    return this.sync.syncBatch(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('lots/bootstrap')
  @RequirePermissions('lot:read')
  bootstrap(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sync.getBootstrap(user.organizationId, user.id);
  }

  @Get('lots/eligible-ftip')
  @RequirePermissions('lot:create')
  eligibleFtip(
    @CurrentUser() user: { organizationId: string },
    @Query('farmUnitId') farmUnitId?: string,
  ) {
    return this.lots.getEligibleFtipLots(user.organizationId, farmUnitId);
  }

  @Get('operation-types')
  @RequirePermissions('lot:read')
  operationTypes() {
    return { items: FIELD_OPERATION_TYPES };
  }

  @Get('lots/:id')
  @RequirePermissions('lot:read')
  findOne(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.lots.findOne(user.organizationId, id);
  }

  @Patch('lots/:id')
  @RequirePermissions('lot:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFieldLotDto,
    @Req() req: AgroRequest,
  ) {
    return this.lots.update(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Delete('lots/:id')
  @RequirePermissions('lot:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lots.remove(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('lots/:id/lifecycle')
  @RequirePermissions('lot:approve')
  transitionLifecycle(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: FieldLotLifecycleDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.transition(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Get('lots/:id/twin')
  @RequirePermissions('lot:read')
  twinView(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.getTwin(user.organizationId, id);
  }

  @Get('lots/:id/timeline')
  @RequirePermissions('lot:read')
  timeline(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.lots.getTimeline(user.organizationId, id);
  }

  @Get('lots/:id/kpis')
  @RequirePermissions('lot:read')
  kpis(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.getKpis(user.organizationId, id);
  }

  @Post('lots/:id/kpis/snapshot')
  @RequirePermissions('lot:read')
  snapshotKpis(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.twin.captureKpiSnapshots(user.organizationId, id);
  }

  @Get('lots/:id/agronomic-state')
  @RequirePermissions('lot:read')
  agronomicState(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getAgronomicState(user.organizationId, id);
  }

  @Patch('lots/:id/agronomic-state')
  @RequirePermissions('lot:update')
  updateAgronomic(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateAgronomicStateDto,
  ) {
    return this.relations.updateAgronomicState(user.organizationId, id, user.id, dto);
  }

  @Post('lots/:id/geometry')
  @RequirePermissions('lot:precision')
  setGeometry(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: SetLotGeometryDto,
  ) {
    return this.relations.setGeometry(user.organizationId, id, user.id, dto);
  }

  @Get('lots/:id/operations')
  @RequirePermissions('lot:read')
  listOperations(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.operations.list(user.organizationId, id);
  }

  @Post('lots/:id/operations')
  @RequirePermissions('field_operation:create')
  addOperation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateFieldOperationDto,
    @Req() req: AgroRequest,
  ) {
    return this.operations.create(user.organizationId, id, user.id, dto, req.agroContext);
  }

  @Post('operations/:opId/verify')
  @RequirePermissions('field_operation:verify')
  verifyOperation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('opId') opId: string,
  ) {
    return this.operations.verify(user.organizationId, opId, user.id);
  }

  @Post('operations/:opId/void')
  @RequirePermissions('field_operation:void')
  voidOperation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('opId') opId: string,
    @Body() dto: VoidOperationDto,
  ) {
    return this.operations.voidOperation(user.organizationId, opId, user.id, dto.reason);
  }

  @Get('lots/:id/costs')
  @RequirePermissions('lot_cost:read')
  costs(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getCosts(user.organizationId, id);
  }

  @Post('lots/:id/costs')
  @RequirePermissions('lot_cost:create')
  addCost(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateLotCostDto,
  ) {
    return this.relations.addCost(user.organizationId, id, user.id, dto);
  }

  @Post('costs/:costId/approve')
  @RequirePermissions('lot_cost:approve')
  approveCost(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('costId') costId: string,
  ) {
    return this.relations.approveCost(user.organizationId, costId, user.id);
  }

  @Get('lots/:id/harvests')
  @RequirePermissions('lot:read')
  harvests(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getHarvests(user.organizationId, id);
  }

  @Post('lots/:id/harvests')
  @RequirePermissions('field_operation:create')
  addHarvest(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateHarvestDto,
  ) {
    return this.relations.addHarvest(user.organizationId, id, user.id, dto);
  }

  @Post('harvests/:harvestId/close')
  @RequirePermissions('lot:approve')
  closeHarvest(
    @CurrentUser() user: { organizationId: string },
    @Param('harvestId') harvestId: string,
  ) {
    return this.relations.closeHarvest(user.organizationId, harvestId);
  }

  @Get('lots/:id/zones')
  @RequirePermissions('lot:read')
  zones(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getZones(user.organizationId, id);
  }

  @Post('lots/:id/zones')
  @RequirePermissions('lot:precision')
  addZone(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateManagementZoneDto,
  ) {
    return this.relations.addZone(user.organizationId, id, user.id, dto);
  }

  @Get('lots/:id/sensors')
  @RequirePermissions('lot:precision')
  sensors(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getSensors(user.organizationId, id);
  }

  @Post('lots/:id/sensors')
  @RequirePermissions('lot:precision')
  addSensor(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateSensorBindingDto,
  ) {
    return this.relations.addSensor(user.organizationId, id, user.id, dto);
  }

  @Get('lots/:id/telemetry')
  @RequirePermissions('lot:precision')
  telemetry(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getTelemetry(user.organizationId, id);
  }

  @Get('lots/:id/documents')
  @RequirePermissions('lot:read')
  documents(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getDocuments(user.organizationId, id);
  }

  @Post('lots/:id/documents')
  @RequirePermissions('document:upload')
  addDocument(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateLotDocumentDto,
  ) {
    return this.relations.addDocument(user.organizationId, id, dto);
  }

  @Get('lots/:id/recommendations')
  @RequirePermissions('lot:read')
  recommendations(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.relations.getRecommendations(user.organizationId, id);
  }

  @Post('lots/:id/recommendations/:recId/accept')
  @RequirePermissions('lot:update')
  acceptRecommendation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('recId') recId: string,
  ) {
    return this.relations.acceptRecommendation(user.organizationId, id, recId, user.id);
  }
}
