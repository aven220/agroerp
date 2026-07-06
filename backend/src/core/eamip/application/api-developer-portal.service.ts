import { Injectable } from '@nestjs/common';
import { ApiRegistryService } from './api-registry.service';
import { ApiDiscoveryService } from './api-discovery.service';
import { ApiOpenApiService } from './api-openapi.service';
import { ApiAnalyticsService } from './api-analytics.service';
import { ApiClientService } from './api-client.service';

@Injectable()
export class ApiDeveloperPortalService {
  constructor(
    private readonly registry: ApiRegistryService,
    private readonly discovery: ApiDiscoveryService,
    private readonly openApi: ApiOpenApiService,
    private readonly analytics: ApiAnalyticsService,
    private readonly clients: ApiClientService,
  ) {}

  async getPortal(organizationId: string, userId: string) {
    const [catalog, apis, metrics, clientList] = await Promise.all([
      this.discovery.discover(),
      this.registry.findAll(organizationId, { status: 'published' }),
      this.analytics.getDashboard(organizationId),
      this.clients.findAll(organizationId),
    ]);

    const specs = await Promise.all(
      apis.slice(0, 10).map(async (api) => ({
        apiKey: api.apiKey,
        name: api.name,
        spec: await this.openApi.buildSpec(organizationId, api.id),
      })),
    );

    return {
      catalog,
      publishedApis: apis,
      openApiSpecs: specs,
      metrics,
      clients: clientList.filter((c) => c.ownerUserId === userId || c.createdBy === userId),
      authMethods: ['api_key', 'oauth2', 'jwt', 'oidc'],
    };
  }
}
