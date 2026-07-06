import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EphpAuditService } from '../application/ephp-audit.service';
import { EphpAlertService } from '../application/ephp-alert.service';
import { EphpComplianceService, EphpIntervalService, EphpMrlService } from '../application/ephp-compliance.service';
import { EphpBridgeService, EphpDashboardService, EphpOfflineService } from '../application/ephp-dashboard.service';
import { EphpDiseaseService } from '../application/ephp-disease.service';
import { EphpEngineService } from '../application/ephp-engine.service';
import { EphpIpmService } from '../application/ephp-ipm.service';
import { EphpMonitoringService } from '../application/ephp-monitoring.service';
import { EphpPestService } from '../application/ephp-pest.service';
import { EphpApplicationService, EphpTreatmentService } from '../application/ephp-treatment.service';
import {
  EphpApplicationDto, EphpBridgeDto, EphpChecklistDto, EphpDiseaseCatalogDto, EphpDiseaseRecordDto,
  EphpFrameworkDto, EphpGenerateAlertsDto, EphpIntervalRuleDto, EphpIpmEvalDto, EphpIpmEvaluateDto,
  EphpIpmPlanDto, EphpMonitoringDto, EphpMrlDto, EphpMrlValidateDto, EphpOfflineBatchDto,
  EphpPestCatalogDto, EphpPestRecordDto, EphpTreatmentDto,
} from './ephp.dto';

@ApiTags('EPHP — Enterprise Plant Health Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ephp')
export class EphpController {
  constructor(
    private readonly engine: EphpEngineService,
    private readonly dashboard: EphpDashboardService,
    private readonly pests: EphpPestService,
    private readonly diseases: EphpDiseaseService,
    private readonly monitoring: EphpMonitoringService,
    private readonly treatments: EphpTreatmentService,
    private readonly applications: EphpApplicationService,
    private readonly ipm: EphpIpmService,
    private readonly intervals: EphpIntervalService,
    private readonly mrl: EphpMrlService,
    private readonly compliance: EphpComplianceService,
    private readonly alerts: EphpAlertService,
    private readonly bridge: EphpBridgeService,
    private readonly offline: EphpOfflineService,
    private readonly audit: EphpAuditService,
  ) {}

