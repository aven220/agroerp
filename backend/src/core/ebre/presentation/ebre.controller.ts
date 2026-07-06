import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { BreRulesService } from '../application/bre-rules.service';
import { BreGroupsService } from '../application/bre-groups.service';
import { BreDecisionService } from '../application/bre-decision.service';
import { BreSimulatorService } from '../application/bre-simulator.service';
import { BreMetricsService } from '../application/bre-metrics.service';
import { BreAuditService } from '../application/bre-audit.service';
import { BreAiService } from '../application/bre-ai.service';
import { BreConflictService } from '../application/bre-conflict.service';
import { BreExecutorService } from '../application/bre-executor.service';
import {
  CloneBreRuleDto,
  CreateBreGroupDto,
  CreateBreRuleDto,
  CreateDecisionTableDto,
  ImportBreRuleDto,
  SimulateBatchDto,
  SimulateBreRuleDto,
  UpdateBreRuleDto,
} from './ebre.dto';
import { BusinessRuleDefinition } from '@agroerp/shared';

@ApiTags('EBRE — Business Rules Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ebre')
export class EbreController {
  constructor(
    private readonly rules: BreRulesService,
    private readonly groups: BreGroupsService,
    private readonly decisions: BreDecisionService,
    private readonly simulator: BreSimulatorService,
    private readonly metrics: BreMetricsService,
    private readonly audit: BreAuditService,
    private readonly ai: BreAiService,
    private readonly conflicts: BreConflictService,
    private readonly executor: BreExecutorService,
  ) {}

