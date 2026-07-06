import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EipStatus, EipWebhookDirection } from '@agroerp/prisma-eip-client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EipAuditService } from '../application/eip-audit.service';
import { EipBreService } from '../application/eip-bre.service';
import { EipBridgeService } from '../application/eip-bridge.service';
import { EipConnectorService } from '../application/eip-connector.service';
import { EipEngineService, EipOfflineService } from '../application/eip-engine.service';
import { EipEsbService } from '../application/eip-esb.service';
import { EipEventBusService } from '../application/eip-event-bus.service';
import { EipGatewayService } from '../application/eip-gateway.service';
import { EipMessagingService } from '../application/eip-messaging.service';
import { EipMonitoringService } from '../application/eip-monitoring.service';
import { EipWebhookService } from '../application/eip-webhook.service';
import {
  EipBridgeEventDto,
  EipBridgeFlowDto,
  EipConfigureMessagingDto,
  EipCreateBindingDto,
  EipCreateConnectorDto,
  EipCreateEsbRouteDto,
  EipCreatePolicyDto,
  EipCreateTopicDto,
  EipCreateWebhookDto,
  EipGatewayProxyDto,
  EipInvokeConnectorDto,
  EipMessagingPublishDto,
  EipOfflineBatchDto,
  EipPublishEventDto,
  EipRouteMessageDto,
  EipSetStatusDto,
  EipSimulateDto,
  EipSubscribeDto,
  EipTestRulesDto,
  EipWebhookPayloadDto,
} from './eip.dto';

