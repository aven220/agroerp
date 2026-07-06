import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EopsAdminService } from '../application/eops-admin.service';
import { EopsAuditService } from '../application/eops-audit.service';
import { EopsBackupService } from '../application/eops-backup.service';
import { EopsConfigService } from '../application/eops-config.service';
import { EopsDevopsService } from '../application/eops-devops.service';
import { EopsEngineService, EopsOfflineService } from '../application/eops-engine.service';
import { EopsHaService } from '../application/eops-ha.service';
import { EopsHealthService } from '../application/eops-health.service';
import { EopsLicenseService } from '../application/eops-license.service';
import { EopsBridgeService, EopsMonitoringService } from '../application/eops-monitoring.service';
import { EopsObservabilityService } from '../application/eops-observability.service';
import { EopsOptimizationService } from '../application/eops-optimization.service';
import { EopsSecurityService } from '../application/eops-security.service';
import {
  EopsBackupScheduleDto,
  EopsBridgeDto,
  EopsDeploymentDto,
  EopsDynamicConfigDto,
  EopsEnvVariableDto,
  EopsFeatureFlagDto,
  EopsHaProfileDto,
  EopsLicenseDto,
  EopsMaintenanceDto,
  EopsQueueSampleDto,
  EopsRestoreDto,
  EopsRunBackupDto,
  EopsScheduledTaskDto,
  EopsSecretDto,
  EopsSecurityPolicyDto,
  EopsSubscriptionDto,
  EopsUpsertGlobalConfigDto,
  EopsUpsertModuleConfigDto,
  EopsUpsertTenantConfigDto,
  EopsWorkerJobDto,
} from './eops.dto';

@ApiTags('EOPS — Enterprise Operations Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eops')
export class EopsController {
  constructor(
    private readonly engine: EopsEngineService,
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
    private readonly monitoring: EopsMonitoringService,
    private readonly bridge: EopsBridgeService,
    private readonly offline: EopsOfflineService,
    private readonly audit: EopsAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('eops:read')
  center(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.center(user.organizationId, user.id);
  }

  @Post('bootstrap')
  @RequirePermissions('eops:config')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('eops:audit')
  auditLog(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.audit.findAll(user.organizationId, entityType);
  }

  @Get('admin/configs')
  @RequirePermissions('eops:read')
  globalConfigs(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listGlobalConfigs(user.organizationId);
  }

  @Post('admin/configs')
  @RequirePermissions('eops:config')
  upsertGlobalConfig(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsUpsertGlobalConfigDto) {
    return this.admin.upsertGlobalConfig(user.organizationId, user.id, dto.configKey, dto.name, dto.category, dto.value, dto.environment);
  }

  @Get('admin/tenants')
  @RequirePermissions('eops:read')
  tenantConfigs(@CurrentUser() user: { organizationId: string }, @Query('tenantKey') tenantKey?: string) {
    return this.admin.listTenantConfigs(user.organizationId, tenantKey);
  }

  @Post('admin/tenants')
  @RequirePermissions('eops:config')
  upsertTenantConfig(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsUpsertTenantConfigDto) {
    return this.admin.upsertTenantConfig(user.organizationId, dto.tenantKey, dto.configKey, dto.value);
  }

  @Get('admin/modules')
  @RequirePermissions('eops:read')
  moduleConfigs(@CurrentUser() user: { organizationId: string }, @Query('moduleRef') moduleRef?: string) {
    return this.admin.listModuleConfigs(user.organizationId, moduleRef);
  }

  @Post('admin/modules')
  @RequirePermissions('eops:config')
  upsertModuleConfig(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsUpsertModuleConfigDto) {
    return this.admin.upsertModuleConfig(user.organizationId, dto.moduleRef, dto.configKey, dto.value);
  }

  @Get('admin/env')
  @RequirePermissions('eops:read')
  envVariables(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listEnvVariables(user.organizationId);
  }

  @Post('admin/env')
  @RequirePermissions('eops:config')
  registerEnv(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsEnvVariableDto) {
    return this.admin.registerEnvVariable(user.organizationId, user.id, dto.varKey, dto.displayName, dto);
  }

  @Get('admin/maintenance')
  @RequirePermissions('eops:read')
  maintenance(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listMaintenance(user.organizationId);
  }

  @Post('admin/maintenance')
  @RequirePermissions('eops:config')
  setMaintenance(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsMaintenanceDto) {
    return this.admin.setMaintenanceMode(user.organizationId, user.id, dto.windowKey, dto.title, dto.active, dto.message);
  }

  @Get('admin/tasks')
  @RequirePermissions('eops:read')
  scheduledTasks(@CurrentUser() user: { organizationId: string }) {
    return this.admin.listScheduledTasks(user.organizationId);
  }

  @Post('admin/tasks')
  @RequirePermissions('eops:config')
  createTask(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsScheduledTaskDto) {
    return this.admin.createScheduledTask(user.organizationId, user.id, dto.taskKey, dto.name, dto.cron, dto.handlerRef, dto.payload);
  }

  @Get('observability/dashboard')
  @RequirePermissions('eops:read')
  obsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.observability.dashboard(user.organizationId);
  }

