import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmfgQmsCapaStatus, EmfgQmsInspectionResult, EmfgQmsInspectionType, EmfgQmsLotReleaseStatus, EmfgQmsNcStatus, EmfgQmsPlanScope } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgQmsCapaService } from '../application/emfg-qms-capa.service';
import { EmfgQmsIndicatorsService } from '../application/emfg-qms-indicators.service';
import { EmfgQmsInspectionService } from '../application/emfg-qms-inspection.service';
import { EmfgQmsNcService } from '../application/emfg-qms-nc.service';
import { EmfgQmsOfflineService } from '../application/emfg-qms-offline.service';
import { EmfgQmsPlanService } from '../application/emfg-qms-plan.service';
import { EmfgQmsReleaseService } from '../application/emfg-qms-release.service';
import {
  EmfgQmsCapaDto, EmfgQmsCapaVerifyDto, EmfgQmsEvidenceDto, EmfgQmsInspectionDto,
  EmfgQmsMeasurementDto, EmfgQmsNcDto, EmfgQmsOfflineBatchDto, EmfgQmsPlanDto, EmfgQmsReleaseDecisionDto,
} from './emfg-qms.dto';

@ApiTags('EMFG — QMS Calidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg/qms')
export class EmfgQmsController {
  constructor(
    private readonly plans: EmfgQmsPlanService,
    private readonly inspections: EmfgQmsInspectionService,
    private readonly nc: EmfgQmsNcService,
    private readonly capa: EmfgQmsCapaService,
    private readonly release: EmfgQmsReleaseService,
    private readonly indicators: EmfgQmsIndicatorsService,
    private readonly offline: EmfgQmsOfflineService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('manufacturing:quality')
  dashboard(
    @CurrentUser() user: { organizationId: string },
    @Query('periodDays') periodDays?: string,
  ) {
    return this.indicators.dashboard(user.organizationId, periodDays ? Number(periodDays) : 30);
  }

  @Get('plans')
  @RequirePermissions('manufacturing:quality')
  listPlans(
    @CurrentUser() user: { organizationId: string },
    @Query('scope') scope?: EmfgQmsPlanScope,
  ) {
    return this.plans.list(user.organizationId, scope);
  }

  @Get('plans/:planKey')
  @RequirePermissions('manufacturing:quality')
  getPlan(@CurrentUser() user: { organizationId: string }, @Param('planKey') planKey: string) {
    return this.plans.get(user.organizationId, planKey);
  }

  @Post('plans')
  @RequirePermissions('manufacturing:quality')
  createPlan(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgQmsPlanDto,
  ) {
    return this.plans.create(user.organizationId, user.id, dto);
  }

  @Post('plans/:planKey/version')
  @RequirePermissions('manufacturing:quality')
  versionPlan(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('planKey') planKey: string,
  ) {
    return this.plans.newVersion(user.organizationId, user.id, planKey);
  }

  @Get('inspections')
  @RequirePermissions('manufacturing:quality')
  listInspections(
    @CurrentUser() user: { organizationId: string },
    @Query('inspectionType') inspectionType?: EmfgQmsInspectionType,
    @Query('result') result?: EmfgQmsInspectionResult,
  ) {
    return this.inspections.list(user.organizationId, { inspectionType, result });
  }

  @Get('inspections/:inspectionKey')
  @RequirePermissions('manufacturing:quality')
  getInspection(
    @CurrentUser() user: { organizationId: string },
    @Param('inspectionKey') inspectionKey: string,
  ) {
    return this.inspections.get(user.organizationId, inspectionKey);
  }

  @Post('inspections')
  @RequirePermissions('manufacturing:quality')
  createInspection(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgQmsInspectionDto,
  ) {
    return this.inspections.create(user.organizationId, user.id, dto);
  }

  @Post('inspections/:inspectionKey/measurements')
  @RequirePermissions('manufacturing:quality')
  addMeasurement(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('inspectionKey') inspectionKey: string,
    @Body() dto: EmfgQmsMeasurementDto,
  ) {
    return this.inspections.addMeasurement(user.organizationId, user.id, inspectionKey, dto);
  }

  @Post('inspections/:inspectionKey/evidences')
  @RequirePermissions('manufacturing:quality')
  addEvidence(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('inspectionKey') inspectionKey: string,
    @Body() dto: EmfgQmsEvidenceDto,
  ) {
    return this.inspections.addEvidence(user.organizationId, user.id, inspectionKey, dto);
  }

  @Post('inspections/:inspectionKey/complete')
  @RequirePermissions('manufacturing:quality')
  completeInspection(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('inspectionKey') inspectionKey: string,
  ) {
    return this.inspections.complete(user.organizationId, user.id, inspectionKey);
  }

  @Get('non-conformances')
  @RequirePermissions('manufacturing:quality')
  listNc(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EmfgQmsNcStatus,
  ) {
    return this.nc.list(user.organizationId, status);
  }

  @Get('non-conformances/:ncKey')
  @RequirePermissions('manufacturing:quality')
  getNc(@CurrentUser() user: { organizationId: string }, @Param('ncKey') ncKey: string) {
    return this.nc.get(user.organizationId, ncKey);
  }

  @Post('non-conformances')
  @RequirePermissions('manufacturing:quality')
  createNc(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgQmsNcDto,
  ) {
    return this.nc.create(user.organizationId, user.id, dto);
  }

  @Post('non-conformances/:ncKey/close')
  @RequirePermissions('manufacturing:quality')
  closeNc(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('ncKey') ncKey: string,
  ) {
    return this.nc.close(user.organizationId, user.id, ncKey);
  }

  @Get('capa')
  @RequirePermissions('manufacturing:quality')
  listCapa(@CurrentUser() user: { organizationId: string }) {
    return this.capa.list(user.organizationId);
  }

  @Get('capa/:capaKey')
  @RequirePermissions('manufacturing:quality')
  getCapa(@CurrentUser() user: { organizationId: string }, @Param('capaKey') capaKey: string) {
    return this.capa.get(user.organizationId, capaKey);
  }

  @Post('capa')
  @RequirePermissions('manufacturing:quality')
  createCapa(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgQmsCapaDto,
  ) {
    return this.capa.create(user.organizationId, user.id, dto);
  }

  @Patch('capa/:capaKey/status')
  @RequirePermissions('manufacturing:quality')
  updateCapaStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('capaKey') capaKey: string,
    @Body('status') status: EmfgQmsCapaStatus,
  ) {
    return this.capa.updateStatus(user.organizationId, user.id, capaKey, status);
  }

