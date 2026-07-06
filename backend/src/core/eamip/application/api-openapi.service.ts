import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiOpenApiService {
  constructor(private readonly prisma: PrismaService) {}

  async buildSpec(organizationId: string, apiDefinitionId: string) {
    const api = await this.prisma.apiDefinition.findFirst({
      where: { id: apiDefinitionId, organizationId },
      include: { routes: { where: { isActive: true } }, versions: { where: { status: 'published' } } },
    });
    if (!api) return null;

    const paths: Record<string, Record<string, unknown>> = {};
    for (const route of api.routes) {
      const key = route.path.replace(/:([^/]+)/g, '{$1}');
      paths[key] ??= {};
      paths[key][route.method.toLowerCase()] = {
        summary: route.routeKey,
        operationId: route.routeKey,
        tags: [api.domain],
        responses: { '200': { description: 'OK' } },
      };
    }

    return {
      openapi: '3.0.3',
      info: {
        title: api.name,
        version: api.versions[0]?.version ?? 'v1',
        description: api.description ?? undefined,
      },
      servers: [{ url: `/gateway/v1/${api.apiKey}` }],
      paths,
      components: {
        securitySchemes: {
          ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    };
  }
}
