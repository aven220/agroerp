import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EaceAdvisorService } from '../application/eace-advisor.service';
import { EaceApiService } from '../application/eace-api.service';
import { EaceAuditService } from '../application/eace-audit.service';
import { EaceBridgeService, EaceDashboardService, EaceOfflineService } from '../application/eace-dashboard.service';
import { EaceContractService } from '../application/eace-contract.service';
import { EaceContractorService } from '../application/eace-contractor.service';
import { EaceCooperativeService } from '../application/eace-cooperative.service';
import { EaceEngineService } from '../application/eace-engine.service';
import { EaceExecutiveService } from '../application/eace-executive.service';
import { EaceKnowledgeService } from '../application/eace-knowledge.service';
import { EaceMarketplaceService } from '../application/eace-marketplace.service';
import { EaceNotificationService } from '../application/eace-notification.service';
import { EaceProducerService } from '../application/eace-producer.service';
import {
  EaceAdvisorDto, EaceAgreementDto, EaceApiCredentialDto, EaceAssignmentDto,
  EaceBridgeDto, EaceComplianceDto, EaceContractCropDto, EaceContractDto,
  EaceContractScheduleDto, EaceContractorDto, EaceDocumentDto, EaceEvaluationDto,
  EaceFarmAuthDto, EaceGroupDto, EaceKnowledgeDto, EaceListingDto, EaceMemberDto,
  EaceNotificationDto, EaceOfflineBatchDto, EaceOrgDto, EaceProducerDto,
  EaceProgramDto, EaceRepresentativeDto, EaceVisitDto,
} from './eace.dto';

@ApiTags('EACE — Enterprise Agricultural Collaborative Ecosystem')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eace')
export class EaceController {
  constructor(
    private readonly engine: EaceEngineService,
    private readonly dashboard: EaceDashboardService,
    private readonly producer: EaceProducerService,
    private readonly cooperative: EaceCooperativeService,
    private readonly contract: EaceContractService,
    private readonly contractor: EaceContractorService,
    private readonly advisor: EaceAdvisorService,
    private readonly marketplace: EaceMarketplaceService,
    private readonly api: EaceApiService,
    private readonly knowledgeSvc: EaceKnowledgeService,
    private readonly executive: EaceExecutiveService,
    private readonly notifications: EaceNotificationService,
    private readonly bridge: EaceBridgeService,
    private readonly offline: EaceOfflineService,
    private readonly audit: EaceAuditService,
  ) {}

