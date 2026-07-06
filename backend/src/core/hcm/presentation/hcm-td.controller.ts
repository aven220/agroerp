import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmAuditService } from '../application/hcm-audit.service';
import { HcmTdCenterService } from '../application/hcm-td-center.service';
import { HcmTdTrainingService } from '../application/hcm-td-training.service';
import { HcmTdCompetencyService } from '../application/hcm-td-competency.service';
import { HcmTdEvaluationService } from '../application/hcm-td-evaluation.service';
import { HcmTdObjectiveService, HcmTdCareerService } from '../application/hcm-td-objective.service';
import {
  HcmTdAssessDto, HcmTdAttendanceDto, HcmTdBulkCompetencyDto, HcmTdBulkEvaluationDto,
  HcmTdCareerPlanDto, HcmTdCertificationDto, HcmTdCompetencyDto, HcmTdCourseDto,
  HcmTdCycleDto, HcmTdEnrollmentDto, HcmTdEvaluationDto, HcmTdEvaluationScoreDto,
  HcmTdObjectiveDto, HcmTdObjectiveProgressDto, HcmTdPlanAssignDto, HcmTdReadinessDto,
  HcmTdRenewCertDto, HcmTdScheduleDto,
} from './hcm-td.dto';
import type {
  HcmTdCareerPlanType, HcmTdCompetencyType, HcmTdCourseOrigin, HcmTdCourseType,
  HcmTdEvaluationStatus, HcmTdEvaluationType, HcmTdModality, HcmTdObjectiveStatus,
  HcmTdObjectiveType, HcmTdProficiencyLevel,
} from '@prisma/client';

