import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiGatewayService } from '../application/ai-gateway.service';
import { AiServicesFacade } from '../application/ai-services.facade';
import { AiProviderAdminService } from '../application/ai-provider-admin.service';
import { AiPromptManagerService } from '../application/ai-prompt-manager.service';
import { AiCopilotService } from '../application/ai-copilot.service';
import { AiRagService } from '../application/ai-rag.service';
import { AiMemoryService } from '../application/ai-memory.service';
import { AiMetricsService } from '../application/ai-metrics.service';
import { AiAutomationService } from '../application/ai-automation.service';
import { AiProviderRegistryService } from '../application/ai-provider-registry.service';
import {
  AiChatDto,
  AiServiceInvokeDto,
  CreateAutomationDto,
  CreateModelDto,
  CreatePromptDto,
  CreateProviderDto,
  IndexRagDto,
  MemoryDto,
  PromptTestDto,
  PromptVersionDto,
  RagSearchDto,
  UpdateProviderDto,
} from './eaidsp.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AiServiceType } from '@agroerp/shared';

@ApiTags('EAIDSP — Enterprise AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eaidsp')
export class EaidspController {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly services: AiServicesFacade,
    private readonly admin: AiProviderAdminService,
    private readonly prompts: AiPromptManagerService,
    private readonly copilots: AiCopilotService,
    private readonly rag: AiRagService,
    private readonly memory: AiMemoryService,
    private readonly metrics: AiMetricsService,
    private readonly automation: AiAutomationService,
    private readonly registry: AiProviderRegistryService,
  ) {}

  @Get('center')
  @RequirePermissions('ai:read')
  async center(@CurrentUser() user: { id: string; organizationId: string }) {
    const [dashboard, copilots, providers, prompts] = await Promise.all([
      this.metrics.getDashboard(user.organizationId),
      this.copilots.findAll(user.organizationId),
      this.admin.listProviders(user.organizationId),
      this.prompts.findAll(user.organizationId),
    ]);
    return {
      dashboard,
      copilotCount: copilots.length,
      providerCount: providers.length,
      promptCount: prompts.length,
      providerTypes: this.registry.listTypes(),
    };
  }

  @Post('chat')
  @RequirePermissions('ai:chat')
  chat(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: AiChatDto) {
    return this.gateway.complete(user.organizationId, user.id, {
      serviceType: 'chat',
      prompt: dto.prompt,
      copilotKey: dto.copilotKey,
      conversationId: dto.conversationId,
      moduleContext: dto.moduleContext,
      useRag: dto.useRag,
      variables: dto.variables,
    });
  }

  @Post('invoke')
  @RequirePermissions('ai:chat')
  invoke(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: AiServiceInvokeDto) {
    return this.services.invoke(
      user.organizationId,
      user.id,
      dto.serviceType as AiServiceType,
      dto.prompt,
      { moduleContext: dto.moduleContext, useRag: dto.useRag },
    );
  }

  @Post('summarize')
  @RequirePermissions('ai:chat')
  summarize(@CurrentUser() user: { id: string; organizationId: string }, @Body() body: { text: string }) {
    return this.services.summarize(user.organizationId, user.id, body.text);
  }

  @Post('recommend')
  @RequirePermissions('ai:chat')
  recommend(@CurrentUser() user: { id: string; organizationId: string }, @Body() body: { context: string }) {
    return this.services.recommend(user.organizationId, user.id, body.context);
  }

  @Post('explain')
  @RequirePermissions('ai:chat')
  explain(@CurrentUser() user: { id: string; organizationId: string }, @Body() body: { indicator: string }) {
    return this.services.explain(user.organizationId, user.id, body.indicator);
  }

  @Get('providers')
  @RequirePermissions('ai:configure')
  listProviders(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listProviders(user.organizationId);
  }

  @Post('providers')
  @RequirePermissions('ai:configure')
  createProvider(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateProviderDto) {
    return this.admin.createProvider(user.organizationId, user.id, dto);
  }

  @Patch('providers/:id')
  @RequirePermissions('ai:configure')
  updateProvider(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.admin.updateProvider(user.organizationId, id, dto);
  }

  @Get('models')
  @RequirePermissions('ai:configure')
  listModels(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listModels(user.organizationId);
  }

  @Post('models')
  @RequirePermissions('ai:configure')
  createModel(@CurrentUser() user: { organizationId: string }, @Body() dto: CreateModelDto) {
    return this.admin.createModel(user.organizationId, dto);
  }

  @Get('prompts')
  @RequirePermissions('ai:prompt:read')
  listPrompts(@CurrentUser() user: { organizationId: string }) {
    return this.prompts.findAll(user.organizationId);
  }

  @Post('prompts')
  @RequirePermissions('ai:prompt:create')
  createPrompt(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreatePromptDto) {
    return this.prompts.create(user.organizationId, user.id, dto);
  }

  @Post('prompts/:id/versions')
  @RequirePermissions('ai:prompt:update')
  addPromptVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: PromptVersionDto,
  ) {
    return this.prompts.addVersion(user.organizationId, id, user.id, dto);
  }

  @Post('prompts/:id/versions/:version/approve')
  @RequirePermissions('ai:prompt:approve')
  approvePrompt(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.prompts.approve(user.organizationId, id, Number(version), user.id);
  }

  @Post('prompts/:id/versions/:version/activate')
  @RequirePermissions('ai:prompt:approve')
  activatePrompt(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.prompts.activate(user.organizationId, id, Number(version), user.id);
  }

  @Post('prompts/:id/versions/:version/test')
  @RequirePermissions('ai:prompt:read')
  testPrompt(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() dto: PromptTestDto,
  ) {
    return this.prompts.test(user.organizationId, id, Number(version), dto.variables);
  }

  @Get('copilots')
  @RequirePermissions('ai:copilot:use')
  listCopilots(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.copilots.findAll(user.organizationId);
  }

  @Get('conversations')
  @RequirePermissions('ai:read')
  listConversations(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.admin.listConversations(user.organizationId, user.id);
  }

  @Get('conversations/:id')
  @RequirePermissions('ai:read')
  getConversation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.admin.getConversation(user.organizationId, user.id, id);
  }

  @Get('rag/documents')
  @RequirePermissions('ai:rag:read')
  listRag(@CurrentUser() user: { organizationId: string }) {
    return this.rag.listDocuments(user.organizationId);
  }

  @Post('rag/documents')
  @RequirePermissions('ai:rag:manage')
  indexRag(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: IndexRagDto) {
    return this.rag.indexDocument(user.organizationId, user.id, dto);
  }

  @Post('rag/search')
  @RequirePermissions('ai:rag:read')
  searchRag(@CurrentUser() user: { organizationId: string }, @Body() dto: RagSearchDto) {
    return this.rag.search(user.organizationId, dto.query, dto.limit ?? 5);
  }

  @Post('rag/sync-erp')
  @RequirePermissions('ai:rag:manage')
  syncRag(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.rag.syncErpRecords(user.organizationId, user.id);
  }

  @Delete('rag/documents/:id')
  @RequirePermissions('ai:rag:manage')
  deleteRag(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.rag.removeDocument(user.organizationId, id);
  }

  @Get('memory')
  @RequirePermissions('ai:read')
  listMemory(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.memory.recall(user.organizationId, user.id);
  }

  @Post('memory')
  @RequirePermissions('ai:chat')
  saveMemory(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: MemoryDto) {
    return this.memory.remember(
      user.organizationId,
      dto.memoryKey,
      dto.content,
      (dto.scope as 'user') ?? 'user',
      user.id,
    );
  }

  @Get('metrics')
  @RequirePermissions('ai:metrics:read')
  metricsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.metrics.getDashboard(user.organizationId);
  }

  @Get('automations')
  @RequirePermissions('ai:admin')
  listAutomations(@CurrentUser() user: { organizationId: string }) {
    return this.automation.findAll(user.organizationId);
  }

  @Post('automations')
  @RequirePermissions('ai:admin')
  createAutomation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateAutomationDto) {
    return this.automation.create(user.organizationId, user.id, dto);
  }
}
