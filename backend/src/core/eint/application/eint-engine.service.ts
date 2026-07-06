import { Injectable } from '@nestjs/common';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { EintAiService } from './eint-ai.service';
import { EintAssistantService } from './eint-assistant.service';
import { EintAuditService } from './eint-audit.service';
import { EintBiService } from './eint-bi.service';
import { EintBridgeService, EintMonitoringService, EintOfflineService } from './eint-monitoring.service';
import { EintDashboardService } from './eint-dashboard.service';
import { EintDwhService, EintEtlService } from './eint-dwh.service';
import { EintReportingService } from './eint-reporting.service';

export { EintOfflineService } from './eint-monitoring.service';

@Injectable()
export class EintEngineService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly monitoring: EintMonitoringService,
    private readonly ai: EintAiService,
    private readonly assistants: EintAssistantService,
    private readonly bi: EintBiService,
    private readonly reporting: EintReportingService,
    private readonly dashboards: EintDashboardService,
    private readonly dwh: EintDwhService,
    private readonly etl: EintEtlService,
    private readonly bridge: EintBridgeService,
    private readonly audit: EintAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, providers, assistants, kpis, dashboardList, templates, etlJobs, dimensions, facts] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.ai.listProviders(organizationId),
      this.assistants.list(organizationId),
      this.bi.listBindings(organizationId),
      this.dashboards.list(organizationId),
      this.reporting.listTemplates(organizationId),
      this.etl.listJobs(organizationId),
      this.dwh.listDimensions(organizationId),
      this.dwh.listFacts(organizationId),
    ]);
    return {
      dashboard,
      providers,
      assistants,
      kpis,
      dashboards: dashboardList,
      templates,
      etlJobs,
      dimensions,
      facts,
      moduleSlots: this.bridge.moduleSlots(),
      aiCatalog: this.ai.catalog(),
      dashboardCatalog: this.dashboards.catalog(),
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.assistants.bootstrap(organizationId, userId);
    await this.dashboards.bootstrap(organizationId);
    const vendors = [
      { key: 'openai-primary', name: 'OpenAI', vendor: 'openai', order: 10 },
      { key: 'anthropic-fallback', name: 'Anthropic', vendor: 'anthropic', order: 20 },
      { key: 'ollama-local', name: 'Ollama', vendor: 'ollama', order: 30 },
      { key: 'enterprise-fallback', name: 'Fallback', vendor: 'fallback', order: 99 },
    ];
    for (const v of vendors) {
      const exists = await this.prisma.eintAiProvider.findFirst({ where: { organizationId, providerKey: v.key } });
      if (!exists) {
        await this.ai.registerProvider(organizationId, userId, v.key, v.name, v.vendor, { fallbackOrder: v.order });
        await this.ai.activateProvider(organizationId, userId, v.key);
      }
    }
    await this.audit.log(organizationId, 'EintPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
