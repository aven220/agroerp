import { Injectable } from '@nestjs/common';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAdminService } from './eops-admin.service';
import { EopsAuditService } from './eops-audit.service';
import { EopsBackupService } from './eops-backup.service';
import { EopsConfigService } from './eops-config.service';
import { EopsDevopsService } from './eops-devops.service';
import { EopsHaService } from './eops-ha.service';
import { EopsHealthService } from './eops-health.service';
import { EopsLicenseService } from './eops-license.service';
import { EopsMonitoringService, EopsBridgeService } from './eops-monitoring.service';
import { EopsObservabilityService } from './eops-observability.service';
import { EopsOptimizationService } from './eops-optimization.service';
import { EopsSecurityService } from './eops-security.service';

export { EopsOfflineService } from './eops-monitoring.service';

@Injectable()
export class EopsEngineService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly monitoring: EopsMonitoringService,
    private readonly admin: EopsAdminService,
    private readonly config: EopsConfigService,
    private readonly health: EopsHealthService,
    private readonly observability: EopsObservabilityService,
    private readonly optimization: EopsOptimizationService,
    private readonly backup: EopsBackupService,
    private readonly license: EopsLicenseService,
    private readonly security: EopsSecurityService,
    private readonly devops: EopsDevopsService,
    private readonly ha: EopsHaService,
    private readonly bridge: EopsBridgeService,
    private readonly audit: EopsAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, globalConfigs, flags, schedules, deployments, plans, policies, probes] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.admin.listGlobalConfigs(organizationId),
      this.config.listFlags(organizationId),
      this.backup.listSchedules(organizationId),
      this.devops.listDeployments(organizationId),
      this.license.listPlans(organizationId),
      this.security.listPolicies(organizationId),
      this.health.listProbes(organizationId),
    ]);
    return {
      dashboard,
      globalConfigs,
      flags,
      backupSchedules: schedules,
      deployments,
      plans,
      policies,
      probes,
      moduleSlots: this.bridge.moduleSlots(),
      haCatalog: this.ha.catalog(),
      licenseCatalog: this.license.catalog(),
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.health.bootstrapProbes(organizationId);
    await this.license.bootstrapPlans(organizationId);
    await this.admin.upsertGlobalConfig(organizationId, userId, 'platform.name', 'AGROERP', 'core', { default: 'AGROERP Enterprise' });
    await this.admin.upsertGlobalConfig(organizationId, userId, 'platform.locale', 'Locale', 'core', { default: 'es' });
    await this.config.upsertFlag(organizationId, userId, 'eops.maintenance_ui', 'Maintenance UI', { enabled: false });
    await this.config.upsertFlag(organizationId, userId, 'eops.progressive_rollout', 'Progressive rollout', { enabled: true, rolloutPct: 100 });
    await this.security.upsertPolicy(organizationId, userId, 'POL-SEC-001', 'Política base', 'access', { mfaRequired: true, sessionTimeoutMin: 30 });
    await this.ha.upsertProfile(organizationId, 'HA-DEFAULT', 'Perfil HA estándar', 'horizontal', { replicas: 2, autoRecovery: true });
    await this.backup.createSchedule(organizationId, userId, 'BKP-DAILY', 'Backup diario', 'database', '0 2 * * *', 30);
    await this.license.issueLicense(organizationId, 'LIC-ENTERPRISE', 'PLAN-ENTERPRISE', 100, 0);
    await this.audit.log(organizationId, 'EopsPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
