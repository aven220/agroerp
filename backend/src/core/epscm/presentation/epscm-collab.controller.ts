import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EpscmCollabEngineService } from '../application/epscm-collab-engine.service';
import { EpscmCollabPartnerService } from '../application/epscm-collab-partner.service';
import { EpscmCollabSupplierPortalService } from '../application/epscm-collab-supplier-portal.service';
import { EpscmCollabOperatorPortalService } from '../application/epscm-collab-operator-portal.service';
import { EpscmCollabSlaService } from '../application/epscm-collab-sla.service';
import { EpscmCollabCollaborationService } from '../application/epscm-collab-collaboration.service';
import { EpscmCollabAnalyticsService } from '../application/epscm-collab-analytics.service';
import { EpscmCollabSimulationService } from '../application/epscm-collab-simulation.service';
import { EpscmCollabAiService } from '../application/epscm-collab-ai.service';
import { EpscmCollabOfflineService } from '../application/epscm-collab-offline.service';
import { EpscmAuditService } from '../application/epscm-audit.service';
import {
  EpscmCollabAiDto,
  EpscmCollabCertificateDto,
  EpscmCollabCommentDto,
  EpscmCollabComplianceDto,
  EpscmCollabConfirmOrderDto,
  EpscmCollabContractDto,
  EpscmCollabDeliveryDateDto,
  EpscmCollabDocumentDto,
  EpscmCollabEvidenceDto,
  EpscmCollabInvoiceDto,
  EpscmCollabLinkUserDto,
  EpscmCollabMessageDto,
  EpscmCollabOfflineBatchDto,
  EpscmCollabOperatorStatusDto,
  EpscmCollabPartnerDto,
  EpscmCollabScenarioDto,
  EpscmCollabSimulationDto,
  EpscmCollabSlaDto,
  EpscmCollabTaskDto,
  EpscmCollabThreadDto,
  EpscmCollabTrackingDto,
} from './epscm-collab.dto';

