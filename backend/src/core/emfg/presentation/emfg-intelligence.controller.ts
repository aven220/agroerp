import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmfgIntelligenceScope } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgIntelligenceIndicatorsService } from '../application/emfg-intelligence-indicators.service';
import { EmfgIntelligenceOeeService } from '../application/emfg-intelligence-oee.service';
import { EmfgIntelligenceKpiService } from '../application/emfg-intelligence-kpi.service';
import { EmfgIntelligenceAnalyticsService } from '../application/emfg-intelligence-analytics.service';
import { EmfgIntelligenceSimulationService } from '../application/emfg-intelligence-simulation.service';
import { EmfgIntelligenceEngineService } from '../application/emfg-intelligence-engine.service';
import { EmfgIntelligenceExportService } from '../application/emfg-intelligence-export.service';
import { EmfgIntelligenceAiBridgeService } from '../application/emfg-intelligence-ai-bridge.service';
import { EmfgIntelligenceIntegrationService } from '../application/emfg-intelligence-integration.service';
import {
  EmfgIntelligenceAiRequestDto,
  EmfgIntelligenceCompareDto,
  EmfgIntelligenceExportDto,
  EmfgIntelligenceSimulationDto,
} from './emfg-intelligence.dto';

@ApiTags('EMFG — Centro de Inteligencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg/intelligence')
export class EmfgIntelligenceController {
  constructor(
    private readonly indicators: EmfgIntelligenceIndicatorsService,
    private readonly oee: EmfgIntelligenceOeeService,
    private readonly kpi: EmfgIntelligenceKpiService,
    private readonly analytics: EmfgIntelligenceAnalyticsService,
    private readonly simulation: EmfgIntelligenceSimulationService,
    private readonly engine: EmfgIntelligenceEngineService,
    private readonly exportSvc: EmfgIntelligenceExportService,
    private readonly aiBridge: EmfgIntelligenceAiBridgeService,
    private readonly integration: EmfgIntelligenceIntegrationService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('manufacturing:intelligence')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('executive')
  @RequirePermissions('manufacturing:intelligence')
  executive(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.executiveDashboard(user.organizationId);
  }

  @Get('oee')
  @RequirePermissions('manufacturing:intelligence')
  oeeList(
    @CurrentUser() user: { organizationId: string },
    @Query('scope') scope?: EmfgIntelligenceScope,
    @Query('entityKey') entityKey?: string,
  ) {
    return this.oee.list(user.organizationId, scope, entityKey);
  }

  @Get('oee/history')
  @RequirePermissions('manufacturing:intelligence')
  oeeHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('entityKey') entityKey: string,
  ) {
    return this.oee.history(user.organizationId, entityKey);
  }

  @Get('oee/comparatives')
  @RequirePermissions('manufacturing:intelligence')
  oeeComparatives(@CurrentUser() user: { organizationId: string }) {
    return this.oee.comparatives(user.organizationId);
  }

  @Get('kpis')
  @RequirePermissions('manufacturing:intelligence')
  kpis(@CurrentUser() user: { organizationId: string }) {
    return this.kpi.current(user.organizationId);
  }

  @Get('kpis/history')
  @RequirePermissions('manufacturing:intelligence')
  kpiHistory(@CurrentUser() user: { organizationId: string }) {
    return this.kpi.history(user.organizationId);
  }

  @Get('analytics')
  @RequirePermissions('manufacturing:intelligence')
  analyticsPanel(
    @CurrentUser() user: { organizationId: string; id: string },
    @Query('centerKey') centerKey?: string,
    @Query('lineKey') lineKey?: string,
  ) {
    return this.analytics.analyze(user.organizationId, user.id, { centerKey, lineKey });
  }

