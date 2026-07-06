import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmRcCenterService } from '../application/hcm-rc-center.service';
import { HcmRcVacancyService } from '../application/hcm-rc-vacancy.service';
import { HcmRcRecruitmentService } from '../application/hcm-rc-recruitment.service';
import { HcmRcSelectionService } from '../application/hcm-rc-selection.service';
import { HcmRcHiringService } from '../application/hcm-rc-hiring.service';
import { HcmRcOnboardingService } from '../application/hcm-rc-onboarding.service';
import { HcmAuditService } from '../application/hcm-audit.service';
import {
  HcmRcApplyDto,
  HcmRcApprovalActionDto,
  HcmRcAssessmentDto,
  HcmRcCampaignDto,
  HcmRcCandidateDto,
  HcmRcCompareDto,
  HcmRcCompleteInterviewDto,
  HcmRcEvaluationDto,
  HcmRcImportCandidatesDto,
  HcmRcInductionDto,
  HcmRcInterviewDto,
  HcmRcJobFairDto,
  HcmRcOfferDto,
  HcmRcOnboardingTaskDto,
  HcmRcPublishDto,
  HcmRcReferralDto,
  HcmRcSignatureDto,
  HcmRcStatusDto,
  HcmRcTalentPoolDto,
  HcmRcVacancyDto,
} from './hcm-rc.dto';
import type { HcmRcApplicationStatus, HcmRcInterviewStatus, HcmRcOfferStatus, HcmRcOnboardingTaskStatus, HcmRcPublicationChannel, HcmRcVacancyStatus } from '@prisma/client';

@ApiTags('HCM — Reclutamiento y Selección')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/rc')
export class HcmRcController {
  constructor(
    private readonly center: HcmRcCenterService,
    private readonly vacancies: HcmRcVacancyService,
    private readonly recruitment: HcmRcRecruitmentService,
    private readonly selection: HcmRcSelectionService,
    private readonly hiring: HcmRcHiringService,
    private readonly onboarding: HcmRcOnboardingService,
    private readonly audit: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:rc_read')
  rcCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('hcm:rc_config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:rc_read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.center.mobileSync(user.organizationId);
  }

  @Get('vacancies')
  @RequirePermissions('hcm:rc_read')
  listVacancies(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmRcVacancyStatus,
    @Query('q') q?: string,
  ) {
    return this.vacancies.list(user.organizationId, { status, q });
  }

  @Get('vacancies/published')
  @RequirePermissions('hcm:rc_read')
  listPublished(
    @CurrentUser() user: { organizationId: string },
    @Query('channel') channel?: 'internal' | 'external',
  ) {
    return this.vacancies.listPublished(user.organizationId, channel);
  }

  @Get('vacancies/:vacancyKey')
  @RequirePermissions('hcm:rc_read')
  getVacancy(@CurrentUser() user: { organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.vacancies.get(user.organizationId, vacancyKey);
  }

  @Post('vacancies')
  @RequirePermissions('hcm:rc_vacancy')
  createVacancy(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcVacancyDto) {
    return this.vacancies.create(user.organizationId, user.id, dto);
  }

  @Post('vacancies/:vacancyKey/submit')
  @RequirePermissions('hcm:rc_vacancy')
  submitVacancy(@CurrentUser() user: { id: string; organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.vacancies.submitForApproval(user.organizationId, vacancyKey, user.id);
  }

  @Post('vacancies/:vacancyKey/approve/:level')
  @RequirePermissions('hcm:rc_approve')
  approveVacancy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('vacancyKey') vacancyKey: string,
    @Param('level') level: string,
    @Body() dto: HcmRcApprovalActionDto,
  ) {
    return this.vacancies.decideApproval(user.organizationId, vacancyKey, parseInt(level, 10), user.id, dto.approved, dto.comments);
  }

  @Post('vacancies/:vacancyKey/publish')
  @RequirePermissions('hcm:rc_vacancy')
  publishVacancy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('vacancyKey') vacancyKey: string,
    @Body() dto: HcmRcPublishDto,
  ) {
    return this.vacancies.publish(user.organizationId, vacancyKey, user.id, dto);
  }

  @Post('vacancies/:vacancyKey/status')
  @RequirePermissions('hcm:rc_vacancy')
  transitionVacancy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('vacancyKey') vacancyKey: string,
    @Body() dto: HcmRcStatusDto,
  ) {
    return this.vacancies.transition(user.organizationId, vacancyKey, user.id, dto.status as HcmRcVacancyStatus);
  }

  @Get('candidates')
  @RequirePermissions('hcm:rc_read')
  listCandidates(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.recruitment.listCandidates(user.organizationId, { status, q });
  }

  @Get('candidates/:candidateKey')
  @RequirePermissions('hcm:rc_read')
  getCandidate(@CurrentUser() user: { organizationId: string }, @Param('candidateKey') candidateKey: string) {
    return this.recruitment.getCandidate(user.organizationId, candidateKey);
  }

