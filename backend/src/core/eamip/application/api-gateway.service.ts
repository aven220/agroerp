import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiGatewayRequest, ApiGatewayResponse } from '@agroerp/shared';
import { ApiRegistryService } from './api-registry.service';
import { ApiCircuitBreakerService } from './api-circuit-breaker.service';
import { ApiRetryPolicyService } from './api-retry-policy.service';
import { ApiRateLimiterService } from './api-rate-limiter.service';
import { ApiSecurityService } from './api-security.service';
import { ApiAnalyticsService } from './api-analytics.service';

@Injectable()
export class ApiGatewayService {
  constructor(
    private readonly registry: ApiRegistryService,
    private readonly circuitBreaker: ApiCircuitBreakerService,
    private readonly retryPolicy: ApiRetryPolicyService,
    private readonly rateLimiter: ApiRateLimiterService,
    private readonly security: ApiSecurityService,
    private readonly analytics: ApiAnalyticsService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    organizationId: string,
    apiKey: string,
    version: string,
    request: ApiGatewayRequest,
    clientContext: { clientId: string; scopes: string[]; ip?: string },
  ): Promise<ApiGatewayResponse> {
    const start = Date.now();
    const api = await this.registry.findByKey(organizationId, apiKey);
    if (!api || api.status !== 'published') {
      throw new NotFoundException('API no publicada');
    }

    if (this.security.detectAbuse([request.path, JSON.stringify(request.body ?? '')])) {
      throw new ForbiddenException('Request blocked by abuse protection');
    }

    await this.rateLimiter.checkAndIncrement(organizationId, clientContext.clientId, {
      perMinute: 120,
      perDay: 50000,
    });

    const route = this.matchRoute(api.routes, version, request.method, request.path);
    if (!route) throw new NotFoundException('Ruta no encontrada');

    this.security.assertScope(clientContext.scopes, `${api.moduleRef}:read`);

    await this.circuitBreaker.beforeRequest(organizationId, route.id, route.routeKey);

    const baseUrl = this.config.get<string>('GATEWAY_UPSTREAM_BASE') ?? `http://127.0.0.1:${this.config.get('PORT') ?? 3080}`;
    const upstream = `${baseUrl}${route.upstreamPath}`;

    try {
      const result = await this.retryPolicy.execute(
        () => this.proxy(upstream, request),
        route.retryCount,
        route.timeoutMs,
      );
      await this.circuitBreaker.onSuccess(route.id);
      const latencyMs = Date.now() - start;
      await this.analytics.logRequest({
        organizationId,
        clientId: clientContext.clientId,
        apiDefinitionId: api.id,
        routeKey: route.routeKey,
        method: request.method,
        path: request.path,
        statusCode: result.statusCode,
        latencyMs,
        moduleRef: route.moduleRef,
      });
      return { ...result, latencyMs };
    } catch (err) {
      await this.circuitBreaker.onFailure(organizationId, route.id, route.routeKey);
      const latencyMs = Date.now() - start;
      await this.analytics.logRequest({
        organizationId,
        clientId: clientContext.clientId,
        apiDefinitionId: api.id,
        routeKey: route.routeKey,
        method: request.method,
        path: request.path,
        statusCode: 502,
        latencyMs,
        moduleRef: route.moduleRef,
        errorMessage: err instanceof Error ? err.message : 'proxy error',
      });
      throw err;
    }
  }

  private matchRoute(
    routes: Array<{ id: string; routeKey: string; method: string; path: string; upstreamPath: string; moduleRef: string; retryCount: number; timeoutMs: number }>,
    version: string,
    method: string,
    path: string,
  ) {
    const normalized = `/${version}${path.startsWith('/') ? path : `/${path}`}`;
    return routes.find((r) => {
      if (r.method.toUpperCase() !== method.toUpperCase()) return false;
      const pattern = r.path.replace(/:([^/]+)/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(normalized) || r.path === normalized;
    });
  }

  private async proxy(upstream: string, request: ApiGatewayRequest): Promise<ApiGatewayResponse> {
    const url = new URL(upstream);
    if (request.query) {
      for (const [k, v] of Object.entries(request.query)) url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers ?? {}),
      },
      body: ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? undefined : JSON.stringify(request.body ?? {}),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }

    return {
      statusCode: res.status,
      body,
      latencyMs: 0,
      headers: Object.fromEntries(res.headers.entries()),
    };
  }
}
