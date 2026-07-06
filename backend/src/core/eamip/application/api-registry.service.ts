import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { API_DOMAINS } from '@agroerp/shared';

@Injectable()
export class ApiRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, filters?: { domain?: string; status?: string }) {
    return this.prisma.apiDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.domain ? { domain: filters.domain } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 3 }, routes: { where: { isActive: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const api = await this.prisma.apiDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { versions: true, routes: true },
    });
    if (!api) throw new NotFoundException('API no encontrada');
    return api;
  }

  async findByKey(organizationId: string, apiKey: string) {
    return this.prisma.apiDefinition.findFirst({
      where: { organizationId, apiKey, deletedAt: null },
      include: { versions: { where: { status: 'published' } }, routes: { where: { isActive: true } } },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      apiKey: string;
      name: string;
      description?: string;
      domain: string;
      basePath: string;
      moduleRef: string;
      tags?: string[];
      authType?: string;
      isPublic?: boolean;
      corsConfig?: Record<string, unknown>;
    },
  ) {
    if (!API_DOMAINS.includes(data.domain as never)) {
      throw new BadRequestException('Dominio de API inválido');
    }
    return this.prisma.apiDefinition.create({
      data: {
        organizationId,
        apiKey: data.apiKey,
        name: data.name,
        description: data.description,
        domain: data.domain,
        basePath: data.basePath,
        moduleRef: data.moduleRef,
        tags: data.tags ?? [],
        authType: (data.authType ?? 'api_key') as never,
        isPublic: data.isPublic ?? false,
        corsConfig: (data.corsConfig ?? {}) as object,
        openApiSpec: this.buildOpenApiStub(data),
        createdBy: userId,
        versions: {
          create: {
            organizationId,
            version: 'v1',
            status: 'draft',
            changelog: 'Versión inicial',
            openApiSpec: this.buildOpenApiStub(data),
            createdBy: userId,
          },
        },
      },
      include: { versions: true },
    });
  }

  async publish(organizationId: string, id: string) {
    const api = await this.findOne(organizationId, id);
    return this.prisma.apiDefinition.update({
      where: { id: api.id },
      data: { status: 'published', publishedAt: new Date(), deprecatedAt: null },
    });
  }

  async unpublish(organizationId: string, id: string) {
    const api = await this.findOne(organizationId, id);
    return this.prisma.apiDefinition.update({
      where: { id: api.id },
      data: { status: 'unpublished' },
    });
  }

  async deprecate(organizationId: string, id: string) {
    const api = await this.findOne(organizationId, id);
    return this.prisma.apiDefinition.update({
      where: { id: api.id },
      data: { status: 'deprecated', deprecatedAt: new Date() },
    });
  }

  async addRoute(
    organizationId: string,
    apiDefinitionId: string,
    data: {
      routeKey: string;
      method: string;
      path: string;
      upstreamPath: string;
      moduleRef: string;
      apiVersionId?: string;
      timeoutMs?: number;
      retryCount?: number;
    },
  ) {
    await this.findOne(organizationId, apiDefinitionId);
    return this.prisma.apiRoute.create({
      data: {
        organizationId,
        apiDefinitionId,
        apiVersionId: data.apiVersionId,
        routeKey: data.routeKey,
        method: data.method.toUpperCase(),
        path: data.path,
        upstreamPath: data.upstreamPath,
        moduleRef: data.moduleRef,
        timeoutMs: data.timeoutMs ?? 30000,
        retryCount: data.retryCount ?? 2,
      },
    });
  }

  private buildOpenApiStub(data: { name: string; basePath: string; apiKey: string }) {
    return {
      openapi: '3.0.3',
      info: { title: data.name, version: 'v1' },
      servers: [{ url: `/gateway/v1/${data.apiKey}` }],
      paths: {},
    };
  }
}
