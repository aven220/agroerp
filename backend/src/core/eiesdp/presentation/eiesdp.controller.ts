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
import { EiesdpDeviceDefinition } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { DeviceRegistryService } from '../application/device-registry.service';
import { DeviceTelemetryService } from '../application/device-telemetry.service';
import { DeviceDigitalTwinService } from '../application/device-digital-twin.service';
import { DeviceAlertService } from '../application/device-alert.service';
import { DeviceSecurityService } from '../application/device-security.service';
import { DeviceFirmwareService } from '../application/device-firmware.service';
import { DeviceEdgeService } from '../application/device-edge.service';
import { DeviceIngestGatewayService } from '../application/device-ingest.gateway';
import { DeviceMetricsService } from '../application/device-metrics.service';
import { DeviceAiService } from '../application/device-ai.service';
import { DeviceAuditService } from '../application/device-audit.service';
import { DeviceDriverService } from '../application/device-driver.service';
import {
  AssignDeviceDto,
  CreateDeviceGroupDto,
  CreateFirmwareReleaseDto,
  DeviceCommandDto,
  IngestBatchDto,
  IngestTelemetryDto,
  RegisterDeviceDto,
  RegisterGatewayDto,
  TagDeviceDto,
  UpdateTwinDesiredDto,
} from './eiesdp.dto';

@ApiTags('EIESDP — Enterprise IoT, Edge & Smart Devices Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eiesdp')
export class EiesdpController {
  constructor(
    private readonly registry: DeviceRegistryService,
    private readonly telemetry: DeviceTelemetryService,
    private readonly twin: DeviceDigitalTwinService,
    private readonly alerts: DeviceAlertService,
    private readonly security: DeviceSecurityService,
    private readonly firmware: DeviceFirmwareService,
    private readonly edge: DeviceEdgeService,
    private readonly ingest: DeviceIngestGatewayService,
    private readonly metrics: DeviceMetricsService,
    private readonly ai: DeviceAiService,
    private readonly auditService: DeviceAuditService,
    private readonly drivers: DeviceDriverService,
  ) {}

