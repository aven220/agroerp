import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BpmsInstanceStatus } from '@agroerp/prisma-bpms-client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { BpmsAuditService } from '../application/bpms-audit.service';
import { BpmsAutomationService, BpmsSchedulerService } from '../application/bpms-automation.service';
import { BpmsDesignerService } from '../application/bpms-designer.service';
import { BpmsEngineService, BpmsOfflineService } from '../application/bpms-engine.service';
import { BpmsMonitoringService, BpmsTemplateService } from '../application/bpms-monitoring.service';
import { BpmsProcessService } from '../application/bpms-process.service';
import { BpmsRuleService } from '../application/bpms-rule.service';
import { BpmsRuntimeService } from '../application/bpms-runtime.service';
import { BpmsTaskService } from '../application/bpms-task.service';
import {
  BpmsAttachmentDto,
  BpmsCommentDto,
  BpmsCompleteTaskDto,
  BpmsCreateAutomationDto,
  BpmsCreateProcessDto,
  BpmsCreateRuleDto,
  BpmsCreateWebhookDto,
  BpmsDelegateTaskDto,
  BpmsDuplicateProcessDto,
  BpmsEvaluateRuleDto,
  BpmsImportProcessDto,
  BpmsOfflineBatchDto,
  BpmsSaveDiagramDto,
  BpmsSetVariableDto,
  BpmsStartInstanceDto,
  BpmsTriggerAutomationDto,
} from './bpms.dto';