  @Post('capa/:capaKey/verify')
  @RequirePermissions('manufacturing:quality')
  verifyCapa(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('capaKey') capaKey: string,
    @Body() dto: EmfgQmsCapaVerifyDto,
  ) {
    return this.capa.verify(user.organizationId, user.id, capaKey, dto);
  }

  @Get('releases')
  @RequirePermissions('manufacturing:quality')
  listReleases(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EmfgQmsLotReleaseStatus,
  ) {
    return this.release.list(user.organizationId, status);
  }

  @Get('releases/:releaseKey')
  @RequirePermissions('manufacturing:quality')
  getRelease(
    @CurrentUser() user: { organizationId: string },
    @Param('releaseKey') releaseKey: string,
  ) {
    return this.release.get(user.organizationId, releaseKey);
  }

  @Post('releases/:releaseKey/decide')
  @RequirePermissions('manufacturing:quality')
  decideRelease(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('releaseKey') releaseKey: string,
    @Body() dto: EmfgQmsReleaseDecisionDto,
  ) {
    return this.release.decide(user.organizationId, user.id, releaseKey, dto.action, dto.reason);
  }

  @Post('offline/sync')
  @RequirePermissions('manufacturing:quality')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgQmsOfflineBatchDto,
  ) {
    return this.offline.submitBatch(user.organizationId, user.id, dto.deviceId, dto.actions as never);
  }
}