@ApiTags('HCM — Capacitación y Desarrollo del Talento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/td')
export class HcmTdController {
  constructor(
    private readonly center: HcmTdCenterService,
    private readonly training: HcmTdTrainingService,
    private readonly competencies: HcmTdCompetencyService,
    private readonly evaluations: HcmTdEvaluationService,
    private readonly objectives: HcmTdObjectiveService,
    private readonly career: HcmTdCareerService,
    private readonly auditService: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:td_read')
  tdCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('hcm:td_read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.center.dashboard(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('hcm:td_config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:td_read')
  mobileSync(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.center.mobileSync(user.organizationId, employeeKey);
  }

  @Post('certifications/alerts')
  @RequirePermissions('hcm:td_admin')
  processAlerts(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.processCertificationAlerts(user.organizationId, user.id);
  }

  @Get('courses')
  @RequirePermissions('hcm:td_read')
  listCourses(@CurrentUser() user: { organizationId: string }) {
    return this.training.listCourses(user.organizationId);
  }

  @Post('courses')
  @RequirePermissions('hcm:td_training')
  upsertCourse(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdCourseDto) {
    return this.training.upsertCourse(user.organizationId, user.id, {
      ...dto,
      courseType: dto.courseType as HcmTdCourseType,
      courseOrigin: dto.courseOrigin as HcmTdCourseOrigin,
      modality: dto.modality as HcmTdModality,
    });
  }

  @Get('plans')
  @RequirePermissions('hcm:td_read')
  listPlans(@CurrentUser() user: { organizationId: string }) {
    return this.training.listPlans(user.organizationId);
  }

  @Post('plans/assign')
  @RequirePermissions('hcm:td_training')
  assignPlan(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdPlanAssignDto) {
    return this.training.assignPlan(user.organizationId, user.id, dto);
  }

  @Get('schedules')
  @RequirePermissions('hcm:td_read')
  listSchedules(
    @CurrentUser() user: { organizationId: string },
    @Query('courseKey') courseKey?: string,
  ) {
    return this.training.listSchedules(user.organizationId, courseKey);
  }

  @Post('schedules')
  @RequirePermissions('hcm:td_training')
  createSchedule(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdScheduleDto) {
    return this.training.createSchedule(user.organizationId, user.id, { ...dto, modality: dto.modality as HcmTdModality });
  }

  @Get('enrollments')
  @RequirePermissions('hcm:td_read')
  listEnrollments(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.training.listEnrollments(user.organizationId, employeeKey);
  }

  @Post('enrollments')
  @RequirePermissions('hcm:td_training')
  enroll(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdEnrollmentDto) {
    return this.training.enroll(user.organizationId, user.id, dto);
  }

  @Post('enrollments/:enrollmentKey/attendance')
  @RequirePermissions('hcm:td_training')
  recordAttendance(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('enrollmentKey') enrollmentKey: string,
    @Body() dto: HcmTdAttendanceDto,
  ) {
    return this.training.recordAttendance(user.organizationId, enrollmentKey, user.id, dto.attended, dto.sessionsTotal, dto.sessionsAttended);
  }

  @Get('certifications')
  @RequirePermissions('hcm:td_read')
  listCertifications(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.training.listCertifications(user.organizationId, employeeKey);
  }

  @Post('certifications')
  @RequirePermissions('hcm:td_training')
  upsertCertification(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdCertificationDto) {
    return this.training.upsertCertification(user.organizationId, user.id, dto);
  }

  @Post('certifications/:certificationKey/renew')
  @RequirePermissions('hcm:td_training')
  renewCertification(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('certificationKey') certificationKey: string,
    @Body() dto: HcmTdRenewCertDto,
  ) {
    return this.training.renewCertification(user.organizationId, certificationKey, user.id, dto.newExpiresAt);
  }

  @Get('reminders')
  @RequirePermissions('hcm:td_read')
  listReminders(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.training.listReminders(user.organizationId, employeeKey);
  }

  @Get('competencies')
  @RequirePermissions('hcm:td_read')
  listCompetencies(@CurrentUser() user: { organizationId: string }) {
    return this.competencies.list(user.organizationId);
  }

  @Post('competencies')
  @RequirePermissions('hcm:td_config')
  upsertCompetency(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdCompetencyDto) {
    return this.competencies.upsert(user.organizationId, user.id, { ...dto, competencyType: dto.competencyType as HcmTdCompetencyType });
  }

  @Get('competencies/matrix')
  @RequirePermissions('hcm:td_read')
  skillMatrix(
    @CurrentUser() user: { organizationId: string },
    @Query('departmentKey') departmentKey?: string,
  ) {
    return this.competencies.skillMatrix(user.organizationId, departmentKey);
  }

  @Get('competencies/employee')
  @RequirePermissions('hcm:td_read')
  employeeCompetencies(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.competencies.listEmployeeCompetencies(user.organizationId, employeeKey);
  }

  @Post('competencies/assess')
  @RequirePermissions('hcm:td_competency')
  assess(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdAssessDto) {
    return this.competencies.assessEmployee(user.organizationId, user.id, {
      ...dto,
      currentLevel: dto.currentLevel as HcmTdProficiencyLevel,
      targetLevel: dto.targetLevel as HcmTdProficiencyLevel,
    });
  }

  @Post('competencies/import')
  @RequirePermissions('hcm:td_competency')
  bulkImport(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdBulkCompetencyDto) {
    return this.competencies.bulkImport(user.organizationId, user.id, dto.rows.map((r) => ({
      ...r,
      currentLevel: r.currentLevel as HcmTdProficiencyLevel,
      targetLevel: r.targetLevel as HcmTdProficiencyLevel,
    })));
  }

  @Get('cycles')
  @RequirePermissions('hcm:td_read')
  listCycles(@CurrentUser() user: { organizationId: string }) {
    return this.evaluations.listCycles(user.organizationId);
  }

  @Post('cycles')
  @RequirePermissions('hcm:td_evaluate')
  createCycle(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdCycleDto) {
    return this.evaluations.createCycle(user.organizationId, user.id, dto);
  }

  @Get('evaluations')
  @RequirePermissions('hcm:td_read')
  listEvaluations(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('cycleKey') cycleKey?: string,
    @Query('status') status?: HcmTdEvaluationStatus,
  ) {
    return this.evaluations.list(user.organizationId, { employeeKey, cycleKey, status });
  }

  @Post('evaluations')
  @RequirePermissions('hcm:td_evaluate')
  createEvaluation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdEvaluationDto) {
    return this.evaluations.create(user.organizationId, user.id, { ...dto, evaluationType: dto.evaluationType as HcmTdEvaluationType });
  }

  @Post('evaluations/bulk')
  @RequirePermissions('hcm:td_evaluate')
  bulkEvaluations(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdBulkEvaluationDto) {
    return this.evaluations.bulkCreate(user.organizationId, user.id, {
      ...dto,
      evaluationType: dto.evaluationType as HcmTdEvaluationType,
    });
  }

  @Post('evaluations/:evaluationKey/scores')
  @RequirePermissions('hcm:td_evaluate')
  submitScores(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('evaluationKey') evaluationKey: string,
    @Body() dto: HcmTdEvaluationScoreDto,
  ) {
    return this.evaluations.submitScores(user.organizationId, evaluationKey, user.id, dto.scores);
  }

  @Post('evaluations/:evaluationKey/complete')
  @RequirePermissions('hcm:td_approve')
  completeEvaluation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('evaluationKey') evaluationKey: string,
  ) {
    return this.evaluations.complete(user.organizationId, evaluationKey, user.id);
  }