@ApiTags('BPMS — Enterprise Process Suite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bpms')
export class BpmsController {
  constructor(
    private readonly engine: BpmsEngineService,
    private readonly processes: BpmsProcessService,
    private readonly designer: BpmsDesignerService,
    private readonly runtime: BpmsRuntimeService,
    private readonly tasks: BpmsTaskService,
    private readonly rules: BpmsRuleService,
    private readonly automation: BpmsAutomationService,
    private readonly scheduler: BpmsSchedulerService,
    private readonly monitoringService: BpmsMonitoringService,
    private readonly templateService: BpmsTemplateService,
    private readonly offline: BpmsOfflineService,
    private readonly audit: BpmsAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('bpms:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('bpms:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('bpms:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }

  @Get('processes')
  @RequirePermissions('bpms:read')
  listProcesses(@CurrentUser() user: { organizationId: string }) {
    return this.processes.list(user.organizationId);
  }

  @Post('processes')
  @RequirePermissions('bpms:config')
  createProcess(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsCreateProcessDto) {
    return this.processes.create(user.organizationId, user.id, dto.processKey, dto.name, dto.moduleTarget, dto.description);
  }

  @Get('processes/:processKey')
  @RequirePermissions('bpms:read')
  getProcess(@CurrentUser() user: { organizationId: string }, @Param('processKey') processKey: string) {
    return this.processes.get(user.organizationId, processKey);
  }

  @Post('processes/:processKey/versions')
  @RequirePermissions('bpms:config')
  createVersion(@CurrentUser() user: { organizationId: string; id: string }, @Param('processKey') processKey: string) {
    return this.processes.createVersion(user.organizationId, user.id, processKey);
  }

  @Post('versions/:versionKey/publish')
  @RequirePermissions('bpms:config')
  publish(@CurrentUser() user: { organizationId: string; id: string }, @Param('versionKey') versionKey: string) {
    return this.processes.publish(user.organizationId, user.id, versionKey);
  }

  @Post('processes/:processKey/duplicate')
  @RequirePermissions('bpms:config')
  duplicate(@CurrentUser() user: { organizationId: string; id: string }, @Param('processKey') processKey: string, @Body() dto: BpmsDuplicateProcessDto) {
    return this.processes.duplicate(user.organizationId, user.id, processKey, dto.newProcessKey, dto.newName);
  }

  @Get('processes/:processKey/export')
  @RequirePermissions('bpms:read')
  exportProcess(@CurrentUser() user: { organizationId: string; id: string }, @Param('processKey') processKey: string) {
    return this.processes.exportProcess(user.organizationId, user.id, processKey);
  }

  @Post('processes/import')
  @RequirePermissions('bpms:config')
  importProcess(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsImportProcessDto) {
    return this.processes.importProcess(user.organizationId, user.id, dto.processKey, dto.name, {
      elements: dto.elements as import('../domain/bpms.engine').BpmnElement[],
      flows: dto.flows,
      moduleTarget: dto.moduleTarget,
    });
  }

  @Get('designer/:versionKey')
  @RequirePermissions('bpms:read')
  getDiagram(@CurrentUser() user: { organizationId: string }, @Param('versionKey') versionKey: string) {
    return this.designer.getDiagram(user.organizationId, versionKey);
  }

  @Post('designer/:versionKey')
  @RequirePermissions('bpms:config')
  saveDiagram(@CurrentUser() user: { organizationId: string }, @Param('versionKey') versionKey: string, @Body() dto: BpmsSaveDiagramDto) {
    return this.designer.saveDiagram(user.organizationId, versionKey, dto.elements, dto.flows);
  }

  @Get('designer/:versionKey/validate')
  @RequirePermissions('bpms:read')
  validateDiagram(@CurrentUser() user: { organizationId: string }, @Param('versionKey') versionKey: string) {
    return this.designer.validate(user.organizationId, versionKey);
  }

  @Get('instances')
  @RequirePermissions('bpms:read')
  listInstances(@CurrentUser() user: { organizationId: string }, @Query('status') status?: BpmsInstanceStatus) {
    return this.runtime.listInstances(user.organizationId, status);
  }

  @Post('instances/start')
  @RequirePermissions('bpms:execute')
  startInstance(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsStartInstanceDto) {
    return this.runtime.start(user.organizationId, user.id, dto.processKey, dto.context ?? {});
  }

  @Get('instances/:instanceKey')
  @RequirePermissions('bpms:read')
  getInstance(@CurrentUser() user: { organizationId: string }, @Param('instanceKey') instanceKey: string) {
    return this.runtime.getInstance(user.organizationId, instanceKey);
  }

  @Post('instances/:instanceKey/cancel')
  @RequirePermissions('bpms:execute')
  cancelInstance(@CurrentUser() user: { organizationId: string; id: string }, @Param('instanceKey') instanceKey: string) {
    return this.runtime.cancel(user.organizationId, user.id, instanceKey);
  }

  @Post('instances/:instanceKey/resume')
  @RequirePermissions('bpms:execute')
  resumeInstance(@CurrentUser() user: { organizationId: string; id: string }, @Param('instanceKey') instanceKey: string) {
    return this.runtime.resume(user.organizationId, user.id, instanceKey);
  }

  @Post('instances/:instanceKey/retry')
  @RequirePermissions('bpms:execute')
  retryInstance(@CurrentUser() user: { organizationId: string; id: string }, @Param('instanceKey') instanceKey: string) {
    return this.runtime.retry(user.organizationId, user.id, instanceKey);
  }

  @Post('instances/:instanceKey/variables')
  @RequirePermissions('bpms:execute')
  setVariable(@CurrentUser() user: { organizationId: string; id: string }, @Param('instanceKey') instanceKey: string, @Body() dto: BpmsSetVariableDto) {
    return this.runtime.setVariable(user.organizationId, user.id, instanceKey, dto.name, dto.value);
  }

  @Get('instances/:instanceKey/history')
  @RequirePermissions('bpms:read')
  instanceHistory(@CurrentUser() user: { organizationId: string }, @Param('instanceKey') instanceKey: string) {
    return this.runtime.history(user.organizationId, instanceKey);
  }

  @Get('tasks/inbox')
  @RequirePermissions('bpms:execute')
  inbox(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.tasks.inbox(user.organizationId, user.id);
  }

  @Get('tasks/team/:teamKey')
  @RequirePermissions('bpms:execute')
  teamInbox(@CurrentUser() user: { organizationId: string }, @Param('teamKey') teamKey: string) {
    return this.tasks.teamInbox(user.organizationId, teamKey);
  }

  @Post('tasks/:taskKey/claim')
  @RequirePermissions('bpms:execute')
  claimTask(@CurrentUser() user: { organizationId: string; id: string }, @Param('taskKey') taskKey: string) {
    return this.tasks.claim(user.organizationId, user.id, taskKey);
  }

  @Post('tasks/:taskKey/complete')
  @RequirePermissions('bpms:execute')
  completeTask(@CurrentUser() user: { organizationId: string; id: string }, @Param('taskKey') taskKey: string, @Body() dto: BpmsCompleteTaskDto) {
    return this.tasks.complete(user.organizationId, user.id, taskKey, dto.approved !== false, dto.signatureUrl);
  }

  @Post('tasks/:taskKey/delegate')
  @RequirePermissions('bpms:execute')
  delegateTask(@CurrentUser() user: { organizationId: string; id: string }, @Param('taskKey') taskKey: string, @Body() dto: BpmsDelegateTaskDto) {
    return this.tasks.delegate(user.organizationId, user.id, taskKey, dto.toUserId);
  }

  @Post('tasks/:taskKey/comments')
  @RequirePermissions('bpms:execute')
  commentTask(@CurrentUser() user: { organizationId: string; id: string }, @Param('taskKey') taskKey: string, @Body() dto: BpmsCommentDto) {
    return this.tasks.addComment(user.organizationId, user.id, taskKey, dto.body);
  }

  @Post('tasks/:taskKey/attachments')
  @RequirePermissions('bpms:execute')
  attachTask(@CurrentUser() user: { organizationId: string; id: string }, @Param('taskKey') taskKey: string, @Body() dto: BpmsAttachmentDto) {
    return this.tasks.attach(user.organizationId, user.id, taskKey, dto.title, dto.storageUrl);
  }

  @Get('rules')
  @RequirePermissions('bpms:read')
  listRules(@CurrentUser() user: { organizationId: string }) {
    return this.rules.list(user.organizationId);
  }

  @Post('rules')
  @RequirePermissions('bpms:config')
  createRule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsCreateRuleDto) {
    return this.rules.create(user.organizationId, user.id, dto.name, dto.expression, dto.variables);
  }

  @Post('rules/:ruleKey/evaluate')
  @RequirePermissions('bpms:read')
  evaluateRule(@CurrentUser() user: { organizationId: string; id: string }, @Param('ruleKey') ruleKey: string, @Body() dto: BpmsEvaluateRuleDto) {
    return this.rules.evaluate(user.organizationId, user.id, ruleKey, dto.context);
  }

  @Get('automations')
  @RequirePermissions('bpms:read')
  listAutomations(@CurrentUser() user: { organizationId: string }) {
    return this.automation.list(user.organizationId);
  }

  @Post('automations')
  @RequirePermissions('bpms:config')
  createAutomation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsCreateAutomationDto) {
    return this.automation.create(user.organizationId, user.id, dto.name, dto.automationType, dto.triggerConfig, dto.actionConfig, dto.processKey);
  }

  @Post('automations/:automationKey/trigger')
  @RequirePermissions('bpms:execute')
  triggerAutomation(@CurrentUser() user: { organizationId: string; id: string }, @Param('automationKey') automationKey: string, @Body() dto: BpmsTriggerAutomationDto) {
    return this.automation.trigger(user.organizationId, user.id, automationKey, dto.payload ?? {});
  }

  @Post('scheduler/run')
  @RequirePermissions('bpms:config')
  runScheduler(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.scheduler.runScheduled(user.organizationId, user.id);
  }

  @Get('webhooks')
  @RequirePermissions('bpms:read')
  listWebhooks(@CurrentUser() user: { organizationId: string }) {
    return this.automation.listWebhooks(user.organizationId);
  }

  @Post('webhooks')
  @RequirePermissions('bpms:config')
  createWebhook(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsCreateWebhookDto) {
    return this.automation.registerWebhook(user.organizationId, user.id, dto.name, dto.endpointUrl, dto.secret);
  }

  @Get('monitoring')
  @RequirePermissions('bpms:read')
  monitoring(@CurrentUser() user: { organizationId: string }) {
    return this.monitoringService.dashboard(user.organizationId);
  }

  @Post('monitoring/compute')
  @RequirePermissions('bpms:read')
  computeMonitoring(@CurrentUser() user: { organizationId: string }) {
    return this.monitoringService.compute(user.organizationId);
  }

  @Get('dashboard/executive')
  @RequirePermissions('bpms:read')
  executiveDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoringService.dashboard(user.organizationId);
  }

  @Get('templates')
  @RequirePermissions('bpms:read')
  templates(@CurrentUser() user: { organizationId: string }) {
    return this.templateService.list(user.organizationId);
  }

  @Get('mobile/sync')
  @RequirePermissions('bpms:execute')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('offline/batches')
  @RequirePermissions('bpms:execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: BpmsOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('bpms:execute')
  syncOffline(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