  @Get('center') @RequirePermissions('ephp:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('ephp:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('ephp:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('ephp:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('pests/catalog') @RequirePermissions('ephp:read')
  pestCatalog(@CurrentUser() user: { organizationId: string }) {
    return this.pests.listCatalog(user.organizationId);
  }

  @Post('pests/catalog') @RequirePermissions('ephp:config')
  registerPest(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpPestCatalogDto) {
    return this.pests.registerCatalog(user.organizationId, dto);
  }

  @Get('pests/records') @RequirePermissions('ephp:read')
  pestRecords(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.pests.listRecords(user.organizationId, fieldLotId);
  }

  @Post('pests/records') @RequirePermissions('ephp:execute')
  recordPest(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpPestRecordDto) {
    return this.pests.recordObservation(user.organizationId, user.id, dto);
  }

  @Get('diseases/catalog') @RequirePermissions('ephp:read')
  diseaseCatalog(@CurrentUser() user: { organizationId: string }) {
    return this.diseases.listCatalog(user.organizationId);
  }

  @Post('diseases/catalog') @RequirePermissions('ephp:config')
  registerDisease(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpDiseaseCatalogDto) {
    return this.diseases.registerCatalog(user.organizationId, dto);
  }

  @Get('diseases/records') @RequirePermissions('ephp:read')
  diseaseRecords(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.diseases.listRecords(user.organizationId, fieldLotId);
  }

  @Post('diseases/records') @RequirePermissions('ephp:execute')
  recordDisease(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpDiseaseRecordDto) {
    return this.diseases.recordObservation(user.organizationId, user.id, dto);
  }

  @Get('monitoring') @RequirePermissions('ephp:read')
  listMonitoring(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.monitoring.list(user.organizationId, fieldLotId);
  }

  @Post('monitoring') @RequirePermissions('ephp:execute')
  recordMonitoring(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpMonitoringDto) {
    return this.monitoring.record(user.organizationId, user.id, dto);
  }

  @Get('treatments') @RequirePermissions('ephp:read')
  listTreatments(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.treatments.list(user.organizationId, fieldLotId);
  }

  @Post('treatments') @RequirePermissions('ephp:execute')
  scheduleTreatment(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpTreatmentDto) {
    return this.treatments.schedule(user.organizationId, user.id, {
      ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Post('treatments/:treatmentKey/complete') @RequirePermissions('ephp:execute')
  completeTreatment(@CurrentUser() user: { organizationId: string; id: string }, @Param('treatmentKey') treatmentKey: string) {
    return this.treatments.complete(user.organizationId, user.id, treatmentKey);
  }

  @Get('applications') @RequirePermissions('ephp:read')
  listApplications(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.applications.list(user.organizationId, fieldLotId);
  }

  @Post('applications') @RequirePermissions('ephp:execute')
  recordApplication(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpApplicationDto) {
    return this.applications.record(user.organizationId, user.id, dto);
  }

  @Get('ipm/plans') @RequirePermissions('ephp:read')
  ipmPlans(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.ipm.listPlans(user.organizationId, fieldLotId);
  }

  @Post('ipm/plans') @RequirePermissions('ephp:config')
  createIpmPlan(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpIpmPlanDto) {
    return this.ipm.createPlan(user.organizationId, dto);
  }

  @Post('ipm/evaluate') @RequirePermissions('ephp:read')
  evaluateIpm(@Body() dto: EphpIpmEvaluateDto) {
    return this.ipm.evaluateAction(dto.infestationLevel, dto.threshold);
  }

  @Post('ipm/plans/:planKey/evaluations') @RequirePermissions('ephp:execute')
  recordIpmEval(@CurrentUser() user: { organizationId: string; id: string }, @Param('planKey') planKey: string, @Body() dto: EphpIpmEvalDto) {
    return this.ipm.recordEvaluation(user.organizationId, user.id, planKey, dto);
  }

  @Get('intervals/rules') @RequirePermissions('ephp:read')
  intervalRules(@CurrentUser() user: { organizationId: string }) {
    return this.intervals.listRules(user.organizationId);
  }

  @Post('intervals/rules') @RequirePermissions('ephp:config')
  registerInterval(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpIntervalRuleDto) {
    return this.intervals.registerRule(user.organizationId, dto);
  }

  @Get('intervals/alerts') @RequirePermissions('ephp:read')
  intervalAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.intervals.listAlerts(user.organizationId);
  }

  @Get('mrl') @RequirePermissions('ephp:read')
  mrlList(@CurrentUser() user: { organizationId: string }, @Query('countryCode') countryCode?: string) {
    return this.mrl.list(user.organizationId, countryCode);
  }

  @Post('mrl') @RequirePermissions('ephp:config')
  registerMrl(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpMrlDto) {
    return this.mrl.register(user.organizationId, dto);
  }

  @Post('mrl/validate') @RequirePermissions('ephp:execute')
  validateMrl(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpMrlValidateDto) {
    return this.mrl.validate(user.organizationId, dto);
  }

  @Get('compliance/frameworks') @RequirePermissions('ephp:read')
  frameworks(@CurrentUser() user: { organizationId: string }) {
    return this.compliance.listFrameworks(user.organizationId);
  }

  @Post('compliance/frameworks') @RequirePermissions('ephp:config')
  registerFramework(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpFrameworkDto) {
    return this.compliance.registerFramework(user.organizationId, dto);
  }

  @Post('compliance/checklists') @RequirePermissions('ephp:config')
  upsertChecklist(@CurrentUser() user: { organizationId: string }, @Body() dto: EphpChecklistDto) {
    return this.compliance.upsertChecklist(user.organizationId, dto);
  }

  @Get('alerts') @RequirePermissions('ephp:read')
  listAlerts(@CurrentUser() user: { organizationId: string }, @Query('active') active?: string) {
    return active === 'false' ? this.alerts.listAll(user.organizationId) : this.alerts.listActive(user.organizationId);
  }

  @Post('alerts/generate') @RequirePermissions('ephp:execute')
  generateAlerts(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpGenerateAlertsDto) {
    return this.alerts.generate(user.organizationId, user.id, dto);
  }

  @Post('alerts/:alertKey/resolve') @RequirePermissions('ephp:execute')
  resolveAlert(@CurrentUser() user: { organizationId: string }, @Param('alertKey') alertKey: string) {
    return this.alerts.resolve(user.organizationId, alertKey);
  }

  @Post('bridge') @RequirePermissions('ephp:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('ephp:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches') @RequirePermissions('ephp:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EphpOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('ephp:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