  @Post('candidates')
  @RequirePermissions('hcm:rc_recruit')
  createCandidate(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcCandidateDto) {
    return this.recruitment.createCandidate(user.organizationId, user.id, {
      ...dto,
      source: dto.source as HcmRcPublicationChannel | undefined,
    });
  }

  @Post('candidates/import')
  @RequirePermissions('hcm:rc_import')
  importCandidates(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcImportCandidatesDto) {
    return this.recruitment.importCandidates(user.organizationId, user.id, dto.rows.map((r) => ({
      ...r,
      source: r.source as HcmRcPublicationChannel | undefined,
    })));
  }

  @Post('applications')
  @RequirePermissions('hcm:rc_recruit')
  apply(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcApplyDto) {
    return this.recruitment.applyToVacancy(user.organizationId, user.id, dto.vacancyKey, dto.candidateKey);
  }

  @Get('talent-pool')
  @RequirePermissions('hcm:rc_read')
  talentPool(@CurrentUser() user: { organizationId: string }) {
    return this.recruitment.listTalentPool(user.organizationId);
  }

  @Post('talent-pool')
  @RequirePermissions('hcm:rc_recruit')
  addTalentPool(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcTalentPoolDto) {
    return this.recruitment.addToTalentPool(user.organizationId, user.id, dto.candidateKey, dto.tags, dto.notes);
  }

  @Get('referrals')
  @RequirePermissions('hcm:rc_read')
  referrals(@CurrentUser() user: { organizationId: string }) {
    return this.recruitment.listReferrals(user.organizationId);
  }

  @Post('referrals')
  @RequirePermissions('hcm:rc_recruit')
  createReferral(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcReferralDto) {
    return this.recruitment.createReferral(user.organizationId, user.id, dto);
  }

  @Get('campaigns')
  @RequirePermissions('hcm:rc_read')
  campaigns(@CurrentUser() user: { organizationId: string }) {
    return this.recruitment.listCampaigns(user.organizationId);
  }

  @Post('campaigns')
  @RequirePermissions('hcm:rc_recruit')
  upsertCampaign(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcCampaignDto) {
    return this.recruitment.upsertCampaign(user.organizationId, user.id, dto);
  }

  @Get('job-fairs')
  @RequirePermissions('hcm:rc_read')
  jobFairs(@CurrentUser() user: { organizationId: string }) {
    return this.recruitment.listJobFairs(user.organizationId);
  }

  @Post('job-fairs')
  @RequirePermissions('hcm:rc_recruit')
  upsertJobFair(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcJobFairDto) {
    return this.recruitment.upsertJobFair(user.organizationId, user.id, dto);
  }

  @Get('applications')
  @RequirePermissions('hcm:rc_read')
  applications(
    @CurrentUser() user: { organizationId: string },
    @Query('vacancyKey') vacancyKey?: string,
    @Query('status') status?: HcmRcApplicationStatus,
  ) {
    return this.selection.listApplications(user.organizationId, vacancyKey, status);
  }

