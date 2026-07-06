import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EihConnectorDefinition, EihIntegrationFlowDefinition } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { IntegrationConnectorService } from '../application/integration-connector.service';
import { IntegrationConnectorCatalogService } from '../application/integration-connector-catalog.service';
import { IntegrationFlowService } from '../application/integration-flow.service';
import { IntegrationTransformService } from '../application/integration-transform.service';
import { IntegrationSyncService } from '../application/integration-sync.service';
import { IntegrationErrorService } from '../application/integration-error.service';
import { IntegrationWebhookService } from '../application/integration-webhook.service';
import { IntegrationBusService } from '../application/integration-bus.service';
import { IntegrationMetricsService } from '../application/integration-metrics.service';
import { IntegrationAiService } from '../application/integration-ai.service';
import { IntegrationSecurityService } from '../application/integration-security.service';
import { IntegrationAuditService } from '../application/integration-audit.service';
import {
  AddFlowStepDto,
  CreateFlowDto,
  ExecuteSyncDto,
  RegisterConnectorDto,
  RegisterWebhookDto,
  SetFieldMappingsDto,
  SuggestMappingsDto,
  TransformDto,
  UpdateConnectorDto,
  WebhookReceiveDto,
} from './eih.dto';

@ApiTags('EIH — Enterprise Integration Hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eih')
export class EihController {
  constructor(
    private readonly connectors: IntegrationConnectorService,
    private readonly catalog: IntegrationConnectorCatalogService,
    private readonly flows: IntegrationFlowService,
    private readonly transforms: IntegrationTransformService,
    private readonly sync: IntegrationSyncService,
    private readonly errors: IntegrationErrorService,
    private readonly webhooks: IntegrationWebhookService,
    private readonly bus: IntegrationBusService,
    private readonly metrics: IntegrationMetricsService,
    private readonly ai: IntegrationAiService,
    private readonly security: IntegrationSecurityService,
    private readonly audit: IntegrationAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('integration:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, suggestions, connectors, flows] = await Promise.all([
      this.metrics.dashboard(user.organizationId),
      this.ai.analyze(user.organizationId),
      this.connectors.findAll(user.organizationId),
      this.flows.findAll(user.organizationId),
    ]);
    return { dashboard, suggestions, connectors, flows };
  }

  @Get('connectors')
  @RequirePermissions('integration:read')
  listConnectors(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('protocol') protocol?: string,
  ) {
    return this.connectors.findAll(user.organizationId, { status, category, protocol });
  }

  @Get('connectors/:connectorKey')
  @RequirePermissions('integration:read')
  getConnector(@CurrentUser() user: { organizationId: string }, @Param('connectorKey') connectorKey: string) {
    return this.connectors.findOne(user.organizationId, connectorKey);
  }

  @Post('connectors')
  @RequirePermissions('integration:create')
  registerConnector(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: RegisterConnectorDto,
  ) {
    return this.connectors.register(user.organizationId, user.id, dto as EihConnectorDefinition);
  }

  @Post('connectors/:connectorKey/activate')
  @RequirePermissions('integration:update')
  activateConnector(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('connectorKey') connectorKey: string,
  ) {
    return this.connectors.activate(user.organizationId, user.id, connectorKey);
  }

  @Post('connectors/:connectorKey/deactivate')
  @RequirePermissions('integration:update')
  deactivateConnector(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('connectorKey') connectorKey: string,
  ) {
    return this.connectors.deactivate(user.organizationId, user.id, connectorKey);
  }

  @Patch('connectors/:connectorKey')
  @RequirePermissions('integration:update')
  updateConnector(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('connectorKey') connectorKey: string,
    @Body() dto: UpdateConnectorDto,
  ) {
    return this.connectors.update(user.organizationId, user.id, connectorKey, dto as Partial<EihConnectorDefinition>);
  }

  @Post('connectors/:connectorKey/rotate-credentials')
  @RequirePermissions('integration:admin')
  async rotateCredentials(
    @CurrentUser() user: { organizationId: string },
    @Param('connectorKey') connectorKey: string,
  ) {
    const connector = await this.connectors.findOne(user.organizationId, connectorKey);
    return this.security.rotateCredentials(connector.id);
  }

  @Get('catalog')
  @RequirePermissions('integration:read')
  listCatalog() {
    return this.catalog.findAll();
  }

  @Get('flows')
  @RequirePermissions('integration:read')
  listFlows(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.flows.findAll(user.organizationId, status);
  }

  @Get('flows/:flowKey')
  @RequirePermissions('integration:read')
  getFlow(@CurrentUser() user: { organizationId: string }, @Param('flowKey') flowKey: string) {
    return this.flows.findOne(user.organizationId, flowKey);
  }

  @Post('flows')
  @RequirePermissions('integration:create')
  createFlow(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFlowDto,
  ) {
    return this.flows.create(user.organizationId, user.id, dto as EihIntegrationFlowDefinition);
  }

  @Post('flows/:flowKey/publish')
  @RequirePermissions('integration:publish')
  publishFlow(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('flowKey') flowKey: string,
  ) {
    return this.flows.publish(user.organizationId, user.id, flowKey);
  }

  @Post('flows/:flowKey/steps')
  @RequirePermissions('integration:update')
  async addStep(
    @CurrentUser() user: { organizationId: string },
    @Param('flowKey') flowKey: string,
    @Body() dto: AddFlowStepDto,
  ) {
    const flow = await this.flows.findOne(user.organizationId, flowKey);
    return this.flows.addStep(flow.id, dto);
  }

  @Patch('flows/:flowKey/mappings')
  @RequirePermissions('integration:update')
  setMappings(
    @CurrentUser() user: { organizationId: string },
    @Param('flowKey') flowKey: string,
    @Body() dto: SetFieldMappingsDto,
  ) {
    return this.flows.setFieldMappings(user.organizationId, flowKey, dto.mappings);
  }

  @Post('transform')
  @RequirePermissions('integration:execute')
  transform(@Body() dto: TransformDto) {
    return this.transforms.transform(dto.input, dto.inputFormat as 'json', dto.outputFormat as 'json');
  }

  @Post('transform/detect')
  @RequirePermissions('integration:execute')
  detectFormat(@Body() body: { payload: unknown }) {
    return this.transforms.detect(body.payload);
  }

  @Post('flows/:flowKey/sync')
  @RequirePermissions('integration:execute')
  executeFlowSync(
    @CurrentUser() user: { organizationId: string },
    @Param('flowKey') flowKey: string,
    @Body() dto: ExecuteSyncDto,
  ) {
    return this.sync.executeFlow(user.organizationId, flowKey, dto.data ?? []);
  }

  @Post('connectors/:connectorKey/sync')
  @RequirePermissions('integration:sync:manage')
  executeConnectorSync(
    @CurrentUser() user: { organizationId: string },
    @Param('connectorKey') connectorKey: string,
    @Body() dto: ExecuteSyncDto,
  ) {
    return this.sync.executeConnectorSync(
      user.organizationId,
      connectorKey,
      (dto.syncMode ?? 'scheduled') as 'scheduled',
      dto.data ?? [],
    );
  }

  @Get('sync/history')
  @RequirePermissions('integration:read')
  syncHistory(@CurrentUser() user: { organizationId: string }) {
    return this.sync.listRuns(user.organizationId);
  }

  @Get('errors')
  @RequirePermissions('integration:read')
  listErrors(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.errors.findAll(user.organizationId, status);
  }

  @Post('errors/:id/retry')
  @RequirePermissions('integration:sync:manage')
  retryError(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.errors.retry(user.organizationId, id);
  }

  @Post('errors/:id/resolve')
  @RequirePermissions('integration:update')
  resolveError(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.errors.resolve(user.organizationId, id, user.id);
  }

  @Post('errors/:id/reprocess')
  @RequirePermissions('integration:sync:manage')
  reprocessError(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.errors.reprocess(user.organizationId, id);
  }

  @Get('webhooks')
  @RequirePermissions('integration:webhook:manage')
  listWebhooks(@CurrentUser() user: { organizationId: string }) {
    return this.webhooks.list(user.organizationId);
  }

  @Post('webhooks')
  @RequirePermissions('integration:webhook:manage')
  registerWebhook(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: RegisterWebhookDto,
  ) {
    return this.webhooks.register(user.organizationId, dto);
  }

  @Post('webhooks/:endpointKey/receive')
  @RequirePermissions('integration:execute')
  receiveWebhook(
    @CurrentUser() user: { organizationId: string },
    @Param('endpointKey') endpointKey: string,
    @Body() dto: WebhookReceiveDto,
  ) {
    return this.webhooks.receive(user.organizationId, endpointKey, dto.payload);
  }

  @Get('bus')
  @RequirePermissions('integration:read')
  busInfo() {
    return { broker: this.bus.messageBrokerReady(), etl: this.bus.etlReady() };
  }

  @Get('security/oauth2')
  @RequirePermissions('integration:read')
  oauth2Info() {
    return this.security.oauth2Ready();
  }

  @Get('security/jwt')
  @RequirePermissions('integration:read')
  jwtInfo() {
    return this.security.jwtReady();
  }

  @Get('security/tls')
  @RequirePermissions('integration:read')
  tlsInfo() {
    return this.security.tlsReady();
  }

  @Get('security/secrets')
  @RequirePermissions('integration:admin')
  secretsInfo() {
    return this.security.secretManagerReady();
  }

  @Get('ai/analysis')
  @RequirePermissions('integration:read')
  aiAnalysis(@CurrentUser() user: { organizationId: string }) {
    return this.ai.analyze(user.organizationId);
  }

  @Post('ai/suggest-mappings')
  @RequirePermissions('integration:read')
  suggestMappings(@Body() dto: SuggestMappingsDto) {
    return this.ai.suggestFieldMappings(dto.sourceFields, dto.targetFields);
  }

  @Get('ai/performance')
  @RequirePermissions('integration:read')
  performance(@CurrentUser() user: { organizationId: string }) {
    return this.ai.performanceAnalysis(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('integration:audit:read')
  auditLog(
    @CurrentUser() user: { organizationId: string },
    @Query('entityKey') entityKey?: string,
  ) {
    return this.audit.findAll(user.organizationId, entityKey);
  }

  @Get('mobile/connectors')
  @ApiOperation({ summary: 'Conectores activos para app móvil' })
  @RequirePermissions('integration:read')
  async mobileConnectors(@CurrentUser() user: { organizationId: string }) {
    const connectors = await this.connectors.findAll(user.organizationId, { status: 'active' });
    return {
      connectors: connectors.map((c) => ({
        connectorKey: c.connectorKey,
        name: c.name,
        protocol: c.protocol,
        category: c.category,
        lastSyncAt: c.lastSyncAt,
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('mobile/sync')
  @ApiOperation({ summary: 'Historial reciente móvil' })
  @RequirePermissions('integration:read')
  async mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.sync.listRuns(user.organizationId, 30);
  }
}