  @Post('observability/queues/sample')
  @RequirePermissions('eops:execute')
  queueSample(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsQueueSampleDto) {
    return this.observability.ingestQueueSample(user.organizationId, dto.queueKey, dto.depth, dto.consumers, dto.lagMs);
  }

  @Get('health/probes')
  @RequirePermissions('eops:read')
  healthProbes(@CurrentUser() user: { organizationId: string }) {
    return this.health.listProbes(user.organizationId);
  }

  @Post('health/check')
  @RequirePermissions('eops:execute')
  runHealthChecks(@CurrentUser() user: { organizationId: string }) {
    return this.health.runAllChecks(user.organizationId);
  }

  @Get('ha/catalog')
  @RequirePermissions('eops:read')
  haCatalog() {
    return this.ha.catalog();
  }

  @Get('ha/profiles')
  @RequirePermissions('eops:read')
  haProfiles(@CurrentUser() user: { organizationId: string }) {
    return this.ha.listProfiles(user.organizationId);
  }

  @Post('ha/profiles')
  @RequirePermissions('eops:config')
  upsertHaProfile(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsHaProfileDto) {
    return this.ha.upsertProfile(user.organizationId, dto.profileKey, dto.name, dto.strategy, dto.config);
  }

  @Get('ha/readiness')
  @RequirePermissions('eops:read')
  haReadiness(@CurrentUser() user: { organizationId: string }) {
    return this.ha.readiness(user.organizationId);
  }

  @Get('backups/schedules')
  @RequirePermissions('eops:read')
  backupSchedules(@CurrentUser() user: { organizationId: string }) {
    return this.backup.listSchedules(user.organizationId);
  }

  @Post('backups/schedules')
  @RequirePermissions('eops:config')
  createBackupSchedule(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsBackupScheduleDto) {
    return this.backup.createSchedule(user.organizationId, user.id, dto.scheduleKey, dto.name, dto.targetType, dto.cron, dto.retentionDays);
  }

  @Post('backups/run')
  @RequirePermissions('eops:execute')
  runBackup(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsRunBackupDto) {
    return this.backup.runBackup(user.organizationId, user.id, dto.scheduleKey, dto.payload);
  }

  @Get('backups/runs')
  @RequirePermissions('eops:read')
  backupRuns(@CurrentUser() user: { organizationId: string }) {
    return this.backup.listRuns(user.organizationId);
  }

  @Post('backups/restore')
  @RequirePermissions('eops:execute')
  restoreBackup(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsRestoreDto) {
    return this.backup.restore(user.organizationId, user.id, dto.backupRunKey, dto.validate);
  }

  @Get('backups/restores')
  @RequirePermissions('eops:read')
  restoreRuns(@CurrentUser() user: { organizationId: string }) {
    return this.backup.listRestores(user.organizationId);
  }

  @Get('config/flags')
  @RequirePermissions('eops:read')
  featureFlags(@CurrentUser() user: { organizationId: string }, @Query('environment') environment?: string) {
    return this.config.listFlags(user.organizationId, environment);
  }

  @Post('config/flags')
  @RequirePermissions('eops:config')
  upsertFlag(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsFeatureFlagDto) {
    return this.config.upsertFlag(user.organizationId, user.id, dto.flagKey, dto.name, dto);
  }

  @Get('config/dynamic')
  @RequirePermissions('eops:read')
  dynamicConfigs(@CurrentUser() user: { organizationId: string }, @Query('namespace') namespace?: string) {
    return this.config.listDynamicConfigs(user.organizationId, namespace);
  }

  @Post('config/dynamic')
  @RequirePermissions('eops:config')
  upsertDynamicConfig(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsDynamicConfigDto) {
    return this.config.upsertDynamicConfig(user.organizationId, dto.configKey, dto.value, dto.namespace, dto.environment);
  }

  @Get('licenses/plans')
  @RequirePermissions('eops:read')
  licensePlans(@CurrentUser() user: { organizationId: string }) {
    return this.license.listPlans(user.organizationId);
  }

  @Get('licenses/catalog')
  @RequirePermissions('eops:read')
  licenseCatalog() {
    return this.license.catalog();
  }

  @Get('licenses')
  @RequirePermissions('eops:read')
  licenses(@CurrentUser() user: { organizationId: string }) {
    return this.license.listLicenses(user.organizationId);
  }

  @Post('licenses')
  @RequirePermissions('eops:config')
  issueLicense(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsLicenseDto) {
    return this.license.issueLicense(user.organizationId, dto.licenseKey, dto.planKey, dto.seats, dto.trialDays);
  }

  @Get('licenses/usage')
  @RequirePermissions('eops:read')
  licenseUsage(@CurrentUser() user: { organizationId: string }) {
    return this.license.usageDashboard(user.organizationId);
  }

  @Get('subscriptions')
  @RequirePermissions('eops:read')
  subscriptions(@CurrentUser() user: { organizationId: string }) {
    return this.license.listSubscriptions(user.organizationId);
  }

