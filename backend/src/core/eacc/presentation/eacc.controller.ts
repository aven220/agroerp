import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EaccAuditService } from '../application/eacc-audit.service';
import { EaccCertificationService } from '../application/eacc-certification.service';
import { EaccComplianceService } from '../application/eacc-compliance.service';
import { EaccBridgeService, EaccDashboardService, EaccOfflineService } from '../application/eacc-dashboard.service';
import { EaccEngineService } from '../application/eacc-engine.service';
import { EaccInspectionService } from '../application/eacc-inspection.service';
import { EaccDocumentService, EaccSafetyService, EaccSustainabilityService } from '../application/eacc-sustainability.service';
import {
  EaccAuditDto, EaccAuditPlanDto, EaccBridgeDto, EaccCertificationDto, EaccChecklistDto,
  EaccChecklistItemDto, EaccCorrectiveActionDto, EaccDocumentLinkDto, EaccEsgIndicatorDto,
  EaccEsgObjectiveDto, EaccEsgReportDto, EaccEvidenceDto, EaccFindingDto, EaccFootprintConfigDto,
  EaccFootprintRecordDto, EaccFrameworkDto, EaccOfflineBatchDto, EaccPpeDeliveryDto,
  EaccRequirementDto, EaccSafetyIncidentDto, EaccSafetyInspectionDto, EaccSafetyTrainingDto,
  EaccSustainabilityDto, EaccSustainabilityIndicatorDto, EaccWorkPermitDto,
} from './eacc.dto';

@ApiTags('EACC — Enterprise Agricultural Compliance & Certifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eacc')
export class EaccController {
  constructor(
    private readonly engine: EaccEngineService,
    private readonly dashboard: EaccDashboardService,
    private readonly certification: EaccCertificationService,
    private readonly compliance: EaccComplianceService,
    private readonly inspection: EaccInspectionService,
    private readonly sustainability: EaccSustainabilityService,
    private readonly safety: EaccSafetyService,
    private readonly documentSvc: EaccDocumentService,
    private readonly bridge: EaccBridgeService,
    private readonly offline: EaccOfflineService,
    private readonly audit: EaccAuditService,
  ) {}