@ApiTags('EIP — Enterprise Integration Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eip')
export class EipController {
  constructor(
    private readonly engine: EipEngineService,
    private readonly bre: EipBreService,
    private readonly gateway: EipGatewayService,
    private readonly webhooks: EipWebhookService,
    private readonly esb: EipEsbService,
    private readonly eventBus: EipEventBusService,
    private readonly connectors: EipConnectorService,
    private readonly messaging: EipMessagingService,
    private readonly monitoring: EipMonitoringService,
    private readonly bridge: EipBridgeService,
    private readonly offline: EipOfflineService,
    private readonly audit: EipAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eip:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eip:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('eip:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('bre/bindings')
  @RequirePermissions('eip:read')
  listBindings(@CurrentUser() user: { organizationId: string }, @Query('moduleRef') moduleRef?: string) {
    return this.bre.listBindings(user.organizationId, moduleRef);
  }

  @Post('bre/bindings')
  @RequirePermissions('eip:config')
  createBinding(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipCreateBindingDto) {
    return this.bre.createBinding(user.organizationId, user.id, dto.bindingKey, dto.ruleKey, dto.moduleRef, dto.scope ?? 'module', dto.priority ?? 100);
  }

  @Post('bre/bindings/:bindingKey/status')
  @RequirePermissions('eip:config')
  setBindingStatus(@CurrentUser() user: { organizationId: string; id: string }, @Param('bindingKey') bindingKey: string, @Body() dto: EipSetStatusDto) {
    return this.bre.setBindingStatus(user.organizationId, user.id, bindingKey, dto.status);
  }

  @Get('bre/rules')
  @RequirePermissions('eip:read')
  listBreRules(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string, @Query('groupKey') groupKey?: string) {
    return this.bre.listBreRules(user.organizationId, status, groupKey);
  }

  @Post('bre/rules/:ruleId/simulate')
  @RequirePermissions('eip:execute')
  simulateRule(@CurrentUser() user: { organizationId: string; id: string }, @Param('ruleId') ruleId: string, @Body() dto: EipSimulateDto) {
    return this.bre.simulateRule(user.organizationId, user.id, ruleId, dto.payload);
  }

  @Post('bre/bindings/:bindingKey/simulate')
  @RequirePermissions('eip:execute')
  simulateBinding(@CurrentUser() user: { organizationId: string; id: string }, @Param('bindingKey') bindingKey: string, @Body() dto: EipSimulateDto) {
    return this.bre.simulateBinding(user.organizationId, user.id, bindingKey, dto.payload);
  }

  @Post('bre/rules/:ruleId/test')
  @RequirePermissions('eip:execute')
  testRule(@CurrentUser() user: { organizationId: string; id: string }, @Param('ruleId') ruleId: string, @Body() dto: EipTestRulesDto) {
    return this.bre.testRule(user.organizationId, user.id, ruleId, dto.cases);
  }

  @Get('bre/metrics')
  @RequirePermissions('eip:read')
  breMetrics(@CurrentUser() user: { organizationId: string }) {
    return this.bre.metrics(user.organizationId);
  }

  @Get('gateway/apis')
  @RequirePermissions('eip:read')
  listApis(@CurrentUser() user: { organizationId: string }) {
    return this.gateway.listApis(user.organizationId);
  }

  @Get('gateway/policies')
  @RequirePermissions('eip:read')
  listPolicies(@CurrentUser() user: { organizationId: string }) {
    return this.gateway.listPolicies(user.organizationId);
  }

  @Post('gateway/policies')
  @RequirePermissions('eip:config')
  createPolicy(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipCreatePolicyDto) {
    return this.gateway.createPolicy(user.organizationId, user.id, dto.policyKey, dto.apiKey, dto);
  }

  @Post('gateway/policies/:policyKey/activate')
  @RequirePermissions('eip:config')
  activatePolicy(@CurrentUser() user: { organizationId: string; id: string }, @Param('policyKey') policyKey: string) {
    return this.gateway.activatePolicy(user.organizationId, user.id, policyKey);
  }

  @Post('gateway/proxy/:apiKey')
  @RequirePermissions('eip:execute')
  proxy(@CurrentUser() user: { organizationId: string; id: string }, @Param('apiKey') apiKey: string, @Body() dto: EipGatewayProxyDto) {
    return this.gateway.proxy(user.organizationId, apiKey, dto.version ?? 'v1', dto, { clientId: user.id, scopes: ['*'] });
  }

  @Get('gateway/analytics')
  @RequirePermissions('eip:read')
  gatewayAnalytics(@CurrentUser() user: { organizationId: string }) {
    return this.gateway.getAnalytics(user.organizationId);
  }

  @Get('webhooks')
  @RequirePermissions('eip:read')
  listWebhooks(@CurrentUser() user: { organizationId: string }, @Query('direction') direction?: EipWebhookDirection) {
    return this.webhooks.list(user.organizationId, direction);
  }

  @Post('webhooks')
  @RequirePermissions('eip:config')
  createWebhook(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipCreateWebhookDto) {
    return this.webhooks.create(user.organizationId, user.id, dto.webhookKey, dto.name, dto.direction, dto);
  }

  @Post('webhooks/:webhookKey/status')
  @RequirePermissions('eip:config')
  setWebhookStatus(@CurrentUser() user: { organizationId: string; id: string }, @Param('webhookKey') webhookKey: string, @Body() dto: EipSetStatusDto) {
    return this.webhooks.setStatus(user.organizationId, user.id, webhookKey, dto.status);
  }

  @Post('webhooks/incoming/:webhookKey')
  @RequirePermissions('eip:execute')
  receiveWebhook(@CurrentUser() user: { organizationId: string }, @Param('webhookKey') webhookKey: string, @Body() dto: EipWebhookPayloadDto) {
    return this.webhooks.receiveIncoming(user.organizationId, webhookKey, dto.payload, { origin: dto.origin, signature: dto.signature });
  }

  @Post('webhooks/outgoing/:webhookKey/dispatch')
  @RequirePermissions('eip:execute')
  dispatchWebhook(@CurrentUser() user: { organizationId: string }, @Param('webhookKey') webhookKey: string, @Body() dto: EipWebhookPayloadDto) {
    return this.webhooks.dispatchOutgoing(user.organizationId, webhookKey, dto.payload);
  }

  @Get('webhooks/history')
  @RequirePermissions('eip:read')
  webhookHistory(@CurrentUser() user: { organizationId: string }, @Query('webhookKey') webhookKey?: string) {
    return this.webhooks.history(user.organizationId, webhookKey);
  }

  @Post('webhooks/retry')
  @RequirePermissions('eip:execute')
  retryWebhooks(@CurrentUser() user: { organizationId: string }) {
    return this.webhooks.retryPending(user.organizationId);
  }

  @Get('webhooks/queue')
  @RequirePermissions('eip:read')
  webhookQueue(@CurrentUser() user: { organizationId: string }) {
    return this.webhooks.retryQueue(user.organizationId);
  }

  @Get('esb/routes')
  @RequirePermissions('eip:read')
  listEsbRoutes(@CurrentUser() user: { organizationId: string }, @Query('status') status?: EipStatus) {
    return this.esb.listRoutes(user.organizationId, status);
  }

  @Post('esb/routes')
  @RequirePermissions('eip:config')
  createEsbRoute(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipCreateEsbRouteDto) {
    return this.esb.createRoute(user.organizationId, user.id, dto.routeKey, dto.name, dto.sourceType, dto.targetType, dto.sourceRef, dto.targetRef, dto);
  }

  @Post('esb/routes/:routeKey/publish')
  @RequirePermissions('eip:config')
  publishEsbRoute(@CurrentUser() user: { organizationId: string; id: string }, @Param('routeKey') routeKey: string) {
    return this.esb.publishRoute(user.organizationId, user.id, routeKey);
  }

  @Post('esb/route')
  @RequirePermissions('eip:execute')
  routeMessage(@CurrentUser() user: { organizationId: string }, @Body() dto: EipRouteMessageDto) {
    return this.esb.routeMessage(user.organizationId, dto.sourceRef, dto.payload, dto.sync ?? false);
  }

  @Get('esb/messages')
  @RequirePermissions('eip:read')
  esbMessages(@CurrentUser() user: { organizationId: string }, @Query('status') status?: string) {
    return this.esb.messages(user.organizationId, status);
  }

  @Get('esb/adapters')
  @RequirePermissions('eip:read')
  esbAdapters() {
    return this.esb.adapters();
  }

  @Get('events/topics')
  @RequirePermissions('eip:read')
  listTopics(@CurrentUser() user: { organizationId: string }) {
    return this.eventBus.listTopics(user.organizationId);
  }

  @Post('events/topics')
  @RequirePermissions('eip:config')
  createTopic(@CurrentUser() user: { organizationId: string }, @Body() dto: EipCreateTopicDto) {
    return this.eventBus.createTopic(user.organizationId, dto.topicKey, dto.name, dto.eventKind, dto.persist ?? true);
  }

  @Post('events/subscribe')
  @RequirePermissions('eip:config')
  subscribe(@CurrentUser() user: { organizationId: string }, @Body() dto: EipSubscribeDto) {
    return this.eventBus.subscribe(user.organizationId, dto.subscriptionKey, dto.topicKey, dto.subscriberRef, dto.filterExpr);
  }

  @Post('events/publish')
  @RequirePermissions('eip:execute')
  publishEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipPublishEventDto) {
    return this.eventBus.publish(user.organizationId, dto.topicKey, dto.eventType, dto.payload, dto.eventKind ?? 'custom', user.id);
  }

  @Post('events/:messageKey/retry')
  @RequirePermissions('eip:execute')
  retryEvent(@CurrentUser() user: { organizationId: string }, @Param('messageKey') messageKey: string) {
    return this.eventBus.retry(user.organizationId, messageKey);
  }

  @Get('events/messages')
  @RequirePermissions('eip:read')
  eventMessages(@CurrentUser() user: { organizationId: string }, @Query('eventType') eventType?: string) {
    return this.eventBus.listMessages(user.organizationId, eventType);
  }

  @Get('events/dlq')
  @RequirePermissions('eip:read')
  eventDlq(@CurrentUser() user: { organizationId: string }) {
    return this.eventBus.listDlq(user.organizationId);
  }

  @Get('events/domain')
  @RequirePermissions('eip:read')
  domainEvents(@CurrentUser() user: { organizationId: string }) {
    return this.eventBus.domainEvents(user.organizationId);
  }

  @Get('events/system')
  @RequirePermissions('eip:read')
  systemEvents(@CurrentUser() user: { organizationId: string }) {
    return this.eventBus.systemEvents(user.organizationId);
  }

  @Get('connectors/catalog')
  @RequirePermissions('eip:read')
  connectorCatalog() {
    return this.connectors.catalog();
  }

  @Get('connectors')
  @RequirePermissions('eip:read')
  listConnectors(@CurrentUser() user: { organizationId: string }) {
    return this.connectors.list(user.organizationId);
  }

  @Post('connectors')
  @RequirePermissions('eip:config')
  registerConnector(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipCreateConnectorDto) {
    return this.connectors.register(user.organizationId, user.id, dto.connectorKey, dto.name, dto.protocol, dto);
  }

  @Post('connectors/:connectorKey/activate')
  @RequirePermissions('eip:config')
  activateConnector(@CurrentUser() user: { organizationId: string; id: string }, @Param('connectorKey') connectorKey: string) {
    return this.connectors.activate(user.organizationId, user.id, connectorKey);
  }

  @Post('connectors/:connectorKey/invoke')
  @RequirePermissions('eip:execute')
  invokeConnector(@CurrentUser() user: { organizationId: string }, @Param('connectorKey') connectorKey: string, @Body() dto: EipInvokeConnectorDto) {
    return this.connectors.invoke(user.organizationId, connectorKey, dto.payload);
  }

  @Get('connectors/eih')
  @RequirePermissions('eip:read')
  eihConnectors(@CurrentUser() user: { organizationId: string }) {
    return this.connectors.listEihConnectors(user.organizationId);
  }

  @Get('messaging/slots')
  @RequirePermissions('eip:read')
  messagingSlots() {
    return this.messaging.slots();
  }

  @Get('messaging/providers')
  @RequirePermissions('eip:read')
  messagingProviders(@CurrentUser() user: { organizationId: string }) {
    return this.messaging.list(user.organizationId);
  }

  @Post('messaging/providers')
  @RequirePermissions('eip:config')
  configureMessaging(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipConfigureMessagingDto) {
    return this.messaging.configure(user.organizationId, user.id, dto.providerKey, dto.providerType, dto.name, dto.config, dto.isPrimary ?? false);
  }

  @Post('messaging/providers/:providerKey/activate')
  @RequirePermissions('eip:config')
  activateMessaging(@CurrentUser() user: { organizationId: string; id: string }, @Param('providerKey') providerKey: string) {
    return this.messaging.activate(user.organizationId, user.id, providerKey);
  }

  @Post('messaging/publish')
  @RequirePermissions('eip:execute')
  messagingPublish(@CurrentUser() user: { organizationId: string }, @Body() dto: EipMessagingPublishDto) {
    return this.messaging.publish(user.organizationId, dto.topic, dto.payload);
  }

  @Get('monitoring/dashboard')
  @RequirePermissions('eip:read')
  monitoringDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.dashboard(user.organizationId);
  }

