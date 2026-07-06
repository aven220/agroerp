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
import { ApiRegistryService } from '../application/api-registry.service';
import { ApiVersioningService } from '../application/api-versioning.service';
import { ApiDiscoveryService } from '../application/api-discovery.service';
import { ApiClientService } from '../application/api-client.service';
import { ApiKeyService } from '../application/api-key.service';
import { ApiConnectorService } from '../application/api-connector.service';
import { ApiHealthService } from '../application/api-health.service';
import { ApiAnalyticsService } from '../application/api-analytics.service';
import { ApiOpenApiService } from '../application/api-openapi.service';
import { ApiDeveloperPortalService } from '../application/api-developer-portal.service';
import {
  CreateApiClientDto,
  CreateApiConnectorDto,
  CreateApiDefinitionDto,
  CreateApiKeyDto,
  CreateApiRouteDto,
  CreateApiVersionDto,
  UpdateApiClientStatusDto,
} from './eamip.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';

@ApiTags('EAMIP — API Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eamip')
export class EamipController {
  constructor(
    private readonly registry: ApiRegistryService,
    private readonly versioning: ApiVersioningService,
    private readonly discoveryService: ApiDiscoveryService,
    private readonly clients: ApiClientService,
    private readonly keys: ApiKeyService,
    private readonly connectors: ApiConnectorService,
    private readonly health: ApiHealthService,
    private readonly analytics: ApiAnalyticsService,
    private readonly openApi: ApiOpenApiService,
    private readonly portal: ApiDeveloperPortalService,
  ) {}

  @Get('center')
  @RequirePermissions('api:read')
  async center(@CurrentUser() user: { id: string; organizationId: string }) {
    const [apis, metrics, connectors, health] = await Promise.all([
      this.registry.findAll(user.organizationId),
      this.analytics.getDashboard(user.organizationId),
      this.connectors.findAll(user.organizationId),
      this.health.latestSnapshots(user.organizationId, 10),
    ]);
    return {
      apiCount: apis.length,
      publishedCount: apis.filter((a) => a.status === 'published').length,
      connectorCount: connectors.length,
      metrics,
      health,
      discoveredModules: this.discoveryService.discover().length,
    };
  }

  @Get('catalog')
  @RequirePermissions('api:read')
  catalog(@CurrentUser() user: { organizationId: string }, @Query('domain') domain?: string, @Query('status') status?: string) {
    return this.registry.findAll(user.organizationId, { domain, status });
  }

  @Get('discovery')
  @RequirePermissions('api:read')
  listDiscovery() {
    return this.discoveryService.discover();
  }

  @Post('apis')
  @RequirePermissions('api:configure')
  createApi(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateApiDefinitionDto) {
    return this.registry.create(user.organizationId, user.id, dto);
  }

  @Get('apis/:id')
  @RequirePermissions('api:read')
  getApi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.registry.findOne(user.organizationId, id);
  }

  @Post('apis/:id/publish')
  @RequirePermissions('api:publish')
  publishApi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.registry.publish(user.organizationId, id);
  }

  @Post('apis/:id/unpublish')
  @RequirePermissions('api:publish')
  unpublishApi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.registry.unpublish(user.organizationId, id);
  }

  @Post('apis/:id/deprecate')
  @RequirePermissions('api:publish')
  deprecateApi(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.registry.deprecate(user.organizationId, id);
  }

  @Post('apis/:id/routes')
  @RequirePermissions('api:configure')
  addRoute(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateApiRouteDto,
  ) {
    return this.registry.addRoute(user.organizationId, id, dto);
  }

  @Get('apis/:id/versions')
  @RequirePermissions('api:read')
  listVersions(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.versioning.listVersions(user.organizationId, id);
  }

  @Post('apis/:id/versions')
  @RequirePermissions('api:configure')
  createVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateApiVersionDto,
  ) {
    return this.versioning.createVersion(user.organizationId, id, user.id, dto);
  }

  @Post('apis/:apiId/versions/:version/publish')
  @RequirePermissions('api:publish')
  publishVersion(
    @CurrentUser() user: { organizationId: string },
    @Param('apiId') apiId: string,
    @Param('version') version: string,
  ) {
    return this.versioning.publishVersion(user.organizationId, apiId, version);
  }

  @Get('apis/:id/openapi')
  @RequirePermissions('api:read')
  openApiSpec(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.openApi.buildSpec(user.organizationId, id);
  }

  @Get('clients')
  @RequirePermissions('api:client:read')
  listClients(@CurrentUser() user: { organizationId: string }) {
    return this.clients.findAll(user.organizationId);
  }

  @Post('clients')
  @RequirePermissions('api:client:manage')
  createClient(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreateApiClientDto) {
    return this.clients.create(user.organizationId, user.id, dto);
  }

  @Patch('clients/:id/status')
  @RequirePermissions('api:client:manage')
  updateClientStatus(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateApiClientStatusDto,
  ) {
    return this.clients.updateStatus(user.organizationId, id, dto.status);
  }

  @Post('clients/:id/keys')
  @RequirePermissions('api:key:manage')
  createKey(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') clientId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.keys.generate(
      user.organizationId,
      clientId,
      user.id,
      dto.name,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  @Get('connectors')
  @RequirePermissions('api:connector:read')
  listConnectors(@CurrentUser() user: { organizationId: string }) {
    return this.connectors.findAll(user.organizationId);
  }

  @Post('connectors')
  @RequirePermissions('api:connector:manage')
  createConnector(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateApiConnectorDto,
  ) {
    return this.connectors.create(user.organizationId, user.id, dto);
  }

  @Post('connectors/:id/health')
  @RequirePermissions('api:read')
  checkConnectorHealth(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.health.checkConnector(user.organizationId, id);
  }

  @Get('metrics')
  @RequirePermissions('api:metrics:read')
  metrics(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.getDashboard(user.organizationId);
  }

  @Get('clients/:id/history')
  @RequirePermissions('api:metrics:read')
  clientHistory(@CurrentUser() user: { organizationId: string }, @Param('id') clientId: string) {
    return this.analytics.clientHistory(user.organizationId, clientId);
  }

  @Get('developer-portal')
  @RequirePermissions('api:developer:portal')
  @ApiOperation({ summary: 'Portal para desarrolladores' })
  developerPortal(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.portal.getPortal(user.organizationId, user.id);
  }
}