  @Get('center') @RequirePermissions('eace:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('eace:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('eace:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('eace:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('producers') @RequirePermissions('eace:read')
  producers(@CurrentUser() user: { organizationId: string }) {
    return this.producer.listProfiles(user.organizationId);
  }

  @Get('producers/:profileKey') @RequirePermissions('eace:read')
  producerDetail(@CurrentUser() user: { organizationId: string }, @Param('profileKey') profileKey: string) {
    return this.producer.getProfile(user.organizationId, profileKey);
  }

  @Post('producers') @RequirePermissions('eace:execute')
  registerProducer(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceProducerDto) {
    return this.producer.registerProfile(user.organizationId, user.id, dto);
  }

  @Post('producers/:profileKey/farms') @RequirePermissions('eace:execute')
  authorizeFarm(@CurrentUser() user: { organizationId: string }, @Param('profileKey') profileKey: string, @Body() dto: EaceFarmAuthDto) {
    return this.producer.authorizeFarm(user.organizationId, profileKey, dto);
  }

  @Post('producers/:profileKey/documents') @RequirePermissions('eace:execute')
  linkDocument(@CurrentUser() user: { organizationId: string }, @Param('profileKey') profileKey: string, @Body() dto: EaceDocumentDto) {
    return this.producer.linkDocument(user.organizationId, profileKey, dto);
  }

  @Get('cooperatives') @RequirePermissions('eace:read')
  cooperatives(@CurrentUser() user: { organizationId: string }, @Query('orgType') orgType?: string) {
    return this.cooperative.listOrgs(user.organizationId, orgType);
  }

  @Post('cooperatives') @RequirePermissions('eace:config')
  createCooperative(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceOrgDto) {
    return this.cooperative.createOrg(user.organizationId, user.id, { ...dto, orgType: dto.orgType as never });
  }

  @Get('groups') @RequirePermissions('eace:read')
  groups(@CurrentUser() user: { organizationId: string }) {
    return this.cooperative.listGroups(user.organizationId);
  }

  @Post('groups') @RequirePermissions('eace:config')
  createGroup(@CurrentUser() user: { organizationId: string }, @Body() dto: EaceGroupDto) {
    return this.cooperative.createGroup(user.organizationId, dto);
  }

  @Post('members') @RequirePermissions('eace:execute')
  addMember(@CurrentUser() user: { organizationId: string }, @Body() dto: EaceMemberDto) {
    return this.cooperative.addMember(user.organizationId, dto);
  }

  @Post('cooperatives/:orgKey/representatives') @RequirePermissions('eace:execute')
  addRepresentative(@CurrentUser() user: { organizationId: string }, @Param('orgKey') orgKey: string, @Body() dto: EaceRepresentativeDto) {
    return this.cooperative.addRepresentative(user.organizationId, orgKey, dto);
  }

  @Post('cooperatives/:orgKey/programs') @RequirePermissions('eace:execute')
  createProgram(@CurrentUser() user: { organizationId: string }, @Param('orgKey') orgKey: string, @Body() dto: EaceProgramDto) {
    return this.cooperative.createProgram(user.organizationId, orgKey, dto);
  }

  @Post('cooperatives/:orgKey/agreements') @RequirePermissions('eace:execute')
  createAgreement(@CurrentUser() user: { organizationId: string }, @Param('orgKey') orgKey: string, @Body() dto: EaceAgreementDto) {
    return this.cooperative.createAgreement(user.organizationId, orgKey, dto);
  }

  @Get('cooperatives/:orgKey/indicators') @RequirePermissions('eace:read')
  orgIndicators(@CurrentUser() user: { organizationId: string }, @Param('orgKey') orgKey: string) {
    return this.cooperative.consolidatedIndicators(user.organizationId, orgKey);
  }

  @Get('contracts') @RequirePermissions('eace:read')
  contracts(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.contract.listContracts(user.organizationId, status);
  }

  @Get('contracts/:contractKey') @RequirePermissions('eace:read')
  contractDetail(@CurrentUser() user: { organizationId: string }, @Param('contractKey') contractKey: string) {
    return this.contract.getContract(user.organizationId, contractKey);
  }

  @Post('contracts') @RequirePermissions('eace:execute')
  createContract(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceContractDto) {
    return this.contract.createContract(user.organizationId, user.id, dto);
  }

  @Post('contracts/:contractKey/crops') @RequirePermissions('eace:execute')
  addContractCrop(@CurrentUser() user: { organizationId: string }, @Param('contractKey') contractKey: string, @Body() dto: EaceContractCropDto) {
    return this.contract.addCrop(user.organizationId, contractKey, dto);
  }

  @Post('contracts/:contractKey/schedules') @RequirePermissions('eace:execute')
  addSchedule(@CurrentUser() user: { organizationId: string }, @Param('contractKey') contractKey: string, @Body() dto: EaceContractScheduleDto) {
    return this.contract.addSchedule(user.organizationId, contractKey, dto);
  }

  @Post('contracts/:contractKey/compliance') @RequirePermissions('eace:execute')
  recordCompliance(@CurrentUser() user: { organizationId: string; id: string }, @Param('contractKey') contractKey: string, @Body() dto: EaceComplianceDto) {
    return this.contract.recordCompliance(user.organizationId, user.id, contractKey, dto);
  }

  @Post('contracts/:contractKey/activate') @RequirePermissions('eace:execute')
  activateContract(@CurrentUser() user: { organizationId: string; id: string }, @Param('contractKey') contractKey: string) {
    return this.contract.activateContract(user.organizationId, user.id, contractKey);
  }

  @Get('contractors') @RequirePermissions('eace:read')
  contractors(@CurrentUser() user: { organizationId: string }, @Query('contractorType') contractorType?: string) {
    return this.contractor.list(user.organizationId, contractorType);
  }

  @Post('contractors') @RequirePermissions('eace:config')
  registerContractor(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceContractorDto) {
    return this.contractor.register(user.organizationId, user.id, { ...dto, contractorType: dto.contractorType as never });
  }

  @Post('contractors/:contractorKey/evaluations') @RequirePermissions('eace:execute')
  evaluateContractor(@CurrentUser() user: { organizationId: string; id: string }, @Param('contractorKey') contractorKey: string, @Body() dto: EaceEvaluationDto) {
    return this.contractor.evaluate(user.organizationId, user.id, contractorKey, dto);
  }

  @Get('advisors') @RequirePermissions('eace:read')
  advisors(@CurrentUser() user: { organizationId: string }) {
    return this.advisor.list(user.organizationId);
  }

  @Post('advisors') @RequirePermissions('eace:config')
  registerAdvisor(@CurrentUser() user: { organizationId: string }, @Body() dto: EaceAdvisorDto) {
    return this.advisor.register(user.organizationId, dto);
  }

  @Post('advisors/:advisorKey/assignments') @RequirePermissions('eace:execute')
  assignAdvisor(@CurrentUser() user: { organizationId: string }, @Param('advisorKey') advisorKey: string, @Body() dto: EaceAssignmentDto) {
    return this.advisor.assignProducer(user.organizationId, advisorKey, dto);
  }

  @Get('visits') @RequirePermissions('eace:read')
  visits(@CurrentUser() user: { organizationId: string }, @Query('advisorKey') advisorKey?: string) {
    return this.advisor.listVisits(user.organizationId, advisorKey);
  }

  @Post('advisors/:advisorKey/visits') @RequirePermissions('eace:execute')
  scheduleVisit(@CurrentUser() user: { organizationId: string; id: string }, @Param('advisorKey') advisorKey: string, @Body() dto: EaceVisitDto) {
    return this.advisor.scheduleVisit(user.organizationId, user.id, advisorKey, dto);
  }

  @Post('visits/:visitKey/complete') @RequirePermissions('eace:execute')
  completeVisit(@CurrentUser() user: { organizationId: string; id: string }, @Param('visitKey') visitKey: string, @Body() dto: EaceVisitDto) {
    return this.advisor.completeVisit(user.organizationId, user.id, visitKey, dto);
  }

  @Get('marketplace') @RequirePermissions('eace:read')
  marketplaceList(@CurrentUser() user: { organizationId: string }, @Query('listingType') listingType?: string) {
    return this.marketplace.list(user.organizationId, listingType);
  }

  @Get('marketplace/architecture') @RequirePermissions('eace:read')
  marketplaceArchitecture() {
    return this.marketplace.architecture();
  }

  @Post('marketplace') @RequirePermissions('eace:execute')
  publishListing(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceListingDto) {
    return this.marketplace.publish(user.organizationId, user.id, { ...dto, listingType: dto.listingType as never });
  }

  @Get('api/credentials') @RequirePermissions('eace:config')
  apiCredentials(@CurrentUser() user: { organizationId: string }) {
    return this.api.listCredentials(user.organizationId);
  }

  @Post('api/credentials') @RequirePermissions('eace:config')
  issueApiKey(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceApiCredentialDto) {
    return this.api.issueCredential(user.organizationId, user.id, dto);
  }

  @Get('api/manifest') @RequirePermissions('eace:read')
  apiManifest() {
    return this.api.publicApiManifest();
  }

  @Get('api/access-logs') @RequirePermissions('eace:audit')
  apiAccessLogs(@CurrentUser() user: { organizationId: string }) {
    return this.api.listAccessLogs(user.organizationId);
  }

  @Get('public/:resource') @RequirePermissions('eace:read')
  publicQuery(@CurrentUser() user: { organizationId: string }, @Param('resource') resource: string) {
    return this.api.publicQuery(user.organizationId, resource);
  }

  @Get('knowledge') @RequirePermissions('eace:read')
  listKnowledge(@CurrentUser() user: { organizationId: string }, @Query('itemType') itemType?: string, @Query('category') category?: string) {
    return this.knowledgeSvc.list(user.organizationId, itemType, category);
  }

  @Post('knowledge') @RequirePermissions('eace:execute')
  publishKnowledge(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceKnowledgeDto) {
    return this.knowledgeSvc.publish(user.organizationId, user.id, { ...dto, itemType: dto.itemType as never });
  }

  @Get('executive') @RequirePermissions('eace:read')
  executivePanel(@CurrentUser() user: { organizationId: string }) {
    return this.executive.panel(user.organizationId);
  }

  @Get('executive/snapshots') @RequirePermissions('eace:read')
  executiveSnapshots(@CurrentUser() user: { organizationId: string }) {
    return this.executive.listSnapshots(user.organizationId);
  }

  @Post('executive/snapshot') @RequirePermissions('eace:execute')
  takeSnapshot(@CurrentUser() user: { organizationId: string }) {
    return this.executive.snapshot(user.organizationId);
  }

  @Get('notifications') @RequirePermissions('eace:read')
  notificationList(@CurrentUser() user: { organizationId: string }, @Query('recipientRef') recipientRef?: string) {
    return this.notifications.list(user.organizationId, recipientRef);
  }

  @Post('notifications') @RequirePermissions('eace:execute')
  sendNotification(@CurrentUser() user: { organizationId: string }, @Body() dto: EaceNotificationDto) {
    return this.notifications.send(user.organizationId, dto.recipientRef, dto.title, dto.body, dto.channel);
  }

  @Post('notifications/:notificationKey/read') @RequirePermissions('eace:execute')
  markNotificationRead(@CurrentUser() user: { organizationId: string }, @Param('notificationKey') notificationKey: string) {
    return this.notifications.markRead(user.organizationId, notificationKey);
  }

  @Post('bridge') @RequirePermissions('eace:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload ?? {}, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('eace:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }, @Query('profileRole') profileRole?: string) {
    return this.offline.mobileSync(user.organizationId, user.id, profileRole ?? 'producer');
  }

  @Post('mobile/batches') @RequirePermissions('eace:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaceOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('eace:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
