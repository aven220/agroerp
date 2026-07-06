import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmfgResourceEquipmentType } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgResourcesCapacityService } from '../application/emfg-resources-capacity.service';
import { EmfgResourcesCenterService } from '../application/emfg-resources-center.service';
import { EmfgResourcesEquipmentService } from '../application/emfg-resources-equipment.service';
import { EmfgResourcesIndicatorsService } from '../application/emfg-resources-indicators.service';
import { EmfgResourcesMaintenanceService } from '../application/emfg-resources-maintenance.service';
import { EmfgResourcesOfflineService } from '../application/emfg-resources-offline.service';
import { EmfgResourcesWorkcenterService } from '../application/emfg-resources-workcenter.service';
import {
  EmfgResAvailabilityDto, EmfgResCaptureDto, EmfgResCellDto, EmfgResDowntimeDto,
  EmfgResEquipmentDto, EmfgResLocationDto, EmfgResMaintenanceLogDto, EmfgResMaintenancePlanDto,
  EmfgResOfflineBatchDto, EmfgResScheduleDto,
} from './emfg-resources.dto';

@ApiTags('EMFG — Recursos de Producción')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg/resources')
export class EmfgResourcesController {
  constructor(
    private readonly center: EmfgResourcesCenterService,
    private readonly workcenters: EmfgResourcesWorkcenterService,
    private readonly equipment: EmfgResourcesEquipmentService,
    private readonly capacity: EmfgResourcesCapacityService,
    private readonly maintenance: EmfgResourcesMaintenanceService,
    private readonly indicators: EmfgResourcesIndicatorsService,
    private readonly offline: EmfgResourcesOfflineService,
  ) {}

  @Get('center')
  @RequirePermissions('manufacturing:resources')
  centerDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.center.dashboard(user.organizationId);
  }

  @Get('indicators')
  @RequirePermissions('manufacturing:resources')
  getIndicators(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('workcenters')
  @RequirePermissions('manufacturing:resources')
  listWorkcenters(@CurrentUser() user: { organizationId: string }) {
    return this.workcenters.list(user.organizationId);
  }

  @Get('locations')
  @RequirePermissions('manufacturing:resources')
  listLocations(@CurrentUser() user: { organizationId: string }) {
    return this.workcenters.listLocations(user.organizationId);
  }

  @Post('locations')
  @RequirePermissions('manufacturing:resources')
  createLocation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResLocationDto,
  ) {
    return this.workcenters.createLocation(user.organizationId, user.id, dto);
  }

  @Get('cells')
  @RequirePermissions('manufacturing:resources')
  listCells(
    @CurrentUser() user: { organizationId: string },
    @Query('centerKey') centerKey?: string,
  ) {
    return this.workcenters.listCells(user.organizationId, centerKey);
  }

  @Post('cells')
  @RequirePermissions('manufacturing:resources')
  createCell(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResCellDto,
  ) {
    return this.workcenters.createCell(user.organizationId, user.id, dto);
  }

  @Post('cells/:cellKey/status')
  @RequirePermissions('manufacturing:resources')
  setCellStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('cellKey') cellKey: string,
    @Body() dto: EmfgResAvailabilityDto,
  ) {
    return this.workcenters.setOperationalStatus(user.organizationId, user.id, cellKey, dto.status, dto.reason);
  }

  @Get('schedules')
  @RequirePermissions('manufacturing:resources')
  listSchedules(
    @CurrentUser() user: { organizationId: string },
    @Query('entityType') entityType: string,
    @Query('entityKey') entityKey: string,
  ) {
    return this.workcenters.listSchedules(user.organizationId, entityType, entityKey);
  }

  @Post('schedules')
  @RequirePermissions('manufacturing:resources')
  createSchedule(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResScheduleDto,
  ) {
    return this.workcenters.upsertSchedule(user.organizationId, user.id, dto);
  }

  @Get('equipment')
  @RequirePermissions('manufacturing:resources')
  listEquipment(
    @CurrentUser() user: { organizationId: string },
    @Query('equipmentType') equipmentType?: EmfgResourceEquipmentType,
  ) {
    return this.equipment.list(user.organizationId, equipmentType);
  }

  @Get('equipment/:equipmentKey')
  @RequirePermissions('manufacturing:resources')
  getEquipment(
    @CurrentUser() user: { organizationId: string },
    @Param('equipmentKey') equipmentKey: string,
  ) {
    return this.equipment.get(user.organizationId, equipmentKey);
  }

  @Post('equipment')
  @RequirePermissions('manufacturing:resources')
  createEquipment(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResEquipmentDto,
  ) {
    return this.equipment.create(user.organizationId, user.id, dto);
  }

  @Post('equipment/:equipmentKey/availability')
  @RequirePermissions('manufacturing:resources')
  setAvailability(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('equipmentKey') equipmentKey: string,
    @Body() dto: EmfgResAvailabilityDto,
  ) {
    return this.equipment.setAvailability(user.organizationId, user.id, equipmentKey, dto.status, dto.reason);
  }

  @Post('equipment/sync-machines')
  @RequirePermissions('manufacturing:resources')
  syncMachines(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.equipment.syncFromMachines(user.organizationId, user.id);
  }

  @Get('capacity/panel')
  @RequirePermissions('manufacturing:resources')
  capacityPanel(@CurrentUser() user: { organizationId: string }) {
    return this.capacity.panel(user.organizationId);
  }

  @Post('capacity/compute')
  @RequirePermissions('manufacturing:resources')
  computeCapacity(@CurrentUser() user: { organizationId: string }) {
    return this.capacity.computeAll(user.organizationId);
  }

  @Get('maintenance/plans')
  @RequirePermissions('manufacturing:resources')
  listMaintenancePlans(
    @CurrentUser() user: { organizationId: string },
    @Query('equipmentKey') equipmentKey?: string,
  ) {
    return this.maintenance.listPlans(user.organizationId, equipmentKey);
  }

  @Post('maintenance/plans')
  @RequirePermissions('manufacturing:resources')
  createMaintenancePlan(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResMaintenancePlanDto,
  ) {
    return this.maintenance.createPlan(user.organizationId, user.id, dto);
  }

  @Get('maintenance/logs')
  @RequirePermissions('manufacturing:resources')
  listMaintenanceLogs(
    @CurrentUser() user: { organizationId: string },
    @Query('equipmentKey') equipmentKey?: string,
  ) {
    return this.maintenance.listLogs(user.organizationId, equipmentKey);
  }

  @Post('maintenance/logs')
  @RequirePermissions('manufacturing:resources')
  recordMaintenance(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResMaintenanceLogDto,
  ) {
    return this.maintenance.recordMaintenance(user.organizationId, user.id, dto);
  }

  @Get('downtimes')
  @RequirePermissions('manufacturing:resources')
  listDowntimes(@CurrentUser() user: { organizationId: string }) {
    return this.maintenance.listDowntimes(user.organizationId);
  }

  @Post('downtimes')
  @RequirePermissions('manufacturing:resources')
  recordDowntime(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResDowntimeDto,
  ) {
    return this.maintenance.recordDowntime(user.organizationId, user.id, dto);
  }

  @Post('captures')
  @RequirePermissions('manufacturing:resources')
  capture(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResCaptureDto,
  ) {
    return this.offline.capture(user.organizationId, user.id, dto);
  }

  @Post('offline/sync')
  @RequirePermissions('manufacturing:resources')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgResOfflineBatchDto,
  ) {
    return this.offline.submitBatch(user.organizationId, user.id, dto.deviceId, dto.actions as never);
  }
}
