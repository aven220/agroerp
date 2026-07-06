import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipStatus } from '@agroerp/prisma-eip-client';
import { ApiGatewayService } from '@/core/eamip/application/api-gateway.service';
import { ApiRegistryService } from '@/core/eamip/application/api-registry.service';
import { ApiAnalyticsService } from '@/core/eamip/application/api-analytics.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { applyTransform, generateEipKey } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipGatewayService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly registry: ApiRegistryService,
    private readonly gateway: ApiGatewayService,
    private readonly analytics: ApiAnalyticsService,
    private readonly audit: EipAuditService,
  ) {}

  async listApis(organizationId: string) {
    return this.registry.findAll(organizationId);
  }

  async listPolicies(organizationId: string) {
    return this.prisma.eipApiPolicy.findMany({
      where: { organizationId },
      orderBy: { policyKey: 'asc' },
    });
  }

  async createPolicy(
    organizationId: string,
    userId: string,
    policyKey: string,
    apiKey: string,
    opts: {
      version?: string;
      ratePerMinute?: number;
      ratePerDay?: number;
      throttleMs?: number;
      loadBalance?: string;
      transformReq?: Record<string, unknown>;
      transformRes?: Record<string, unknown>;
    },
  ) {
    const existing = await this.prisma.eipApiPolicy.findFirst({ where: { organizationId, policyKey } });
    if (existing) throw new BadRequestException(`Policy ${policyKey} ya existe`);
    const policy = await this.prisma.eipApiPolicy.create({
      data: {
        organizationId,
        policyKey,
        apiKey,
        version: opts.version ?? 'v1',
        ratePerMinute: opts.ratePerMinute ?? 120,
        ratePerDay: opts.ratePerDay ?? 50000,
        throttleMs: opts.throttleMs ?? 0,
        loadBalance: opts.loadBalance ?? 'round_robin',
        transformReq: (opts.transformReq ?? {}) as object,
        transformRes: (opts.transformRes ?? {}) as object,
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EipApiPolicy', policyKey, 'api_policy_created', userId, { apiKey });
    return policy;
  }

  async activatePolicy(organizationId: string, userId: string, policyKey: string) {
    const policy = await this.prisma.eipApiPolicy.findFirst({ where: { organizationId, policyKey } });
    if (!policy) throw new NotFoundException('Policy no encontrada');
    const updated = await this.prisma.eipApiPolicy.update({
      where: { id: policy.id },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EipApiPolicy', policyKey, 'api_policy_updated', userId, { status: 'active' });
    return updated;
  }

  async proxy(
    organizationId: string,
    apiKey: string,
    version: string,
    request: { method: string; path: string; headers?: Record<string, string>; body?: unknown; query?: Record<string, string> },
    clientContext: { clientId: string; scopes: string[]; ip?: string },
  ) {
    const policy = await this.prisma.eipApiPolicy.findFirst({
      where: { organizationId, apiKey, status: 'active' },
    });
    const transformedBody = policy
      ? applyTransform((policy.transformReq as Record<string, unknown>) ?? {}, (request.body as Record<string, unknown>) ?? {})
      : request.body;
    const start = Date.now();
    const seq = await this.prisma.eipInvocationLog.count({ where: { organizationId } });
    try {
      const response = await this.gateway.execute(organizationId, apiKey, version, {
        method: request.method,
        path: request.path,
        headers: request.headers,
        body: transformedBody,
        query: request.query,
      }, clientContext);
      const durationMs = Date.now() - start;
      await this.prisma.eipInvocationLog.create({
        data: {
          organizationId,
          invocationKey: generateEipKey('INV', seq + 1),
          channel: 'api_gateway',
          targetRef: apiKey,
          method: request.method,
          statusCode: response.statusCode,
          durationMs,
          success: response.statusCode < 400,
          requestMeta: { path: request.path } as object,
          responseMeta: { headers: response.headers } as object,
        },
      });
      if (policy?.transformRes) {
        response.body = applyTransform(policy.transformRes as Record<string, unknown>, (response.body as Record<string, unknown>) ?? {});
      }
      return response;
    } catch (e) {
      await this.prisma.eipInvocationLog.create({
        data: {
          organizationId,
          invocationKey: generateEipKey('INV', seq + 1),
          channel: 'api_gateway',
          targetRef: apiKey,
          method: request.method,
          success: false,
          errorMessage: e instanceof Error ? e.message : 'gateway error',
          requestMeta: { path: request.path } as object,
        },
      });
      throw e;
    }
  }

  getAnalytics(organizationId: string) {
    return this.analytics.getDashboard(organizationId);
  }
}
