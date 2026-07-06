import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmAuditService } from '../application/hcm-audit.service';
import { HcmSsCenterService } from '../application/hcm-ss-center.service';
import { HcmSsHealthService } from '../application/hcm-ss-health.service';
import { HcmSsRiskService } from '../application/hcm-ss-risk.service';
import { HcmSsPpeService } from '../application/hcm-ss-ppe.service';
import { HcmSsIncidentService } from '../application/hcm-ss-incident.service';
import { HcmSsWellbeingService } from '../application/hcm-ss-wellbeing.service';
import { HcmSsInspectionService } from '../application/hcm-ss-inspection.service';
import { HcmSsEmergencyService } from '../application/hcm-ss-emergency.service';
import {
  HcmSsAssessDto, HcmSsBrigadeDto, HcmSsBulkInspectionDto, HcmSsControlDto,
  HcmSsDrillDto, HcmSsEmergencyPlanDto, HcmSsEvidenceDto, HcmSsExamCompleteDto,
  HcmSsExamDto, HcmSsFindingDto, HcmSsFollowUpDto, HcmSsIncidentActionDto,
  HcmSsIncidentDto, HcmSsIncidentOfflineDto, HcmSsInspectionActionDto,
  HcmSsInspectionDto, HcmSsInspectionOfflineDto, HcmSsInvestigateDto,
  HcmSsMitigationDto, HcmSsMitigationProgressDto, HcmSsOfflineSyncDto,
  HcmSsParticipationDto, HcmSsPpeAssignDto, HcmSsPpeDeliveryDto, HcmSsPpeItemDto,
  HcmSsPpePositionDto, HcmSsPpeSignDto, HcmSsRestrictionDto, HcmSsRiskDto,
  HcmSsSurveyDto, HcmSsWellbeingActivityDto, HcmSsWellbeingProgramDto,
} from './hcm-ss.dto';
import type {
  HcmSsActionType, HcmSsBrigadeRole, HcmSsControlType, HcmSsDeliveryType,
  HcmSsExamStatus, HcmSsExamType, HcmSsFindingSeverity, HcmSsFitnessStatus,
  HcmSsIncidentSeverity, HcmSsIncidentStatus, HcmSsIncidentType,
  HcmSsInspectionType, HcmSsMitigationStatus, HcmSsPpeCategory,
  HcmSsRestrictionStatus, HcmSsRiskCategory, HcmSsWellbeingType,
} from '@prisma/client';