@ApiTags('EPSCM — Collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('epscm/collab')
export class EpscmCollabController {
  constructor(
    private readonly engine: EpscmCollabEngineService,
    private readonly partner: EpscmCollabPartnerService,
    private readonly supplier: EpscmCollabSupplierPortalService,
    private readonly operator: EpscmCollabOperatorPortalService,
    private readonly sla: EpscmCollabSlaService,
    private readonly collaboration: EpscmCollabCollaborationService,
    private readonly analytics: EpscmCollabAnalyticsService,
    private readonly simulation: EpscmCollabSimulationService,
    private readonly ai: EpscmCollabAiService,
    private readonly offline: EpscmCollabOfflineService,
    private readonly audit: EpscmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('supply_chain:collab')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('supply_chain:collab')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('supply_chain:collab')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId, undefined, 100).then((rows) =>
      rows.filter((r) =>
        ['collab_access', 'collab_order_confirmed', 'collab_delivery_updated', 'collab_document_uploaded', 'collab_sla_breach', 'collab_comment_posted', 'collab_task_completed', 'collab_simulation_run'].includes(r.action),
      ),
    );
  }

  @Get('partners')
  @RequirePermissions('supply_chain:collab')
  listPartners(@CurrentUser() user: { organizationId: string }) {
    return this.partner.list(user.organizationId);
  }

  @Post('partners')
  @RequirePermissions('supply_chain:collab')
  createPartner(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabPartnerDto) {
    return this.partner.create(user.organizationId, user.id, dto);
  }

  @Post('partners/:partnerKey/users')
  @RequirePermissions('supply_chain:collab')
  linkUser(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
    @Body() dto: EpscmCollabLinkUserDto,
  ) {
    return this.partner.linkUser(user.organizationId, user.id, partnerKey, dto.userId, dto.role);
  }

  @Get('suppliers/:partnerKey/portal')
  @RequirePermissions('supply_chain:collab')
  supplierPortal(@CurrentUser() user: { organizationId: string }, @Param('partnerKey') partnerKey: string) {
    return this.supplier.portal(user.organizationId, partnerKey);
  }

  @Post('suppliers/:partnerKey/sync-orders')
  @RequirePermissions('supply_chain:collab')
  syncSupplierOrders(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
  ) {
    return this.supplier.syncFromReplenishment(user.organizationId, user.id, partnerKey);
  }

  @Post('suppliers/orders/:linkKey/confirm')
  @RequirePermissions('supply_chain:collab_execute')
  confirmOrder(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('linkKey') linkKey: string,
    @Body() dto: EpscmCollabConfirmOrderDto,
  ) {
    return this.supplier.confirmOrder(user.organizationId, user.id, linkKey, dto.confirmedQty, dto.notes);
  }

  @Post('suppliers/orders/:linkKey/delivery-date')
  @RequirePermissions('supply_chain:collab_execute')
  updateDeliveryDate(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('linkKey') linkKey: string,
    @Body() dto: EpscmCollabDeliveryDateDto,
  ) {
    return this.supplier.updateDeliveryDate(user.organizationId, user.id, linkKey, new Date(dto.promisedDate), dto.notes);
  }

  @Post('suppliers/:partnerKey/invoices')
  @RequirePermissions('supply_chain:collab_execute')
  uploadInvoice(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
    @Body() dto: EpscmCollabInvoiceDto,
  ) {
    return this.supplier.uploadInvoice(user.organizationId, user.id, partnerKey, dto);
  }

  @Post('suppliers/:partnerKey/documents')
  @RequirePermissions('supply_chain:collab_execute')
  uploadDocument(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
    @Body() dto: EpscmCollabDocumentDto,
  ) {
    return this.supplier.uploadDocument(user.organizationId, user.id, partnerKey, dto.refType, dto.refKey, dto.docType, dto.storageUrl);
  }

  @Get('suppliers/:partnerKey/payments')
  @RequirePermissions('supply_chain:collab')
  paymentStatus(@CurrentUser() user: { organizationId: string }, @Param('partnerKey') partnerKey: string) {
    return this.supplier.paymentStatus(user.organizationId, partnerKey);
  }

  @Post('suppliers/:partnerKey/certificates')
  @RequirePermissions('supply_chain:collab_execute')
  upsertCertificate(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
    @Body() dto: EpscmCollabCertificateDto,
  ) {
    return this.supplier.upsertCertificate(
      user.organizationId, user.id, partnerKey, dto.certType,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined, dto.storageUrl,
    );
  }

  @Get('operators/:partnerKey/portal')
  @RequirePermissions('supply_chain:collab')
  operatorPortal(@CurrentUser() user: { organizationId: string }, @Param('partnerKey') partnerKey: string) {
    return this.operator.portal(user.organizationId, partnerKey);
  }

  @Post('operators/:partnerKey/sync-trips')
  @RequirePermissions('supply_chain:collab')
  syncOperatorTrips(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('partnerKey') partnerKey: string,
  ) {
    return this.operator.syncFromTms(user.organizationId, user.id, partnerKey);
  }

  @Post('operators/assignments/:assignmentKey/confirm')
  @RequirePermissions('supply_chain:collab_execute')
  confirmReception(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assignmentKey') assignmentKey: string,
  ) {
    return this.operator.confirmReception(user.organizationId, user.id, assignmentKey);
  }

  @Post('operators/assignments/:assignmentKey/status')
  @RequirePermissions('supply_chain:collab_execute')
  operatorStatus(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assignmentKey') assignmentKey: string,
    @Body() dto: EpscmCollabOperatorStatusDto,
  ) {
    return this.operator.updateStatus(user.organizationId, user.id, assignmentKey, dto.status, dto.notes);
  }

  @Post('operators/assignments/:assignmentKey/evidence')
  @RequirePermissions('supply_chain:collab_execute')
  attachEvidence(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('assignmentKey') assignmentKey: string,
    @Body() dto: EpscmCollabEvidenceDto,
  ) {
    return this.operator.attachEvidence(user.organizationId, user.id, assignmentKey, dto.evidenceType, dto.storageUrl);
  }

  @Post('operators/deliveries/:deliveryKey/return')
  @RequirePermissions('supply_chain:collab_execute')
  recordReturn(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('deliveryKey') deliveryKey: string,
    @Body('notes') notes?: string,
  ) {
    return this.operator.recordReturn(user.organizationId, user.id, deliveryKey, notes);
  }

  @Get('sla')
  @RequirePermissions('supply_chain:collab')
  slaCenter(@CurrentUser() user: { organizationId: string }) {
    return this.sla.center(user.organizationId);
  }

  @Get('sla/contracts')
  @RequirePermissions('supply_chain:collab')
  listContracts(@CurrentUser() user: { organizationId: string }, @Query('partnerKey') partnerKey?: string) {
    return this.sla.listContracts(user.organizationId, partnerKey);
  }

  @Post('sla/contracts')
  @RequirePermissions('supply_chain:collab')
  createContract(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabContractDto) {
    return this.sla.createContract(user.organizationId, user.id, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Post('sla/contracts/:contractKey/slas')
  @RequirePermissions('supply_chain:collab')
  createSla(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('contractKey') contractKey: string,
    @Body() dto: EpscmCollabSlaDto,
  ) {
    return this.sla.createSla(user.organizationId, user.id, contractKey, dto.name, dto.targetPct);
  }

  @Post('sla/:slaKey/compliance')
  @RequirePermissions('supply_chain:collab')
  recordCompliance(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('slaKey') slaKey: string,
    @Body() dto: EpscmCollabComplianceDto,
  ) {
    return this.sla.recordCompliance(user.organizationId, user.id, slaKey, dto.actualPct, new Date(dto.periodStart), new Date(dto.periodEnd));
  }

  @Get('collaboration')
  @RequirePermissions('supply_chain:collab')
  collaborationCenter(@CurrentUser() user: { organizationId: string }) {
    return this.collaboration.center(user.organizationId);
  }

  @Get('threads')
  @RequirePermissions('supply_chain:collab')
  listThreads(@CurrentUser() user: { organizationId: string }) {
    return this.collaboration.listThreads(user.organizationId);
  }

  @Post('threads')
  @RequirePermissions('supply_chain:collab')
  createThread(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabThreadDto) {
    return this.collaboration.createThread(user.organizationId, user.id, dto.subject, dto.refType, dto.refKey);
  }

  @Post('threads/:threadKey/messages')
  @RequirePermissions('supply_chain:collab_execute')
  postMessage(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('threadKey') threadKey: string,
    @Body() dto: EpscmCollabMessageDto,
  ) {
    return this.collaboration.postMessage(user.organizationId, user.id, threadKey, dto.body);
  }

  @Post('comments')
  @RequirePermissions('supply_chain:collab_execute')
  addComment(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabCommentDto) {
    return this.collaboration.addComment(user.organizationId, user.id, dto.refType, dto.refKey, dto.body);
  }

  @Get('comments')
  @RequirePermissions('supply_chain:collab')
  listComments(
    @CurrentUser() user: { organizationId: string },
    @Query('refType') refType: string,
    @Query('refKey') refKey: string,
  ) {
    return this.collaboration.listComments(user.organizationId, refType, refKey);
  }

  @Get('tasks')
  @RequirePermissions('supply_chain:collab')
  listTasks(@CurrentUser() user: { organizationId: string }) {
    return this.collaboration.listTasks(user.organizationId);
  }

  @Post('tasks')
  @RequirePermissions('supply_chain:collab')
  createTask(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabTaskDto) {
    return this.collaboration.createTask(user.organizationId, user.id, {
      ...dto,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    });
  }

  @Post('tasks/:taskKey/complete')
  @RequirePermissions('supply_chain:collab_execute')
  completeTask(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('taskKey') taskKey: string,
  ) {
    return this.collaboration.completeTask(user.organizationId, user.id, taskKey);
  }

  @Post('tracking')
  @RequirePermissions('supply_chain:collab_execute')
  trackEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabTrackingDto) {
    return this.collaboration.trackEvent(user.organizationId, user.id, dto.refType, dto.refKey, dto.eventType, dto.description);
  }

  @Get('dashboard/executive')
  @RequirePermissions('supply_chain:collab')
  executiveDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.executiveDashboard(user.organizationId);
  }

  @Get('dashboard/compliance')
  @RequirePermissions('supply_chain:collab')
  complianceDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.complianceDashboard(user.organizationId);
  }

  @Post('analytics/compute')
  @RequirePermissions('supply_chain:collab')
  computeAnalytics(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.compute(user.organizationId);
  }

  @Get('simulations')
  @RequirePermissions('supply_chain:collab')
  listSimulations(@CurrentUser() user: { organizationId: string }) {
    return this.simulation.list(user.organizationId);
  }

  @Post('simulations')
  @RequirePermissions('supply_chain:collab')
  createSimulation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabSimulationDto) {
    return this.simulation.create(user.organizationId, user.id, dto.name, dto.simulationType);
  }

  @Post('simulations/:simulationKey/scenarios')
  @RequirePermissions('supply_chain:collab')
  addScenario(
    @CurrentUser() user: { organizationId: string },
    @Param('simulationKey') simulationKey: string,
    @Body() dto: EpscmCollabScenarioDto,
  ) {
    return this.simulation.addScenario(user.organizationId, simulationKey, dto.name, dto.parameters);
  }

  @Post('simulations/:simulationKey/run')
  @RequirePermissions('supply_chain:collab')
  runSimulation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('simulationKey') simulationKey: string,
  ) {
    return this.simulation.run(user.organizationId, user.id, simulationKey);
  }

  @Get('ai/slots')
  @RequirePermissions('supply_chain:collab')
  listAiSlots(@CurrentUser() user: { organizationId: string }) {
    return this.ai.list(user.organizationId);
  }

  @Post('ai/slots')
  @RequirePermissions('supply_chain:collab')
  provisionAi(@CurrentUser() user: { organizationId: string }, @Body() dto: EpscmCollabAiDto) {
    return this.ai.provision(user.organizationId, dto.slotType);
  }

  @Post('ai/bootstrap')
  @RequirePermissions('supply_chain:collab')
  bootstrapAi(@CurrentUser() user: { organizationId: string }) {
    return this.ai.bootstrapArchitecture(user.organizationId);
  }

  @Get('mobile/sync')
  @RequirePermissions('supply_chain:collab')
  mobileSync(
    @CurrentUser() user: { organizationId: string },
    @Query('partnerKey') partnerKey?: string,
  ) {
    return this.offline.mobileSync(user.organizationId, partnerKey);
  }

  @Post('offline/batches')
  @RequirePermissions('supply_chain:collab_execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EpscmCollabOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('supply_chain:collab_execute')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('batchKey') batchKey: string,
  ) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