  @Get('center')
  @RequirePermissions('bre:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, groups, suggestions] = await Promise.all([
      this.metrics.dashboard(user.organizationId),
      this.groups.findAll(user.organizationId),
      this.ai.suggestRules(user.organizationId),
    ]);
    return { dashboard, groups, suggestions };
  }

  @Get('rules')
  @RequirePermissions('bre:read')
  listRules(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('groupKey') groupKey?: string,
  ) {
    return this.rules.findAll(user.organizationId, status, groupKey);
  }

  @Get('rules/:id')
  @RequirePermissions('bre:read')
  getRule(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.rules.findOne(user.organizationId, id);
  }

  @Post('rules')
  @RequirePermissions('bre:create')
  createRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateBreRuleDto,
  ) {
    return this.rules.create(user.organizationId, user.id, dto as BusinessRuleDefinition);
  }

  @Patch('rules/:id')
  @RequirePermissions('bre:update')
  updateRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateBreRuleDto,
  ) {
    return this.rules.update(user.organizationId, id, user.id, dto as Partial<BusinessRuleDefinition>);
  }

  @Post('rules/:id/clone')
  @RequirePermissions('bre:create')
  cloneRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CloneBreRuleDto,
  ) {
    return this.rules.clone(user.organizationId, id, user.id, dto.newKey, dto.newName);
  }

  @Post('rules/:id/version')
  @RequirePermissions('bre:update')
  versionRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body('changelog') changelog?: string,
  ) {
    return this.rules.version(user.organizationId, id, user.id, changelog);
  }

  @Get('rules/:id/versions')
  @RequirePermissions('bre:read')
  ruleVersions(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.rules.listVersions(user.organizationId, id);
  }

  @Post('rules/:id/publish')
  @RequirePermissions('bre:publish')
  publishRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.publish(user.organizationId, id, user.id);
  }

  @Post('rules/:id/unpublish')
  @RequirePermissions('bre:publish')
  unpublishRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.unpublish(user.organizationId, id, user.id);
  }

  @Delete('rules/:id')
  @RequirePermissions('bre:admin')
  deleteRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.softDelete(user.organizationId, id, user.id);
  }

  @Get('rules/:id/export')
  @RequirePermissions('bre:read')
  exportRule(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.rules.exportRule(user.organizationId, id);
  }

  @Post('rules/import')
  @RequirePermissions('bre:create')
  importRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportBreRuleDto,
  ) {
    return this.rules.importRule(user.organizationId, user.id, dto as BusinessRuleDefinition);
  }

  @Post('rules/:id/simulate')
  @RequirePermissions('bre:simulate')
  simulateRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: SimulateBreRuleDto,
  ) {
    return this.simulator.simulate(user.organizationId, id, user.id, dto);
  }

  @Post('simulate/batch')
  @RequirePermissions('bre:simulate')
  simulateBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SimulateBatchDto,
  ) {
    return this.simulator.simulateBatch(
      user.organizationId,
      user.id,
      dto.eventType,
      dto.payload ?? {},
    );
  }

  @Post('rules/:id/execute')
  @RequirePermissions('bre:admin')
  @ApiOperation({ summary: 'Manual rule execution' })
  async executeRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: SimulateBreRuleDto,
  ) {
    const rule = await this.rules.findOne(user.organizationId, id);
    return this.executor.executeRule(rule, {
      eventType: dto.eventType,
      payload: dto.payload,
      event: dto.event,
      variables: dto.variables,
      actorId: user.id,
      dryRun: false,
    });
  }

  @Get('rules/:id/conflicts')
  @RequirePermissions('bre:read')
  async ruleConflicts(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    const rule = await this.rules.findOne(user.organizationId, id);
    return this.conflicts.detectConflicts(
      user.organizationId,
      id,
      rule.eventTypes,
      rule.priority,
    );
  }

  @Get('executions')
  @RequirePermissions('bre:audit:read')
  executions(
    @CurrentUser() user: { organizationId: string },
    @Query('ruleId') ruleId?: string,
  ) {
    return this.rules.listExecutions(user.organizationId, ruleId);
  }

  @Get('audit')
  @RequirePermissions('bre:audit:read')
  auditLog(
    @CurrentUser() user: { organizationId: string },
    @Query('ruleId') ruleId?: string,
  ) {
    return this.audit.findAll(user.organizationId, ruleId);
  }

  @Get('groups')
  @RequirePermissions('bre:read')
  listGroups(@CurrentUser() user: { organizationId: string }) {
    return this.groups.findAll(user.organizationId);
  }

  @Post('groups')
  @RequirePermissions('bre:group:manage')
  createGroup(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateBreGroupDto,
  ) {
    return this.groups.create(user.organizationId, dto);
  }

  @Get('decision-tables')
  @RequirePermissions('bre:read')
  listDecisionTables(@CurrentUser() user: { organizationId: string }) {
    return this.decisions.findAll(user.organizationId);
  }

  @Post('decision-tables')
  @RequirePermissions('bre:decision:manage')
  createDecisionTable(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateDecisionTableDto,
  ) {
    return this.decisions.create(user.organizationId, user.id, {
      tableKey: dto.tableKey,
      name: dto.name,
      description: dto.description,
      inputs: dto.inputs ?? [],
      outputs: dto.outputs ?? [],
      rows: dto.rows ?? [],
      hitPolicy: dto.hitPolicy as 'first' | undefined,
    });
  }

  @Get('ai/suggestions')
  @RequirePermissions('bre:read')
  aiSuggestions(@CurrentUser() user: { organizationId: string }) {
    return this.ai.suggestRules(user.organizationId);
  }

  @Get('mobile/config')
  @RequirePermissions('bre:read')
  async mobileConfig(@CurrentUser() user: { organizationId: string }) {
    const rules = await this.rules.findAll(user.organizationId, 'published');
    return {
      rules: rules.map((r) => ({
        ruleKey: r.ruleKey,
        name: r.name,
        eventTypes: r.eventTypes,
        eventCategory: r.eventCategory,
        priority: r.priority,
        version: r.version,
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('mobile/executions')
  @RequirePermissions('bre:read')
  mobileExecutions(@CurrentUser() user: { organizationId: string }) {
    return this.rules.listExecutions(user.organizationId);
  }
}
