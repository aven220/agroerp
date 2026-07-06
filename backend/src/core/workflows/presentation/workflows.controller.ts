import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowDefinitionsService } from '../application/workflow-definitions.service';
import { WorkflowInstancesService } from '../application/workflow-instances.service';
import { WorkflowMetricsService } from '../application/workflow-metrics.service';
import { WorkflowImportExportService } from '../application/workflow-import-export.service';
import { WorkflowSlaService } from '../application/workflow-sla.service';
import {
  AddWorkflowAttachmentDto,
  AddWorkflowCommentDto,
  CloneWorkflowDefinitionDto,
  CreateWorkflowDefinitionDto,
  CreateWorkflowVersionDto,
  ExecuteTransitionDto,
  ImportWorkflowDefinitionDto,
  ReassignTaskDto,
  StartWorkflowInstanceDto,
  SyncTransitionsDto,
  UpdateWorkflowVersionDto,
} from './workflows.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('Workflows — Definitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflows/definitions')
export class WorkflowDefinitionsController {
  constructor(
    private readonly definitions: WorkflowDefinitionsService,
    private readonly importExport: WorkflowImportExportService,
  ) {}

  @Get()
  @RequirePermissions('workflow:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.definitions.findAll(user.organizationId);
  }

  @Get('bootstrap')
  @RequirePermissions('workflow:read')
  bootstrap(@CurrentUser() user: { organizationId: string }) {
    return this.definitions.bootstrap(user.organizationId);
  }

  @Get('published/:workflowKey')
  @RequirePermissions('workflow:read')
  findPublished(
    @CurrentUser() user: { organizationId: string },
    @Param('workflowKey') workflowKey: string,
  ) {
    return this.definitions.findPublishedByKey(user.organizationId, workflowKey);
  }

  @Post('import')
  @RequirePermissions('workflow:import')
  @ApiOperation({ summary: 'Import workflow definition from JSON' })
  importDefinition(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportWorkflowDefinitionDto,
    @Req() req: AgroRequest,
  ) {
    return this.importExport.importDefinition(
      user.organizationId,
      user.id,
      dto.content,
      { workflowKey: dto.workflowKey, publish: dto.publish },
      req.agroContext,
    );
  }

  @Get(':id')
  @RequirePermissions('workflow:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.definitions.findOne(user.organizationId, id);
  }

  @Get(':id/export')
  @RequirePermissions('workflow:export')
  exportDefinition(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.importExport.exportDefinition(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('workflow:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateWorkflowDefinitionDto,
    @Req() req: AgroRequest,
  ) {
    return this.definitions.create(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post(':id/clone')
  @RequirePermissions('workflow:create')
  clone(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CloneWorkflowDefinitionDto,
    @Req() req: AgroRequest,
  ) {
    return this.importExport.cloneDefinition(
      user.organizationId,
      user.id,
      id,
      dto.workflowKey,
      dto.name,
      req.agroContext,
    );
  }

  @Post(':id/deactivate')
  @RequirePermissions('workflow:update')
  deactivate(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.definitions.deactivate(user.organizationId, id);
  }

  @Post(':id/activate')
  @RequirePermissions('workflow:update')
  activate(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.definitions.activate(user.organizationId, id);
  }

  @Post(':id/versions')
  @RequirePermissions('workflow:create')
  createVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateWorkflowVersionDto,
    @Req() req: AgroRequest,
  ) {
    return this.definitions.createVersion(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Patch('versions/:versionId')
  @RequirePermissions('workflow:update')
  updateVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionId') versionId: string,
    @Body() dto: UpdateWorkflowVersionDto,
  ) {
    return this.definitions.updateVersion(
      user.organizationId,
      versionId,
      user.id,
      dto,
    );
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions('workflow:publish')
  publish(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('versionId') versionId: string,
    @Req() req: AgroRequest,
  ) {
    return this.definitions.publish(
      user.organizationId,
      versionId,
      user.id,
      req.agroContext,
    );
  }
}

@ApiTags('Workflows — Instances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflows/instances')
export class WorkflowInstancesController {
  constructor(
    private readonly instances: WorkflowInstancesService,
    private readonly metrics: WorkflowMetricsService,
    private readonly sla: WorkflowSlaService,
  ) {}

  @Get()
  @RequirePermissions('workflow:read')
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('workflowKey') workflowKey?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.instances.findAll(user.organizationId, {
      status,
      workflowKey,
      assigneeId,
    });
  }

  @Get('metrics')
  @RequirePermissions('workflow:read')
  metricsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.metrics.getDashboard(user.organizationId);
  }

  @Get('inbox')
  @RequirePermissions('workflow:execute')
  @ApiOperation({ summary: 'Pending tasks for current user' })
  inbox(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.instances.getInbox(user.organizationId, user.id);
  }

  @Post('sync/transitions')
  @RequirePermissions('workflow:execute')
  @ApiOperation({ summary: 'Batch sync offline transitions (Android)' })
  syncTransitions(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SyncTransitionsDto,
    @Req() req: AgroRequest,
  ) {
    return this.instances.syncTransitions(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('sla/process')
  @RequirePermissions('workflow:admin')
  @ApiOperation({ summary: 'Process overdue SLA assignments' })
  processSla(@CurrentUser() user: { organizationId: string }) {
    return this.sla.processOverdue(user.organizationId);
  }

  @Post('assignments/:assignmentId/reassign')
  @RequirePermissions('workflow:admin')
  reassign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReassignTaskDto,
  ) {
    return this.instances.reassignTask(
      user.organizationId,
      assignmentId,
      dto.userId,
      user.id,
    );
  }

  @Post('assignments/:assignmentId/escalate')
  @RequirePermissions('workflow:admin')
  escalate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.instances.escalateTask(user.organizationId, assignmentId, user.id);
  }

  @Get(':id')
  @RequirePermissions('workflow:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.instances.findOne(user.organizationId, id);
  }

  @Get(':id/history')
  @RequirePermissions('workflow:read')
  history(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.instances.getHistory(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('workflow:execute')
  @ApiOperation({ summary: 'Start workflow instance' })
  start(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: StartWorkflowInstanceDto,
    @Req() req: AgroRequest,
  ) {
    return this.instances.start(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post(':id/transitions')
  @RequirePermissions('workflow:execute')
  @ApiOperation({ summary: 'Execute state transition' })
  transition(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: ExecuteTransitionDto,
    @Req() req: AgroRequest,
  ) {
    return this.instances.executeTransition(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post(':id/suspend')
  @RequirePermissions('workflow:admin')
  suspend(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.instances.suspend(
      user.organizationId,
      id,
      user.id,
      req.agroContext,
    );
  }

  @Post(':id/resume')
  @RequirePermissions('workflow:admin')
  resume(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.instances.resume(
      user.organizationId,
      id,
      user.id,
      req.agroContext,
    );
  }

  @Post(':id/cancel')
  @RequirePermissions('workflow:cancel')
  cancel(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: AgroRequest,
  ) {
    return this.instances.cancel(
      user.organizationId,
      id,
      user.id,
      reason,
      req.agroContext,
    );
  }

  @Post(':id/comments')
  @RequirePermissions('workflow:execute')
  addComment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: AddWorkflowCommentDto,
  ) {
    return this.instances.addComment(
      user.organizationId,
      id,
      user.id,
      dto.content,
    );
  }

  @Post(':id/attachments')
  @RequirePermissions('workflow:execute')
  addAttachment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: AddWorkflowAttachmentDto,
  ) {
    return this.instances.addAttachment(
      user.organizationId,
      id,
      user.id,
      dto.fileId,
      dto.transitionId,
    );
  }
}
