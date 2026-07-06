import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PluginUpdateService } from './plugin-update.service';
import { PluginExtensionPointsService } from './plugin-extension-points.service';

@Injectable()
export class PluginSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PluginSchedulerService.name);

  constructor(
    private readonly updates: PluginUpdateService,
    private readonly extensionPoints: PluginExtensionPointsService,
  ) {}

  async onModuleInit() {
    await this.seedCoreExtensionPoints();
    const timer = setInterval(() => {
      this.updates.processAutoUpdates().catch((e) => {
        this.logger.error(`Auto-update tick failed: ${(e as Error).message}`);
      });
    }, 300_000);
    timer.unref?.();
    this.logger.log('EPPM scheduler started (auto-update 5m)');
  }

  private async seedCoreExtensionPoints() {
    const points = [
      { pointKey: 'core.dashboard.widgets', name: 'Dashboard widgets', pluginType: 'widget', handlerInterface: 'WidgetProvider' },
      { pointKey: 'core.workflow.actions', name: 'Workflow actions', pluginType: 'workflow', handlerInterface: 'WorkflowActionProvider' },
      { pointKey: 'core.bre.rules', name: 'Business rules', pluginType: 'business_rule', handlerInterface: 'RuleProvider' },
      { pointKey: 'core.scheduler.jobs', name: 'Scheduled jobs', pluginType: 'business_module', handlerInterface: 'JobHandlerProvider' },
      { pointKey: 'core.api.routes', name: 'API routes', pluginType: 'integration', handlerInterface: 'ApiRouteProvider' },
      { pointKey: 'core.mobile.screens', name: 'Mobile screens', pluginType: 'mobile_component', handlerInterface: 'MobileScreenProvider' },
      { pointKey: 'core.ai.agents', name: 'AI agents', pluginType: 'ai_service', handlerInterface: 'AiAgentProvider' },
      { pointKey: 'core.notifications.channels', name: 'Notification channels', pluginType: 'connector', handlerInterface: 'NotificationChannelProvider' },
    ];
    for (const p of points) {
      await this.extensionPoints.register(p);
    }
  }
}