  @Post('subscriptions')
  @RequirePermissions('eops:config')
  upsertSubscription(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsSubscriptionDto) {
    return this.license.upsertSubscription(
      user.organizationId,
      dto.subscriptionKey,
      dto.planKey,
      dto.renewsAt ? new Date(dto.renewsAt) : undefined,
    );
  }

  @Get('security/policies')
  @RequirePermissions('eops:read')
  securityPolicies(@CurrentUser() user: { organizationId: string }) {
    return this.security.listPolicies(user.organizationId);
  }

  @Post('security/policies')
  @RequirePermissions('eops:config')
  upsertPolicy(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsSecurityPolicyDto) {
    return this.security.upsertPolicy(user.organizationId, user.id, dto.policyKey, dto.name, dto.category, dto.rules, dto.severity);
  }

  @Get('security/secrets')
  @RequirePermissions('eops:read')
  secrets(@CurrentUser() user: { organizationId: string }) {
    return this.security.listSecrets(user.organizationId);
  }

  @Post('security/secrets')
  @RequirePermissions('eops:config')
  registerSecret(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsSecretDto) {
    return this.security.registerSecret(user.organizationId, dto.secretKey, dto.provider, dto.rotationDays);
  }

  @Post('security/secrets/:secretKey/rotate')
  @RequirePermissions('eops:execute')
  rotateSecret(@CurrentUser() user: { organizationId: string; id: string }, @Param('secretKey') secretKey: string) {
    return this.security.rotateSecret(user.organizationId, user.id, secretKey);
  }

  @Get('security/alerts')
  @RequirePermissions('eops:read')
  securityAlerts(@CurrentUser() user: { organizationId: string }, @Query('resolved') resolved?: string) {
    return this.security.listAlerts(user.organizationId, resolved === 'true');
  }

  @Post('security/scan')
  @RequirePermissions('eops:execute')
  securityScan(@CurrentUser() user: { organizationId: string }) {
    return this.security.scanConfiguration(user.organizationId);
  }

  @Post('security/alerts/:alertKey/resolve')
  @RequirePermissions('eops:execute')
  resolveAlert(@CurrentUser() user: { organizationId: string }, @Param('alertKey') alertKey: string) {
    return this.security.resolveAlert(user.organizationId, alertKey);
  }

  @Get('devops/deployments')
  @RequirePermissions('eops:read')
  deployments(@CurrentUser() user: { organizationId: string }) {
    return this.devops.listDeployments(user.organizationId);
  }

  @Post('devops/deployments')
  @RequirePermissions('eops:config')
  createDeployment(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsDeploymentDto) {
    return this.devops.createDeployment(user.organizationId, user.id, dto.deploymentKey, dto.version, dto.environment, dto.changelog);
  }

  @Post('devops/deployments/:deploymentKey/rollback')
  @RequirePermissions('eops:execute')
  rollbackDeployment(@CurrentUser() user: { organizationId: string; id: string }, @Param('deploymentKey') deploymentKey: string) {
    return this.devops.rollback(user.organizationId, user.id, deploymentKey);
  }

  @Get('devops/workers')
  @RequirePermissions('eops:read')
  workerJobs(@CurrentUser() user: { organizationId: string }, @Query('queueName') queueName?: string) {
    return this.devops.listWorkerJobs(user.organizationId, queueName);
  }

  @Post('devops/workers')
  @RequirePermissions('eops:execute')
  enqueueWorker(@CurrentUser() user: { organizationId: string }, @Body() dto: EopsWorkerJobDto) {
    return this.devops.enqueueWorkerJob(user.organizationId, dto.queueName, dto.handlerRef, dto.payload);
  }

  @Get('devops/migrations')
  @RequirePermissions('eops:read')
  migrations() {
    return this.devops.migrationStatus();
  }

  @Get('optimization/dashboard')
  @RequirePermissions('eops:read')
  optimizationDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.optimization.dashboard(user.organizationId);
  }

  @Post('optimization/index-review')
  @RequirePermissions('eops:execute')
  indexReview(@CurrentUser() user: { organizationId: string }) {
    return this.optimization.runIndexReview(user.organizationId);
  }

  @Post('optimization/cache/purge')
  @RequirePermissions('eops:execute')
  purgeCache() {
    return this.optimization.purgeCache();
  }

  @Get('monitoring/dashboard')
  @RequirePermissions('eops:read')
  monitoringDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.monitoring.dashboard(user.organizationId);
  }

  @Get('bridge/modules')
  @RequirePermissions('eops:read')
  bridgeModules() {
    return this.bridge.moduleSlots();
  }

  @Post('bridge/events')
  @RequirePermissions('eops:execute')
  bridgeEvent(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EopsBridgeDto) {
    return this.bridge.emitModuleEvent(user.organizationId, dto.moduleRef, dto.payload, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('eops:read')
  mobileSync(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.offline.mobileSync(user.organizationId, user.id);
  }
}