  @Get('pipeline/:vacancyKey')
  @RequirePermissions('hcm:rc_read')
  pipeline(@CurrentUser() user: { organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.selection.listPipeline(user.organizationId, vacancyKey);
  }

  @Post('vacancies/:vacancyKey/auto-filter')
  @RequirePermissions('hcm:rc_select')
  autoFilter(@CurrentUser() user: { id: string; organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.selection.autoFilterApplications(user.organizationId, vacancyKey, user.id);
  }

  @Post('vacancies/:vacancyKey/ranking')
  @RequirePermissions('hcm:rc_select')
  ranking(@CurrentUser() user: { id: string; organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.selection.computeRanking(user.organizationId, vacancyKey, user.id);
  }

  @Get('vacancies/:vacancyKey/ranking')
  @RequirePermissions('hcm:rc_read')
  listRanking(@CurrentUser() user: { organizationId: string }, @Param('vacancyKey') vacancyKey: string) {
    return this.selection.listRankings(user.organizationId, vacancyKey);
  }

  @Post('vacancies/:vacancyKey/compare')
  @RequirePermissions('hcm:rc_select')
  compare(
    @CurrentUser() user: { organizationId: string },
    @Param('vacancyKey') vacancyKey: string,
    @Body() dto: HcmRcCompareDto,
  ) {
    return this.selection.compareCandidates(user.organizationId, vacancyKey, dto.candidateKeys);
  }

  @Get('interviews')
  @RequirePermissions('hcm:rc_read')
  interviews(
    @CurrentUser() user: { organizationId: string },
    @Query('vacancyKey') vacancyKey?: string,
    @Query('candidateKey') candidateKey?: string,
    @Query('upcoming') upcoming?: string,
    @Query('status') status?: HcmRcInterviewStatus,
  ) {
    return this.selection.listInterviews(user.organizationId, { vacancyKey, candidateKey, upcoming: upcoming === 'true', status });
  }

  @Post('interviews')
  @RequirePermissions('hcm:rc_select')
  scheduleInterview(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcInterviewDto) {
    return this.selection.scheduleInterview(user.organizationId, user.id, dto);
  }

  @Post('interviews/:interviewKey/complete')
  @RequirePermissions('hcm:rc_select')
  completeInterview(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('interviewKey') interviewKey: string,
    @Body() dto: HcmRcCompleteInterviewDto,
  ) {
    return this.selection.completeInterview(user.organizationId, interviewKey, user.id, {
      rating: dto.rating,
      notes: dto.notes,
      status: dto.status as HcmRcInterviewStatus | undefined,
    });
  }

  @Post('assessments')
  @RequirePermissions('hcm:rc_select')
  recordAssessment(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcAssessmentDto) {
    return this.selection.recordAssessment(user.organizationId, user.id, {
      ...dto,
      assessmentType: dto.assessmentType as never,
    });
  }

  @Post('evaluations')
  @RequirePermissions('hcm:rc_select')
  recordEvaluation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcEvaluationDto) {
    return this.selection.recordEvaluation(user.organizationId, user.id, dto);
  }

  @Get('evaluations')
  @RequirePermissions('hcm:rc_read')
  listEvaluations(
    @CurrentUser() user: { organizationId: string },
    @Query('vacancyKey') vacancyKey: string,
    @Query('candidateKey') candidateKey?: string,
  ) {
    return this.selection.listEvaluations(user.organizationId, vacancyKey, candidateKey);
  }

  @Get('offers')
  @RequirePermissions('hcm:rc_read')
  listOffers(
    @CurrentUser() user: { organizationId: string },
    @Query('vacancyKey') vacancyKey?: string,
    @Query('status') status?: HcmRcOfferStatus,
  ) {
    return this.hiring.listOffers(user.organizationId, { vacancyKey, status });
  }

  @Get('offers/:offerKey')
  @RequirePermissions('hcm:rc_read')
  getOffer(@CurrentUser() user: { organizationId: string }, @Param('offerKey') offerKey: string) {
    return this.hiring.getOffer(user.organizationId, offerKey);
  }

  @Post('offers')
  @RequirePermissions('hcm:rc_hire')
  createOffer(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmRcOfferDto) {
    return this.hiring.createOffer(user.organizationId, user.id, dto);
  }

  @Post('offers/:offerKey/send')
  @RequirePermissions('hcm:rc_hire')
  sendOffer(@CurrentUser() user: { id: string; organizationId: string }, @Param('offerKey') offerKey: string) {
    return this.hiring.sendOffer(user.organizationId, offerKey, user.id);
  }

  @Post('offers/:offerKey/sign')
  @RequirePermissions('hcm:rc_hire')
  signOffer(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('offerKey') offerKey: string,
    @Body() dto: HcmRcSignatureDto,
  ) {
    return this.hiring.signOffer(user.organizationId, offerKey, user.id, dto);
  }

  @Post('offers/:offerKey/accept')
  @RequirePermissions('hcm:rc_hire')
  acceptOffer(@CurrentUser() user: { id: string; organizationId: string }, @Param('offerKey') offerKey: string) {
    return this.hiring.acceptOffer(user.organizationId, offerKey, user.id);
  }

  @Post('offers/:offerKey/reject')
  @RequirePermissions('hcm:rc_hire')
  rejectOffer(@CurrentUser() user: { id: string; organizationId: string }, @Param('offerKey') offerKey: string) {
    return this.hiring.rejectOffer(user.organizationId, offerKey, user.id);
  }

  @Get('onboarding')
  @RequirePermissions('hcm:rc_read')
  listOnboarding(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.onboarding.listPlans(user.organizationId, { status, employeeKey });
  }

  @Get('onboarding/:planKey')
  @RequirePermissions('hcm:rc_read')
  getOnboarding(@CurrentUser() user: { organizationId: string }, @Param('planKey') planKey: string) {
    return this.onboarding.getPlan(user.organizationId, planKey);
  }

  @Put('onboarding/tasks/:taskKey')
  @RequirePermissions('hcm:rc_onboard')
  updateOnboardingTask(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('taskKey') taskKey: string,
    @Body() dto: HcmRcOnboardingTaskDto,
  ) {
    return this.onboarding.updateTaskStatus(user.organizationId, taskKey, user.id, dto.status as HcmRcOnboardingTaskStatus, dto.metadata);
  }

  @Post('onboarding/:planKey/induction')
  @RequirePermissions('hcm:rc_onboard')
  scheduleInduction(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('planKey') planKey: string,
    @Body() dto: HcmRcInductionDto,
  ) {
    return this.onboarding.scheduleInduction(user.organizationId, planKey, user.id, dto.inductionDate);
  }

  @Get('audit')
  @RequirePermissions('hcm:rc_audit')
  auditLogs(
    @CurrentUser() user: { organizationId: string },
    @Query('entityType') entityType?: string,
  ) {
    return this.audit.findAll(user.organizationId, entityType ?? 'HcmRc');
  }
}