@ApiTags('HCM — SST Fase 6')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/ss')
export class HcmSsController {
  constructor(
    private readonly center: HcmSsCenterService,
    private readonly health: HcmSsHealthService,
    private readonly risks: HcmSsRiskService,
    private readonly ppe: HcmSsPpeService,
    private readonly incidents: HcmSsIncidentService,
    private readonly wellbeing: HcmSsWellbeingService,
    private readonly inspections: HcmSsInspectionService,
    private readonly emergency: HcmSsEmergencyService,
    private readonly auditService: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:ss_read')
  ssCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('hcm:ss_read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.center.dashboard(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('hcm:ss_config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:ss_read')
  mobileSync(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.center.mobileSync(user.organizationId, employeeKey);
  }

  @Get('exams')
  @RequirePermissions('hcm:ss_read')
  listExams(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('examType') examType?: HcmSsExamType,
    @Query('status') status?: HcmSsExamStatus,
  ) {
    return this.health.listExams(user.organizationId, { employeeKey, examType, status });
  }

  @Post('exams')
  @RequirePermissions('hcm:ss_health')
  scheduleExam(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsExamDto) {
    return this.health.scheduleExam(user.organizationId, user.id, { ...dto, examType: dto.examType as HcmSsExamType });
  }

  @Post('exams/:examKey/complete')
  @RequirePermissions('hcm:ss_health')
  completeExam(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('examKey') examKey: string,
    @Body() dto: HcmSsExamCompleteDto,
  ) {
    return this.health.completeExam(user.organizationId, examKey, user.id, {
      ...dto,
      fitnessStatus: dto.fitnessStatus as HcmSsFitnessStatus,
    });
  }

  @Post('exams/alerts')
  @RequirePermissions('hcm:ss_admin')
  examAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.health.processExpiryAlerts(user.organizationId, user.id);
  }

  @Get('restrictions')
  @RequirePermissions('hcm:ss_read')
  listRestrictions(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('status') status?: HcmSsRestrictionStatus,
  ) {
    return this.health.listRestrictions(user.organizationId, employeeKey, status);
  }

  @Post('restrictions')
  @RequirePermissions('hcm:ss_health')
  addRestriction(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsRestrictionDto) {
    return this.health.addRestriction(user.organizationId, user.id, dto);
  }

  @Post('restrictions/:restrictionKey/lift')
  @RequirePermissions('hcm:ss_health')
  liftRestriction(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('restrictionKey') restrictionKey: string,
  ) {
    return this.health.liftRestriction(user.organizationId, restrictionKey, user.id);
  }

  @Get('follow-ups')
  @RequirePermissions('hcm:ss_read')
  listFollowUps(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.health.listFollowUps(user.organizationId, employeeKey);
  }

  @Post('follow-ups')
  @RequirePermissions('hcm:ss_health')
  createFollowUp(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsFollowUpDto) {
    return this.health.createFollowUp(user.organizationId, user.id, dto);
  }

  @Post('follow-ups/:followUpKey/complete')
  @RequirePermissions('hcm:ss_health')
  completeFollowUp(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('followUpKey') followUpKey: string,
    @Body() body: { notes?: string },
  ) {
    return this.health.completeFollowUp(user.organizationId, followUpKey, user.id, body.notes);
  }

  @Get('fitness/:employeeKey')
  @RequirePermissions('hcm:ss_read')
  fitness(
    @CurrentUser() user: { organizationId: string },
    @Param('employeeKey') employeeKey: string,
  ) {
    return this.health.employeeFitness(user.organizationId, employeeKey);
  }

  @Get('risks')
  @RequirePermissions('hcm:ss_read')
  listRisks(@CurrentUser() user: { organizationId: string }) {
    return this.risks.listRisks(user.organizationId);
  }

  @Get('risks/matrix')
  @RequirePermissions('hcm:ss_read')
  riskMatrix(@CurrentUser() user: { organizationId: string }) {
    return this.risks.riskMatrix(user.organizationId);
  }

  @Post('risks')
  @RequirePermissions('hcm:ss_risk')
  upsertRisk(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsRiskDto) {
    return this.risks.upsertRisk(user.organizationId, user.id, { ...dto, category: dto.category as HcmSsRiskCategory });
  }

  @Get('assessments')
  @RequirePermissions('hcm:ss_read')
  listAssessments(
    @CurrentUser() user: { organizationId: string },
    @Query('riskKey') riskKey?: string,
  ) {
    return this.risks.listAssessments(user.organizationId, riskKey);
  }

  @Post('assessments')
  @RequirePermissions('hcm:ss_risk')
  assess(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsAssessDto) {
    return this.risks.assess(user.organizationId, user.id, dto);
  }

  @Get('controls')
  @RequirePermissions('hcm:ss_read')
  listControls(
    @CurrentUser() user: { organizationId: string },
    @Query('riskKey') riskKey?: string,
  ) {
    return this.risks.listControls(user.organizationId, riskKey);
  }

  @Post('controls')
  @RequirePermissions('hcm:ss_risk')
  addControl(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsControlDto) {
    return this.risks.addControl(user.organizationId, user.id, { ...dto, controlType: dto.controlType as HcmSsControlType });
  }

  @Get('mitigations')
  @RequirePermissions('hcm:ss_read')
  listMitigations(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmSsMitigationStatus,
  ) {
    return this.risks.listMitigations(user.organizationId, status);
  }

  @Post('mitigations')
  @RequirePermissions('hcm:ss_risk')
  createMitigation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsMitigationDto) {
    return this.risks.createMitigation(user.organizationId, user.id, dto);
  }

  @Put('mitigations/:planKey/progress')
  @RequirePermissions('hcm:ss_risk')
  mitigationProgress(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('planKey') planKey: string,
    @Body() dto: HcmSsMitigationProgressDto,
  ) {
    return this.risks.updateMitigationProgress(user.organizationId, planKey, user.id, dto.completedTasks, dto.totalTasks);
  }

  @Get('ppe')
  @RequirePermissions('hcm:ss_read')
  listPpe(@CurrentUser() user: { organizationId: string }) {
    return this.ppe.listItems(user.organizationId);
  }

  @Post('ppe')
  @RequirePermissions('hcm:ss_ppe')
  upsertPpe(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsPpeItemDto) {
    return this.ppe.upsertItem(user.organizationId, user.id, { ...dto, category: dto.category as HcmSsPpeCategory });
  }

  @Get('ppe/position-rules')
  @RequirePermissions('hcm:ss_read')
  listPositionRules(
    @CurrentUser() user: { organizationId: string },
    @Query('positionKey') positionKey?: string,
  ) {
    return this.ppe.listPositionRules(user.organizationId, positionKey);
  }

  @Post('ppe/position-rules')
  @RequirePermissions('hcm:ss_ppe')
  assignPosition(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsPpePositionDto) {
    return this.ppe.assignToPosition(user.organizationId, user.id, dto);
  }

