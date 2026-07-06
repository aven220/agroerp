import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EffmAuditService } from '../application/effm-audit.service';
import { EffmBridgeService, EffmDashboardService, EffmOfflineService, EffmPerformanceService } from '../application/effm-dashboard.service';
import { EffmEngineService } from '../application/effm-engine.service';
import { EffmFuelService } from '../application/effm-fuel.service';
import { EffmImplementService, EffmMachineService } from '../application/effm-machine.service';
import { EffmOperationService } from '../application/effm-operation.service';
import { EffmTelemetryService } from '../application/effm-telemetry.service';
import {
  EffmAutoLaborDto, EffmBridgeDto, EffmCouplingDto, EffmFuelDto, EffmImplementDto,
  EffmIncidentDto, EffmMachineDto, EffmOfflineBatchDto, EffmOperationEndDto,
  EffmOperationStartDto, EffmOperatorAssignmentDto, EffmTelemetryConfigDto, EffmTelemetryIngestDto,
} from './effm.dto';

@ApiTags('EFFM — Enterprise Farm Fleet Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('effm')
export class EffmController {
  constructor(
    private readonly engine: EffmEngineService,
    private readonly dashboard: EffmDashboardService,
    private readonly machine: EffmMachineService,
    private readonly implement: EffmImplementService,
    private readonly operation: EffmOperationService,
    private readonly fuel: EffmFuelService,
    private readonly telemetry: EffmTelemetryService,
    private readonly performance: EffmPerformanceService,
    private readonly bridge: EffmBridgeService,
    private readonly offline: EffmOfflineService,
    private readonly audit: EffmAuditService,
  ) {}

  @Get('center') @RequirePermissions('effm:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap') @RequirePermissions('effm:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('dashboard') @RequirePermissions('effm:read')
  dash(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.dashboard(user.organizationId);
  }

  @Get('audit') @RequirePermissions('effm:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('machines') @RequirePermissions('effm:read')
  machines(@CurrentUser() user: { organizationId: string }, @Query('machineType') machineType?: string) {
    return this.machine.listMachines(user.organizationId, machineType);
  }

  @Post('machines') @RequirePermissions('effm:execute')
  registerMachine(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmMachineDto) {
    return this.machine.registerMachine(user.organizationId, user.id, dto);
  }

  @Get('qr/:qrCode') @RequirePermissions('effm:read')
  resolveQr(@CurrentUser() user: { organizationId: string }, @Param('qrCode') qrCode: string) {
    return this.machine.findByQr(user.organizationId, qrCode);
  }

  @Get('implements') @RequirePermissions('effm:read')
  listImplements(@CurrentUser() user: { organizationId: string }) {
    return this.implement.listImplements(user.organizationId);
  }

  @Post('implements') @RequirePermissions('effm:execute')
  registerImplement(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmImplementDto) {
    return this.implement.registerImplement(user.organizationId, user.id, dto);
  }

  @Post('couplings') @RequirePermissions('effm:execute')
  coupling(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmCouplingDto) {
    return this.implement.coupling(user.organizationId, user.id, dto);
  }

  @Get('couplings/history') @RequirePermissions('effm:read')
  couplingHistory(@CurrentUser() user: { organizationId: string }) {
    return this.implement.listCouplingHistory(user.organizationId);
  }

  @Get('operators/assignments') @RequirePermissions('effm:read')
  assignments(@CurrentUser() user: { organizationId: string }) {
    return this.machine.listAssignments(user.organizationId);
  }

  @Post('operators/assignments') @RequirePermissions('effm:execute')
  assignOperator(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmOperatorAssignmentDto) {
    return this.machine.assignOperator(user.organizationId, user.id, dto);
  }

  @Get('operations') @RequirePermissions('effm:read')
  operations(@CurrentUser() user: { organizationId: string }, @Query('fieldLotId') fieldLotId?: string) {
    return this.operation.listSessions(user.organizationId, fieldLotId);
  }

  @Post('operations/start') @RequirePermissions('effm:execute')
  startOperation(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmOperationStartDto) {
    return this.operation.startOperation(user.organizationId, user.id, dto);
  }

  @Post('operations/:sessionKey/end') @RequirePermissions('effm:execute')
  endOperation(@CurrentUser() user: { organizationId: string; id: string }, @Param('sessionKey') sessionKey: string, @Body() dto: EffmOperationEndDto) {
    return this.operation.endOperation(user.organizationId, user.id, sessionKey, dto);
  }

  @Get('fuel') @RequirePermissions('effm:read')
  fuelRecords(@CurrentUser() user: { organizationId: string }) {
    return this.fuel.list(user.organizationId);
  }

  @Post('fuel') @RequirePermissions('effm:execute')
  recordFuel(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmFuelDto) {
    return this.fuel.recordFuel(user.organizationId, user.id, dto);
  }

  @Get('telemetry/configs') @RequirePermissions('effm:read')
  telemetryConfigs(@CurrentUser() user: { organizationId: string }) {
    return this.telemetry.listConfigs(user.organizationId);
  }

  @Post('telemetry/configs') @RequirePermissions('effm:config')
  registerTelemetry(@CurrentUser() user: { organizationId: string }, @Body() dto: EffmTelemetryConfigDto) {
    return this.telemetry.registerConfig(user.organizationId, dto);
  }

  @Get('telemetry/readings') @RequirePermissions('effm:read')
  telemetryReadings(@CurrentUser() user: { organizationId: string }, @Query('machineId') machineId?: string) {
    return this.telemetry.listReadings(user.organizationId, machineId);
  }

  @Post('telemetry/ingest') @RequirePermissions('effm:execute')
  ingestTelemetry(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmTelemetryIngestDto) {
    return this.telemetry.ingestReading(user.organizationId, user.id, dto);
  }

  @Get('telemetry/alarms') @RequirePermissions('effm:read')
  telemetryAlarms(@CurrentUser() user: { organizationId: string }) {
    return this.telemetry.listAlarms(user.organizationId);
  }

  @Post('auto-labor') @RequirePermissions('effm:execute')
  autoLabor(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmAutoLaborDto) {
    return this.telemetry.syncAutoLabor(user.organizationId, user.id, dto);
  }

  @Get('performance/fleet') @RequirePermissions('effm:read')
  fleetPerformance(@CurrentUser() user: { organizationId: string }) {
    return this.performance.fleetKpis(user.organizationId);
  }

  @Get('performance/machines/:machineKey') @RequirePermissions('effm:read')
  machinePerformance(@CurrentUser() user: { organizationId: string }, @Param('machineKey') machineKey: string) {
    return this.performance.machinePerformance(user.organizationId, machineKey);
  }

  @Get('performance/operators/:employeeRef') @RequirePermissions('effm:read')
  operatorPerformance(@CurrentUser() user: { organizationId: string }, @Param('employeeRef') employeeRef: string) {
    return this.performance.operatorPerformance(user.organizationId, employeeRef);
  }

  @Get('incidents') @RequirePermissions('effm:read')
  incidents(@CurrentUser() user: { organizationId: string }) {
    return this.machine.listIncidents(user.organizationId);
  }

  @Post('incidents') @RequirePermissions('effm:execute')
  recordIncident(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmIncidentDto) {
    return this.machine.recordIncident(user.organizationId, user.id, dto);
  }

  @Post('bridge') @RequirePermissions('effm:execute')
  bridgeModule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync') @RequirePermissions('effm:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }

  @Post('mobile/batches') @RequirePermissions('effm:execute')
  queueBatch(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EffmOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.batchKey, dto.payload);
  }

  @Post('mobile/batches/:batchKey/sync') @RequirePermissions('effm:execute')
  syncBatch(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