  @Get('alerts')
  @RequirePermissions('manufacturing:intelligence')
  alerts(
    @CurrentUser() user: { organizationId: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.indicators.alerts(user.organizationId, unreadOnly === 'true');
  }

  @Post('alerts/:alertKey/read')
  @RequirePermissions('manufacturing:intelligence')
  markAlertRead(
    @CurrentUser() user: { organizationId: string },
    @Param('alertKey') alertKey: string,
  ) {
    return this.integration.markAlertRead(user.organizationId, alertKey);
  }

  @Get('simulations')
  @RequirePermissions('manufacturing:intelligence')
  listSimulations(
    @CurrentUser() user: { organizationId: string },
    @Query('authorizedOnly') authorizedOnly?: string,
  ) {
    return this.simulation.list(user.organizationId, authorizedOnly === 'true');
  }

  @Get('simulations/authorized')
  @RequirePermissions('manufacturing:intelligence')
  authorizedSimulations(@CurrentUser() user: { organizationId: string }) {
    return this.simulation.list(user.organizationId, true);
  }

  @Get('simulations/:simulationKey')
  @RequirePermissions('manufacturing:intelligence')
  getSimulation(
    @CurrentUser() user: { organizationId: string },
    @Param('simulationKey') simulationKey: string,
  ) {
    return this.simulation.get(user.organizationId, simulationKey);
  }

  @Post('simulations')
  @RequirePermissions('manufacturing:intelligence')
  createSimulation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgIntelligenceSimulationDto,
  ) {
    return this.simulation.create(user.organizationId, user.id, dto);
  }

  @Post('simulations/:simulationKey/run')
  @RequirePermissions('manufacturing:intelligence')
  async runSimulation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('simulationKey') simulationKey: string,
  ) {
    const result = await this.simulation.run(user.organizationId, user.id, simulationKey);
    await this.integration.onSimulationRun(user.organizationId, simulationKey);
    return result;
  }

  @Post('simulations/compare')
  @RequirePermissions('manufacturing:intelligence')
  compareSimulations(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgIntelligenceCompareDto,
  ) {
    return this.simulation.compare(user.organizationId, user.id, dto.simulationKeys);
  }

  @Post('simulations/:simulationKey/authorize')
  @RequirePermissions('manufacturing:intelligence')
  authorizeSimulation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('simulationKey') simulationKey: string,
  ) {
    return this.simulation.authorize(user.organizationId, user.id, simulationKey);
  }

  @Post('aggregate')
  @RequirePermissions('manufacturing:intelligence')
  aggregate(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.runFullAggregation(user.organizationId, user.id);
  }

  @Post('oee/compute')
  @RequirePermissions('manufacturing:intelligence')
  async computeOee(@CurrentUser() user: { organizationId: string; id: string }) {
    const snapshots = await this.oee.computeAll(user.organizationId, user.id);
    await this.integration.onOeeComputed(user.organizationId, snapshots.length);
    return snapshots;
  }

  @Post('export')
  @RequirePermissions('manufacturing:intelligence')
  export(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgIntelligenceExportDto,
  ) {
    return this.exportSvc.export(user.organizationId, user.id, dto.exportType, dto.format, dto.payload);
  }

  @Get('history/queries')
  @RequirePermissions('manufacturing:intelligence')
  queryHistory(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.queryHistory(user.organizationId);
  }

  @Get('history/exports')
  @RequirePermissions('manufacturing:intelligence')
  exportHistory(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.exportHistory(user.organizationId);
  }

  @Get('ai/capabilities')
  @RequirePermissions('manufacturing:intelligence')
  aiCapabilities(@CurrentUser() user: { organizationId: string }) {
    return this.aiBridge.listCapabilities(user.organizationId);
  }

  @Post('ai/:capability/request')
  @RequirePermissions('manufacturing:intelligence')
  aiRequest(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('capability') capability: string,
    @Body() dto: EmfgIntelligenceAiRequestDto,
  ) {
    return this.aiBridge.requestCapability(
      user.organizationId,
      user.id,
      capability as Parameters<EmfgIntelligenceAiBridgeService['requestCapability']>[2],
      dto.payload,
    );
  }
}