  @Get('ppe/assignments')
  @RequirePermissions('hcm:ss_read')
  listAssignments(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.ppe.listAssignments(user.organizationId, employeeKey);
  }

  @Post('ppe/assignments')
  @RequirePermissions('hcm:ss_ppe')
  assignEmployee(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsPpeAssignDto) {
    return this.ppe.assignToEmployee(user.organizationId, user.id, dto);
  }

  @Get('ppe/deliveries')
  @RequirePermissions('hcm:ss_read')
  listDeliveries(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.ppe.listDeliveries(user.organizationId, employeeKey);
  }

  @Post('ppe/deliveries')
  @RequirePermissions('hcm:ss_ppe')
  deliver(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsPpeDeliveryDto) {
    return this.ppe.deliver(user.organizationId, user.id, { ...dto, deliveryType: dto.deliveryType as HcmSsDeliveryType });
  }

  @Post('ppe/deliveries/:deliveryKey/sign')
  @RequirePermissions('hcm:ss_ppe')
  signDelivery(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body() dto: HcmSsPpeSignDto,
  ) {
    return this.ppe.signDelivery(user.organizationId, deliveryKey, user.id, dto.signatureName);
  }

  @Post('ppe/offline-sync')
  @RequirePermissions('hcm:ss_ppe')
  offlineSync(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsOfflineSyncDto) {
    return this.ppe.syncOffline(user.organizationId, user.id, {
      employeeKey: dto.employeeKey,
      deviceId: dto.deviceId,
      deliveries: dto.deliveries.map((d) => ({ ...d, deliveryType: d.deliveryType as HcmSsDeliveryType })),
    });
  }

  @Get('ppe/expiry-alerts')
  @RequirePermissions('hcm:ss_read')
  ppeExpiryAlerts(@CurrentUser() user: { organizationId: string }) {
    return this.ppe.expiryAlerts(user.organizationId);
  }

  @Get('incidents')
  @RequirePermissions('hcm:ss_read')
  listIncidents(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmSsIncidentStatus,
    @Query('incidentType') incidentType?: HcmSsIncidentType,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.incidents.list(user.organizationId, { status, incidentType, employeeKey });
  }

  @Post('incidents')
  @RequirePermissions('hcm:ss_incident')
  reportIncident(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsIncidentDto) {
    return this.incidents.report(user.organizationId, user.id, {
      ...dto,
      incidentType: dto.incidentType as HcmSsIncidentType,
      severity: dto.severity as HcmSsIncidentSeverity | undefined,
    });
  }

