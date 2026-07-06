import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EppmController } from './presentation/eppm.controller';
import { PluginManifestValidator } from './application/plugin-manifest.validator';
import { PluginSignatureService } from './application/plugin-signature.service';
import { PluginDependencyResolver } from './application/plugin-dependency-resolver.service';
import { PluginSandboxService } from './application/plugin-sandbox.service';
import { PluginExtensionPointsService } from './application/plugin-extension-points.service';
import { PluginSpiService } from './application/plugin-spi.service';
import { PluginRegistryService } from './application/plugin-registry.service';
import { PluginMarketplaceService } from './application/plugin-marketplace.service';
import { PluginLifecycleService } from './application/plugin-lifecycle.service';
import { PluginUpdateService } from './application/plugin-update.service';
import { PluginMetricsService } from './application/plugin-metrics.service';
import { PluginAiService } from './application/plugin-ai.service';
import { PluginAuditService } from './application/plugin-audit.service';
import { PluginSdkService } from './application/plugin-sdk.service';
import { PluginDeveloperService } from './application/plugin-developer.service';
import { PluginSchedulerService } from './application/plugin-scheduler.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EppmController],
  providers: [
    PluginManifestValidator,
    PluginSignatureService,
    PluginDependencyResolver,
    PluginSandboxService,
    PluginExtensionPointsService,
    PluginSpiService,
    PluginRegistryService,
    PluginMarketplaceService,
    PluginLifecycleService,
    PluginUpdateService,
    PluginMetricsService,
    PluginAiService,
    PluginAuditService,
    PluginSdkService,
    PluginDeveloperService,
    PluginSchedulerService,
  ],
  exports: [
    PluginRegistryService,
    PluginLifecycleService,
    PluginSpiService,
    PluginExtensionPointsService,
  ],
})
export class EppmModule {}