  @Get('objectives')
  @RequirePermissions('hcm:td_read')
  listObjectives(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('status') status?: HcmTdObjectiveStatus,
  ) {
    return this.objectives.list(user.organizationId, employeeKey, status);
  }

  @Post('objectives')
  @RequirePermissions('hcm:td_objective')
  createObjective(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdObjectiveDto) {
    return this.objectives.create(user.organizationId, user.id, { ...dto, objectiveType: dto.objectiveType as HcmTdObjectiveType });
  }

  @Put('objectives/:objectiveKey/progress')
  @RequirePermissions('hcm:td_objective')
  updateObjectiveProgress(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('objectiveKey') objectiveKey: string,
    @Body() dto: HcmTdObjectiveProgressDto,
  ) {
    return this.objectives.updateProgress(user.organizationId, objectiveKey, user.id, dto.currentValue);
  }

  @Get('objectives/compliance/:employeeKey')
  @RequirePermissions('hcm:td_read')
  objectiveCompliance(
    @CurrentUser() user: { organizationId: string },
    @Param('employeeKey') employeeKey: string,
  ) {
    return this.objectives.employeeCompliance(user.organizationId, employeeKey);
  }

  @Get('career-plans')
  @RequirePermissions('hcm:td_read')
  listCareerPlans(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.career.list(user.organizationId, { employeeKey });
  }

  @Get('career-plans/succession')
  @RequirePermissions('hcm:td_read')
  successionPlans(@CurrentUser() user: { organizationId: string }) {
    return this.career.listSuccession(user.organizationId);
  }

  @Get('career-plans/high-potential')
  @RequirePermissions('hcm:td_read')
  highPotential(@CurrentUser() user: { organizationId: string }) {
    return this.career.listHighPotential(user.organizationId);
  }

  @Post('career-plans')
  @RequirePermissions('hcm:td_career')
  createCareerPlan(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTdCareerPlanDto) {
    return this.career.createPlan(user.organizationId, user.id, { ...dto, planType: dto.planType as HcmTdCareerPlanType });
  }

  @Put('career-plans/:careerKey/readiness')
  @RequirePermissions('hcm:td_career')
  updateReadiness(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('careerKey') careerKey: string,
    @Body() dto: HcmTdReadinessDto,
  ) {
    return this.career.updateReadiness(user.organizationId, careerKey, user.id, dto.readinessScore);
  }

  @Get('audit')
  @RequirePermissions('hcm:td_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.auditService.findAll(user.organizationId, 'HcmTd');
  }
}
