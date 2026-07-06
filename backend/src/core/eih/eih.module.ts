import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EihController } from './presentation/eih.controller';
import { IntegrationAuditService } from './application/integration-audit.service';
import { IntegrationSecurityService } from './application/integration-security.service';
import { IntegrationConnectorCatalogService } from './application/integration-connector-catalog.service';
import { IntegrationConnectorService } from './application/integration-connector.service';
import { IntegrationFlowService } from './application/integration-flow.service';
import { IntegrationTransformService } from './application/integration-transform.service';
import { IntegrationSyncService } from './application/integration-sync.service';
import { IntegrationErrorService } from './application/integration-error.service';
import { IntegrationWebhookService } from './application/integration-webhook.service';
import { IntegrationBusService } from './application/integration-bus.service';
import { IntegrationMetricsService } from './application/integration-metrics.service';
import { IntegrationAiService } from './application/integration-ai.service';
import { IntegrationSchedulerService } from './application/integration-scheduler.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EihController],
  providers: [
    IntegrationAuditService,
    IntegrationSecurityService,
    IntegrationConnectorCatalogService,
    IntegrationConnectorService,
    IntegrationFlowService,
    IntegrationTransformService,
    IntegrationSyncService,
    IntegrationErrorService,
    IntegrationWebhookService,
    IntegrationBusService,
    IntegrationMetricsService,
    IntegrationAiService,
    IntegrationSchedulerService,
  ],
  exports: [IntegrationConnectorService, IntegrationConnectorCatalogService, IntegrationSyncService, IntegrationFlowService],
})
export class EihModule {}
