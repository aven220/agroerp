import { Module } from '@nestjs/common';
import { EamipController } from './presentation/eamip.controller';
import { EamipGatewayController } from './presentation/eamip-gateway.controller';
import { ApiRegistryService } from './application/api-registry.service';
import { ApiVersioningService } from './application/api-versioning.service';
import { ApiDiscoveryService } from './application/api-discovery.service';
import { ApiGatewayService } from './application/api-gateway.service';
import { ApiRateLimiterService } from './application/api-rate-limiter.service';
import { ApiCircuitBreakerService } from './application/api-circuit-breaker.service';
import { ApiRetryPolicyService } from './application/api-retry-policy.service';
import { ApiHealthService } from './application/api-health.service';
import { ApiAnalyticsService } from './application/api-analytics.service';
import { ApiClientService } from './application/api-client.service';
import { ApiKeyService } from './application/api-key.service';
import { ApiSecurityService } from './application/api-security.service';
import { ApiConnectorService } from './application/api-connector.service';
import { ApiOpenApiService } from './application/api-openapi.service';
import { ApiDeveloperPortalService } from './application/api-developer-portal.service';

@Module({
  controllers: [EamipController, EamipGatewayController],
  providers: [
    ApiRegistryService,
    ApiVersioningService,
    ApiDiscoveryService,
    ApiGatewayService,
    ApiRateLimiterService,
    ApiCircuitBreakerService,
    ApiRetryPolicyService,
    ApiHealthService,
    ApiAnalyticsService,
    ApiClientService,
    ApiKeyService,
    ApiSecurityService,
    ApiConnectorService,
    ApiOpenApiService,
    ApiDeveloperPortalService,
  ],
  exports: [ApiGatewayService, ApiRegistryService, ApiAnalyticsService],
})
export class EamipModule {}