  @Get('center') @RequirePermissions('eacc:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('eacc:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('eacc:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('eacc:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('frameworks') @RequirePermissions('eacc:read')
  frameworks(@CurrentUser() user: { organizationId: string }) {
    return this.certification.listFrameworks(user.organizationId);
  }

  @Post('frameworks') @RequirePermissions('eacc:config')
  registerFramework(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccFrameworkDto) {
    return this.certification.registerFramework(user.organizationId, dto);
  }

  @Get('certifications') @RequirePermissions('eacc:read')
  certifications(@CurrentUser() user: { organizationId: string }, @Query('certType') certType?: string) {
    return this.certification.listCertifications(user.organizationId, certType);
  }

  @Post('certifications') @RequirePermissions('eacc:execute')
  registerCert(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccCertificationDto) {
    return this.certification.registerCertification(user.organizationId, user.id, dto);
  }

  @Post('certifications/:certKey/renew') @RequirePermissions('eacc:execute')
  renewCert(@CurrentUser() user: { organizationId: string; id: string }, @Param('certKey') certKey: string, @Body('notes') notes?: string) {
    return this.certification.renewCertification(user.organizationId, user.id, certKey, notes);
  }

  @Get('requirements') @RequirePermissions('eacc:read')
  requirements(@CurrentUser() user: { organizationId: string }, @Query('certificationId') certificationId?: string) {
    return this.compliance.listRequirements(user.organizationId, certificationId);
  }

  @Post('requirements') @RequirePermissions('eacc:execute')
  registerReq(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccRequirementDto) {
    return this.compliance.registerRequirement(user.organizationId, user.id, dto);
  }

  @Get('checklists') @RequirePermissions('eacc:read')
  checklists(@CurrentUser() user: { organizationId: string }) {
    return this.compliance.listChecklists(user.organizationId);
  }

  @Post('checklists') @RequirePermissions('eacc:execute')
  createChecklist(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccChecklistDto) {
    return this.compliance.createChecklist(user.organizationId, dto);
  }

  @Post('checklists/items/:itemKey/complete') @RequirePermissions('eacc:execute')
  completeItem(@CurrentUser() user: { organizationId: string; id: string }, @Param('itemKey') itemKey: string, @Body() dto: EaccChecklistItemDto) {
    return this.compliance.completeChecklistItem(user.organizationId, user.id, itemKey, dto);
  }

  @Get('evidences') @RequirePermissions('eacc:read')
  evidences(@CurrentUser() user: { organizationId: string }) {
    return this.compliance.listEvidences(user.organizationId);
  }

  @Post('evidences') @RequirePermissions('eacc:execute')
  uploadEvidence(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccEvidenceDto) {
    return this.compliance.uploadEvidence(user.organizationId, user.id, dto);
  }

  @Get('alerts') @RequirePermissions('eacc:read')
  alerts(@CurrentUser() user: { organizationId: string }) {
    return this.compliance.listAlerts(user.organizationId);
  }

  @Get('audit-plans') @RequirePermissions('eacc:read')
  auditPlans(@CurrentUser() user: { organizationId: string }) {
    return this.inspection.listPlans(user.organizationId);
  }

  @Post('audit-plans') @RequirePermissions('eacc:execute')
  createPlan(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccAuditPlanDto) {
    return this.inspection.createPlan(user.organizationId, user.id, dto);
  }

  @Get('audits') @RequirePermissions('eacc:read')
  audits(@CurrentUser() user: { organizationId: string }, @Query('auditType') auditType?: string) {
    return this.inspection.listAudits(user.organizationId, auditType);
  }

  @Post('audits') @RequirePermissions('eacc:execute')
  recordAudit(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccAuditDto) {
    return this.inspection.recordAudit(user.organizationId, user.id, dto);
  }

  @Post('audits/:auditKey/complete') @RequirePermissions('eacc:execute')
  completeAudit(@CurrentUser() user: { organizationId: string; id: string }, @Param('auditKey') auditKey: string) {
    return this.inspection.completeAudit(user.organizationId, user.id, auditKey);
  }

  @Get('findings') @RequirePermissions('eacc:read')
  findings(@CurrentUser() user: { organizationId: string }) {
    return this.inspection.listFindings(user.organizationId);
  }

  @Post('findings') @RequirePermissions('eacc:execute')
  recordFinding(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccFindingDto) {
    return this.inspection.recordFinding(user.organizationId, user.id, dto);
  }

  @Post('corrective-actions') @RequirePermissions('eacc:execute')
  openAction(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccCorrectiveActionDto) {
    return this.inspection.openCorrectiveAction(user.organizationId, user.id, dto);
  }

  @Post('corrective-actions/:actionKey/close') @RequirePermissions('eacc:execute')
  closeAction(@CurrentUser() user: { organizationId: string; id: string }, @Param('actionKey') actionKey: string) {
    return this.inspection.closeCorrectiveAction(user.organizationId, user.id, actionKey);
  }

  @Get('documents') @RequirePermissions('eacc:read')
  listDocuments(@CurrentUser() user: { organizationId: string }, @Query('docType') docType?: string) {
    return this.documentSvc.list(user.organizationId, docType);
  }

  @Post('documents') @RequirePermissions('eacc:execute')
  linkDocument(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccDocumentLinkDto) {
    return this.documentSvc.link(user.organizationId, user.id, dto);
  }

  @Get('sustainability/indicators') @RequirePermissions('eacc:read')
  sustainabilityIndicators(@CurrentUser() user: { organizationId: string }, @Query('category') category?: string) {
    return this.sustainability.listIndicators(user.organizationId, category);
  }

  @Post('sustainability/indicators') @RequirePermissions('eacc:config')
  registerSusIndicator(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccSustainabilityIndicatorDto) {
    return this.sustainability.registerIndicator(user.organizationId, dto);
  }

  @Post('sustainability/records') @RequirePermissions('eacc:execute')
  recordSustainability(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccSustainabilityDto) {
    return this.sustainability.recordSustainability(user.organizationId, user.id, dto);
  }

  @Get('esg/indicators') @RequirePermissions('eacc:read')
  esgIndicators(@CurrentUser() user: { organizationId: string }, @Query('pillar') pillar?: string) {
    return this.sustainability.listEsgIndicators(user.organizationId, pillar);
  }

  @Post('esg/indicators') @RequirePermissions('eacc:config')
  registerEsgIndicator(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccEsgIndicatorDto) {
    return this.sustainability.registerEsgIndicator(user.organizationId, dto);
  }

  @Get('esg/objectives') @RequirePermissions('eacc:read')
  esgObjectives(@CurrentUser() user: { organizationId: string }) {
    return this.sustainability.listEsgObjectives(user.organizationId);
  }

  @Post('esg/objectives') @RequirePermissions('eacc:execute')
  setEsgObjective(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccEsgObjectiveDto) {
    return this.sustainability.setEsgObjective(user.organizationId, user.id, dto);
  }

  @Get('esg/reports') @RequirePermissions('eacc:read')
  esgReports(@CurrentUser() user: { organizationId: string }) {
    return this.sustainability.listEsgReports(user.organizationId);
  }

  @Post('esg/reports') @RequirePermissions('eacc:execute')
  generateEsgReport(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccEsgReportDto) {
    return this.sustainability.generateEsgReport(user.organizationId, user.id, dto);
  }

  @Get('footprint/configs') @RequirePermissions('eacc:read')
  footprintConfigs(@CurrentUser() user: { organizationId: string }, @Query('footprintType') footprintType?: string) {
    return this.sustainability.listFootprintConfigs(user.organizationId, footprintType);
  }

  @Post('footprint/configs') @RequirePermissions('eacc:config')
  registerFootprintConfig(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccFootprintConfigDto) {
    return this.sustainability.registerFootprintConfig(user.organizationId, dto);
  }

  @Post('footprint/records') @RequirePermissions('eacc:execute')
  recordFootprint(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccFootprintRecordDto) {
    return this.sustainability.recordFootprint(user.organizationId, user.id, dto);
  }

  @Get('safety/trainings') @RequirePermissions('eacc:read')
  trainings(@CurrentUser() user: { organizationId: string }) {
    return this.safety.listTrainings(user.organizationId);
  }

  @Post('safety/trainings') @RequirePermissions('eacc:execute')
  recordTraining(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccSafetyTrainingDto) {
    return this.safety.recordTraining(user.organizationId, dto);
  }

  @Get('safety/ppe') @RequirePermissions('eacc:read')
  ppeDeliveries(@CurrentUser() user: { organizationId: string }) {
    return this.safety.listPpeDeliveries(user.organizationId);
  }

  @Post('safety/ppe') @RequirePermissions('eacc:execute')
  recordPpe(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccPpeDeliveryDto) {
    return this.safety.recordPpeDelivery(user.organizationId, dto);
  }

  @Get('safety/incidents') @RequirePermissions('eacc:read')
  incidents(@CurrentUser() user: { organizationId: string }) {
    return this.safety.listIncidents(user.organizationId);
  }

  @Post('safety/incidents') @RequirePermissions('eacc:execute')
  recordIncident(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccSafetyIncidentDto) {
    return this.safety.recordIncident(user.organizationId, user.id, dto);
  }

  @Get('safety/inspections') @RequirePermissions('eacc:read')
  safetyInspections(@CurrentUser() user: { organizationId: string }) {
    return this.safety.listInspections(user.organizationId);
  }

  @Post('safety/inspections') @RequirePermissions('eacc:execute')
  recordSafetyInspection(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccSafetyInspectionDto) {
    return this.safety.recordSafetyInspection(user.organizationId, user.id, dto);
  }

  @Get('safety/permits') @RequirePermissions('eacc:read')
  workPermits(@CurrentUser() user: { organizationId: string }) {
    return this.safety.listWorkPermits(user.organizationId);
  }

  @Post('safety/permits') @RequirePermissions('eacc:execute')
  issuePermit(@CurrentUser() user: { organizationId: string }, @Body() dto: EaccWorkPermitDto) {
    return this.safety.issueWorkPermit(user.organizationId, dto);
  }

  @Post('bridge') @RequirePermissions('eacc:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('eacc:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches') @RequirePermissions('eacc:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaccOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('eacc:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