  @Get('center')
  @RequirePermissions('iot:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, suggestions, devices] = await Promise.all([
      this.metrics.dashboard(user.organizationId),
      this.ai.analyze(user.organizationId),
      this.registry.findAll(user.organizationId),
    ]);
    return { dashboard, suggestions, devices };
  }

  @Get('devices')
  @RequirePermissions('iot:read')
  listDevices(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('deviceType') deviceType?: string,
    @Query('groupKey') groupKey?: string,
  ) {
    return this.registry.findAll(user.organizationId, { status, deviceType, groupKey });
  }

  @Get('devices/map')
  @RequirePermissions('iot:read')
  mapDevices(@CurrentUser() user: { organizationId: string }) {
    return this.registry.mapDevices(user.organizationId);
  }

  @Get('devices/:deviceKey')
  @RequirePermissions('iot:read')
  getDevice(@CurrentUser() user: { organizationId: string }, @Param('deviceKey') deviceKey: string) {
    return this.registry.findOne(user.organizationId, deviceKey);
  }

  @Post('devices')
  @RequirePermissions('iot:register')
  registerDevice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.registry.register(user.organizationId, user.id, dto as EiesdpDeviceDefinition);
  }

  @Post('devices/:deviceKey/activate')
  @RequirePermissions('iot:update')
  activate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('deviceKey') deviceKey: string,
  ) {
    return this.registry.activate(user.organizationId, user.id, deviceKey);
  }

  @Post('devices/:deviceKey/deactivate')
  @RequirePermissions('iot:update')
  deactivate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('deviceKey') deviceKey: string,
  ) {
    return this.registry.deactivate(user.organizationId, user.id, deviceKey);
  }

  @Post('devices/:deviceKey/revoke')
  @RequirePermissions('iot:revoke')
  async revoke(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('deviceKey') deviceKey: string,
  ) {
    const device = await this.registry.findOne(user.organizationId, deviceKey);
    return this.security.revokeDevice(user.organizationId, device.id);
  }

  @Patch('devices/:deviceKey/assign')
  @RequirePermissions('iot:update')
  assign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('deviceKey') deviceKey: string,
    @Body() dto: AssignDeviceDto,
  ) {
    return this.registry.assign(user.organizationId, user.id, deviceKey, dto);
  }

  @Patch('devices/:deviceKey/tags')
  @RequirePermissions('iot:update')
  tag(
    @CurrentUser() user: { organizationId: string },
    @Param('deviceKey') deviceKey: string,
    @Body() dto: TagDeviceDto,
  ) {
    return this.registry.tag(user.organizationId, deviceKey, dto.tags);
  }

  @Post('devices/:deviceKey/rotate-credentials')
  @RequirePermissions('iot:admin')
  async rotateCredentials(
    @CurrentUser() user: { organizationId: string },
    @Param('deviceKey') deviceKey: string,
  ) {
    const device = await this.registry.findOne(user.organizationId, deviceKey);
    return this.security.rotateCredentials(device.id);
  }

  @Get('groups')
  @RequirePermissions('iot:read')
  listGroups(@CurrentUser() user: { organizationId: string }) {
    return this.registry.listGroups(user.organizationId);
  }

  @Post('groups')
  @RequirePermissions('iot:register')
  createGroup(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateDeviceGroupDto,
  ) {
    return this.registry.createGroup(user.organizationId, dto);
  }

  @Get('telemetry')
  @RequirePermissions('iot:telemetry:read')
  listTelemetry(
    @CurrentUser() user: { organizationId: string },
    @Query('deviceKey') deviceKey?: string,
  ) {
    return this.telemetry.listReadings(user.organizationId, deviceKey);
  }

  @Get('telemetry/dashboard')
  @RequirePermissions('iot:telemetry:read')
  telemetryDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.telemetry.dashboardMetrics(user.organizationId);
  }

  @Post('ingest/http')
  @RequirePermissions('iot:control')
  ingestHttp(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: IngestTelemetryDto,
  ) {
    return this.ingest.ingestHttp(user.organizationId, dto);
  }

  @Post('ingest/batch')
  @RequirePermissions('iot:control')
  ingestBatch(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: IngestBatchDto,
  ) {
    return this.ingest.ingestHttpBatch(user.organizationId, dto.readings);
  }

  @Post('ingest/mqtt')
  @RequirePermissions('iot:control')
  ingestMqtt(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: { topic: string; payload: Record<string, unknown> },
  ) {
    return this.ingest.ingestMqttRelay(user.organizationId, dto.topic, dto.payload);
  }

  @Post('ingest/websocket')
  @RequirePermissions('iot:control')
  ingestWs(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: IngestTelemetryDto,
  ) {
    return this.ingest.ingestWebSocket(user.organizationId, dto);
  }

  @Post('devices/:deviceKey/command')
  @RequirePermissions('iot:control')
  sendCommand(
    @CurrentUser() user: { organizationId: string },
    @Param('deviceKey') deviceKey: string,
    @Body() dto: DeviceCommandDto,
  ) {
    return this.ingest.sendCommand(user.organizationId, deviceKey, dto.command);
  }

  @Get('protocols/amqp')
  @RequirePermissions('iot:read')
  amqpInfo() {
    return this.ingest.amqpReady();
  }

  @Get('protocols/grpc')
  @RequirePermissions('iot:read')
  grpcInfo() {
    return this.ingest.grpcReady();
  }

  @Get('twins/:deviceKey')
  @RequirePermissions('iot:read')
  async getTwin(
    @CurrentUser() user: { organizationId: string },
    @Param('deviceKey') deviceKey: string,
  ) {
    const device = await this.registry.findOne(user.organizationId, deviceKey);
    return this.twin.getTwin(device.id);
  }

  @Patch('twins/:deviceKey/desired')
  @RequirePermissions('iot:control')
  async setDesired(
    @CurrentUser() user: { organizationId: string },
    @Param('deviceKey') deviceKey: string,
    @Body() dto: UpdateTwinDesiredDto,
  ) {
    const device = await this.registry.findOne(user.organizationId, deviceKey);
    return this.twin.updateDesired(device.id, dto.desired);
  }

  @Get('alerts')
  @RequirePermissions('iot:read')
  listAlerts(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.alerts.findAll(user.organizationId, all !== 'true');
  }

  @Post('alerts/:id/acknowledge')
  @RequirePermissions('iot:update')
  acknowledgeAlert(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.alerts.acknowledge(user.organizationId, id);
  }

  @Get('events')
  @RequirePermissions('iot:telemetry:read')
  listEvents(
    @CurrentUser() user: { organizationId: string },
    @Query('deviceKey') deviceKey?: string,
  ) {
    return this.alerts.listEvents(user.organizationId, deviceKey);
  }

  @Get('firmware')
  @RequirePermissions('iot:firmware:manage')
  listFirmware(@CurrentUser() user: { organizationId: string }) {
    return this.firmware.listReleases(user.organizationId);
  }

  @Post('firmware')
  @RequirePermissions('iot:firmware:manage')
  createFirmware(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateFirmwareReleaseDto,
  ) {
    return this.firmware.createRelease(user.organizationId, dto);
  }

  @Post('firmware/:releaseId/deploy/:deviceKey')
  @RequirePermissions('iot:firmware:manage')
  async deployFirmware(
    @CurrentUser() user: { organizationId: string },
    @Param('releaseId') releaseId: string,
    @Param('deviceKey') deviceKey: string,
  ) {
    const device = await this.registry.findOne(user.organizationId, deviceKey);
    return this.firmware.deploy(user.organizationId, releaseId, device.id);
  }

  @Get('edge/gateways')
  @RequirePermissions('iot:edge:manage')
  listGateways(@CurrentUser() user: { organizationId: string }) {
    return this.edge.listGateways(user.organizationId);
  }

  @Post('edge/gateways')
  @RequirePermissions('iot:edge:manage')
  registerGateway(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: RegisterGatewayDto,
  ) {
    return this.edge.registerGateway(user.organizationId, dto);
  }

  @Post('edge/gateways/:id/sync')
  @RequirePermissions('iot:edge:manage')
  syncGateway(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.edge.syncBuffer(user.organizationId, id);
  }

  @Get('drivers')
  @RequirePermissions('iot:read')
  listDrivers() {
    return this.drivers.findAll();
  }

  @Get('audit')
  @RequirePermissions('iot:audit:read')
  listAudit(
    @CurrentUser() user: { organizationId: string },
    @Query('deviceKey') deviceKey?: string,
  ) {
    return this.auditService.findAll(user.organizationId, deviceKey);
  }

  @Get('ai/analysis')
  @RequirePermissions('iot:read')
  aiAnalysis(@CurrentUser() user: { organizationId: string }) {
    return this.ai.analyze(user.organizationId);
  }

  @Get('mobile/devices')
  @ApiOperation({ summary: 'Dispositivos para app móvil' })
  @RequirePermissions('iot:read')
  async mobileDevices(@CurrentUser() user: { organizationId: string }) {
    const devices = await this.registry.findAll(user.organizationId, { status: 'active' });
    return {
      devices: devices.map((d) => ({
        deviceKey: d.deviceKey,
        name: d.name,
        deviceType: d.deviceType,
        protocol: d.protocol,
        batteryLevel: d.batteryLevel,
        lastSeenAt: d.lastSeenAt,
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('mobile/telemetry')
  @ApiOperation({ summary: 'Telemetría reciente móvil' })
  @RequirePermissions('iot:telemetry:read')
  async mobileTelemetry(@CurrentUser() user: { organizationId: string }) {
    const readings = await this.telemetry.listReadings(user.organizationId, undefined, 50);
    return readings;
  }
}
