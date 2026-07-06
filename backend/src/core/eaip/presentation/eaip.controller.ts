import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EaipAnalyticsService, EaipTwinService } from '../application/eaip-twin.service';
import { EaipAssistantService } from '../application/eaip-assistant.service';
import { EaipAuditService } from '../application/eaip-audit.service';
import { EaipBridgeService, EaipDashboardService, EaipOfflineService } from '../application/eaip-dashboard.service';
import { EaipEngineService } from '../application/eaip-engine.service';
import { EaipModelService } from '../application/eaip-model.service';
import { EaipPredictionService } from '../application/eaip-prediction.service';
import { EaipRecommendationService } from '../application/eaip-recommendation.service';
import { EaipSimulationService } from '../application/eaip-simulation.service';
import {
  EaipAssistantMessageDto, EaipAssistantSessionDto, EaipBridgeDto, EaipModelDto,
  EaipOfflineBatchDto, EaipPredictionDto, EaipRecommendationDto, EaipSimulationDto,
  EaipTwinDto, EaipTwinSyncDto,
} from './eaip.dto';

@ApiTags('EAIP — Enterprise Agricultural Intelligence Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eaip')
export class EaipController {
  constructor(
    private readonly engine: EaipEngineService,
    private readonly dashboard: EaipDashboardService,
    private readonly models: EaipModelService,
    private readonly prediction: EaipPredictionService,
    private readonly recommendation: EaipRecommendationService,
    private readonly simulation: EaipSimulationService,
    private readonly twin: EaipTwinService,
    private readonly assistant: EaipAssistantService,
    private readonly analytics: EaipAnalyticsService,
    private readonly bridge: EaipBridgeService,
    private readonly offline: EaipOfflineService,
    private readonly audit: EaipAuditService,
  ) {}

  @Get('center') @RequirePermissions('eaip:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('eaip:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('eaip:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('eaip:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('models') @RequirePermissions('eaip:read')
  modelList(@CurrentUser() user: { organizationId: string }, @Query('serviceType') serviceType?: string) {
    return this.models.list(user.organizationId, serviceType);
  }

  @Post('models') @RequirePermissions('eaip:config')
  registerModel(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipModelDto) {
    return this.models.register(user.organizationId, user.id, dto);
  }

  @Post('models/:modelKey/activate') @RequirePermissions('eaip:config')
  activateModel(@CurrentUser() user: { organizationId: string; id: string }, @Param('modelKey') modelKey: string) {
    return this.models.activate(user.organizationId, user.id, modelKey);
  }

  @Post('models/:modelKey/deactivate') @RequirePermissions('eaip:config')
  deactivateModel(@CurrentUser() user: { organizationId: string; id: string }, @Param('modelKey') modelKey: string) {
    return this.models.deactivate(user.organizationId, user.id, modelKey);
  }

  @Get('models/executions') @RequirePermissions('eaip:read')
  executions(@CurrentUser() user: { organizationId: string }) {
    return this.models.listExecutions(user.organizationId);
  }

  @Get('predictions') @RequirePermissions('eaip:read')
  predictions(@CurrentUser() user: { organizationId: string }, @Query('serviceType') serviceType?: string) {
    return this.prediction.list(user.organizationId, serviceType);
  }

  @Post('predictions') @RequirePermissions('eaip:execute')
  runPrediction(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipPredictionDto) {
    return this.prediction.runPrediction(user.organizationId, user.id, dto);
  }

  @Get('recommendations') @RequirePermissions('eaip:read')
  recommendations(@CurrentUser() user: { organizationId: string }, @Query('category') category?: string) {
    return this.recommendation.list(user.organizationId, category);
  }

  @Post('recommendations') @RequirePermissions('eaip:execute')
  generateRecommendation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipRecommendationDto) {
    return this.recommendation.generate(user.organizationId, user.id, dto);
  }

  @Get('simulations') @RequirePermissions('eaip:read')
  simulations(@CurrentUser() user: { organizationId: string }) {
    return this.simulation.list(user.organizationId);
  }

  @Post('simulations') @RequirePermissions('eaip:execute')
  runSimulation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipSimulationDto) {
    return this.simulation.create(user.organizationId, user.id, dto);
  }

  @Get('simulations/:simulationKey/compare') @RequirePermissions('eaip:read')
  compareSimulation(@CurrentUser() user: { organizationId: string }, @Param('simulationKey') simulationKey: string) {
    return this.simulation.compare(user.organizationId, simulationKey);
  }

  @Get('twins') @RequirePermissions('eaip:read')
  twins(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.twin.list(user.organizationId, entityType);
  }

  @Post('twins') @RequirePermissions('eaip:config')
  registerTwin(@CurrentUser() user: { organizationId: string }, @Body() dto: EaipTwinDto) {
    return this.twin.register(user.organizationId, dto);
  }

  @Post('twins/:twinKey/sync') @RequirePermissions('eaip:execute')
  syncTwin(@CurrentUser() user: { organizationId: string; id: string }, @Param('twinKey') twinKey: string, @Body() dto: EaipTwinSyncDto) {
    return this.twin.sync(user.organizationId, user.id, twinKey, dto);
  }

  @Get('assistant/sessions') @RequirePermissions('eaip:read')
  assistantSessions(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.assistant.listSessions(user.organizationId, user.id);
  }

  @Post('assistant/sessions') @RequirePermissions('eaip:execute')
  createSession(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipAssistantSessionDto) {
    return this.assistant.createSession(user.organizationId, user.id, dto.title);
  }

  @Post('assistant/sessions/:sessionKey/messages') @RequirePermissions('eaip:execute')
  sendMessage(@CurrentUser() user: { organizationId: string; id: string }, @Param('sessionKey') sessionKey: string, @Body() dto: EaipAssistantMessageDto) {
    return this.assistant.sendMessage(user.organizationId, user.id, sessionKey, dto.content);
  }

  @Get('assistant/sessions/:sessionKey/messages') @RequirePermissions('eaip:read')
  getMessages(@CurrentUser() user: { organizationId: string }, @Param('sessionKey') sessionKey: string) {
    return this.assistant.getMessages(user.organizationId, sessionKey);
  }

  @Get('analytics/snapshots') @RequirePermissions('eaip:read')
  analyticsSnapshots(@CurrentUser() user: { organizationId: string }, @Query('category') category?: string) {
    return this.analytics.listSnapshots(user.organizationId, category);
  }

  @Get('analytics/productivity') @RequirePermissions('eaip:read')
  productivity(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.productivityIndicators(user.organizationId);
  }

  @Post('bridge') @RequirePermissions('eaip:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('eaip:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches') @RequirePermissions('eaip:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EaipOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('eaip:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