  @Post('incidents/:incidentKey/investigate')
  @RequirePermissions('hcm:ss_incident')
  investigate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('incidentKey') incidentKey: string,
    @Body() dto: HcmSsInvestigateDto,
  ) {
    return this.incidents.investigate(user.organizationId, incidentKey, user.id, dto);
  }

  @Post('incidents/actions')
  @RequirePermissions('hcm:ss_incident')
  incidentAction(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsIncidentActionDto) {
    return this.incidents.addAction(user.organizationId, user.id, { ...dto, actionType: dto.actionType as HcmSsActionType });
  }

  @Post('incidents/actions/:actionKey/complete')
  @RequirePermissions('hcm:ss_incident')
  completeIncidentAction(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('actionKey') actionKey: string,
  ) {
    return this.incidents.completeAction(user.organizationId, actionKey, user.id);
  }

  @Post('incidents/evidences')
  @RequirePermissions('hcm:ss_incident')
  addEvidence(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsEvidenceDto) {
    return this.incidents.addEvidence(user.organizationId, user.id, dto);
  }

  @Post('incidents/:incidentKey/close')
  @RequirePermissions('hcm:ss_incident')
  closeIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('incidentKey') incidentKey: string,
  ) {
    return this.incidents.close(user.organizationId, incidentKey, user.id);
  }

  @Post('incidents/offline-sync')
  @RequirePermissions('hcm:ss_incident')
  incidentOfflineSync(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsIncidentOfflineDto) {
    return this.incidents.syncOffline(user.organizationId, user.id, {
      employeeKey: dto.employeeKey,
      deviceId: dto.deviceId,
      incidents: dto.incidents.map((i) => ({
        ...i,
        incidentType: i.incidentType as HcmSsIncidentType,
        severity: i.severity as HcmSsIncidentSeverity | undefined,
      })),
    });
  }

  @Get('wellbeing/programs')
  @RequirePermissions('hcm:ss_read')
  listWellbeingPrograms(@CurrentUser() user: { organizationId: string }) {
    return this.wellbeing.listPrograms(user.organizationId);
  }

  @Post('wellbeing/programs')
  @RequirePermissions('hcm:ss_config')
  createWellbeingProgram(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsWellbeingProgramDto) {
    return this.wellbeing.createProgram(user.organizationId, user.id, { ...dto, programType: dto.programType as HcmSsWellbeingType });
  }

  @Get('wellbeing/activities')
  @RequirePermissions('hcm:ss_read')
  listWellbeingActivities(
    @CurrentUser() user: { organizationId: string },
    @Query('programKey') programKey?: string,
  ) {
    return this.wellbeing.listActivities(user.organizationId, programKey);
  }

  @Post('wellbeing/activities')
  @RequirePermissions('hcm:ss_config')
  createWellbeingActivity(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsWellbeingActivityDto) {
    return this.wellbeing.createActivity(user.organizationId, user.id, dto);
  }

  @Post('wellbeing/participations')
  @RequirePermissions('hcm:ss_read')
  registerParticipation(@CurrentUser() user: { organizationId: string }, @Body() dto: HcmSsParticipationDto) {
    return this.wellbeing.registerParticipation(user.organizationId, dto);
  }

  @Post('wellbeing/surveys')
  @RequirePermissions('hcm:ss_config')
  createSurvey(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsSurveyDto) {
    return this.wellbeing.createSurvey(user.organizationId, user.id, dto);
  }

  @Get('inspections')
  @RequirePermissions('hcm:ss_read')
  listInspections(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('inspectionType') inspectionType?: HcmSsInspectionType,
  ) {
    return this.inspections.list(user.organizationId, { status, inspectionType });
  }

  @Post('inspections')
  @RequirePermissions('hcm:ss_inspect')
  createInspection(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsInspectionDto) {
    return this.inspections.create(user.organizationId, user.id, { ...dto, inspectionType: dto.inspectionType as HcmSsInspectionType });
  }

  @Post('inspections/bulk')
  @RequirePermissions('hcm:ss_inspect')
  bulkInspections(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsBulkInspectionDto) {
    return this.inspections.bulkCreate(user.organizationId, user.id, dto.rows.map((r) => ({
      ...r,
      inspectionType: r.inspectionType as HcmSsInspectionType,
    })));
  }

  @Post('inspections/findings')
  @RequirePermissions('hcm:ss_inspect')
  addFinding(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsFindingDto) {
    return this.inspections.addFinding(user.organizationId, user.id, {
      ...dto,
      severity: dto.severity as HcmSsFindingSeverity | undefined,
    });
  }

  @Post('inspections/actions')
  @RequirePermissions('hcm:ss_inspect')
  inspectionAction(@CurrentUser() user: { organizationId: string }, @Body() dto: HcmSsInspectionActionDto) {
    return this.inspections.addAction(user.organizationId, dto);
  }

  @Post('inspections/:inspectionKey/complete')
  @RequirePermissions('hcm:ss_inspect')
  completeInspection(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('inspectionKey') inspectionKey: string,
  ) {
    return this.inspections.complete(user.organizationId, inspectionKey, user.id);
  }

  @Post('inspections/offline-sync')
  @RequirePermissions('hcm:ss_inspect')
  inspectionOfflineSync(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsInspectionOfflineDto) {
    return this.inspections.syncOffline(user.organizationId, user.id, {
      employeeKey: dto.employeeKey,
      deviceId: dto.deviceId,
      inspections: dto.inspections.map((i) => ({
        ...i,
        inspectionType: i.inspectionType as HcmSsInspectionType,
        findings: i.findings?.map((f) => ({
          ...f,
          severity: f.severity as HcmSsFindingSeverity | undefined,
        })),
      })),
    });
  }

  @Get('emergency/plans')
  @RequirePermissions('hcm:ss_read')
  listEmergencyPlans(@CurrentUser() user: { organizationId: string }) {
    return this.emergency.listPlans(user.organizationId);
  }

  @Post('emergency/plans')
  @RequirePermissions('hcm:ss_config')
  createEmergencyPlan(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsEmergencyPlanDto) {
    return this.emergency.createPlan(user.organizationId, user.id, dto);
  }

  @Post('emergency/brigades')
  @RequirePermissions('hcm:ss_config')
  addBrigade(@CurrentUser() user: { organizationId: string }, @Body() dto: HcmSsBrigadeDto) {
    return this.emergency.addBrigadeMember(user.organizationId, { ...dto, role: dto.role as HcmSsBrigadeRole });
  }

  @Post('emergency/drills')
  @RequirePermissions('hcm:ss_config')
  scheduleDrill(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmSsDrillDto) {
    return this.emergency.scheduleDrill(user.organizationId, user.id, dto);
  }

  @Get('audit')
  @RequirePermissions('hcm:ss_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.auditService.findAll(user.organizationId, 'HcmSs');
  }
}