  @Get('monitoring/invocations')
  @RequirePermissions('eip:read')
  invocations(@CurrentUser() user: { organizationId: string }, @Query('channel') channel?: string) {
    return this.monitoring.invocations(user.organizationId, channel);
  }

  @Get('monitoring/errors')
  @RequirePermissions('eip:read')
  errors(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.errors(user.organizationId);
  }

  @Get('monitoring/snapshots')
  @RequirePermissions('eip:read')
  snapshots(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.snapshots(user.organizationId);
  }

  @Get('bridge/targets')
  @RequirePermissions('eip:read')
  bridgeTargets() {
    return this.bridge.externalTargets();
  }

  @Post('bridge/event')
  @RequirePermissions('eip:execute')
  bridgeEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipBridgeEventDto) {
    return this.bridge.bridgeModuleEvent(user.organizationId, dto.moduleRef, dto.eventType, dto.payload, user.id);
  }

  @Post('bridge/flows/:flowKey')
  @RequirePermissions('eip:execute')
  bridgeFlow(@CurrentUser() user: { organizationId: string }, @Param('flowKey') flowKey: string, @Body() dto: EipBridgeFlowDto) {
    return this.bridge.bridgeEihFlow(user.organizationId, flowKey, dto.data);
  }

  @Get('mobile/status')
  @RequirePermissions('eip:read')
  mobileStatus(@CurrentUser() user: { organizationId: string }) {
    return this.offline.mobileStatus(user.organizationId);
  }

  @Post('offline/batches')
  @RequirePermissions('eip:execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EipOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as Array<{ type: 'status_check' | 'error_ack'; payload: Record<string, unknown> }>);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('eip:execute')
  syncOffline(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
