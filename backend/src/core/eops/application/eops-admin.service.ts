import { Injectable } from '@nestjs/common';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAuditService } from './eops-audit.service';

@Injectable()
export class EopsAdminService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly audit: EopsAuditService,
  ) {}

  listGlobalConfigs(organizationId: string) {
    return this.prisma.eopsGlobalConfig.findMany({ where: { organizationId }, orderBy: { configKey: 'asc' } });
  }

  async upsertGlobalConfig(
    organizationId: string,
    userId: string,
    configKey: string,
    name: string,
    category: string,
    value: Record<string, unknown>,
    environment = 'production',
  ) {
    const row = await this.prisma.eopsGlobalConfig.upsert({
      where: { organizationId_configKey_environment: { organizationId, configKey, environment } },
      create: { organizationId, configKey, name, category, value: value as object, environment, createdBy: userId },
      update: { name, category, value: value as object, version: { increment: 1 } },
    });
    await this.audit.log(organizationId, 'GlobalConfig', configKey, 'config_changed', userId, { category });
    return row;
  }

  listTenantConfigs(organizationId: string, tenantKey?: string) {
    return this.prisma.eopsTenantConfig.findMany({
      where: { organizationId, ...(tenantKey ? { tenantKey } : {}) },
    });
  }

  upsertTenantConfig(organizationId: string, tenantKey: string, configKey: string, value: Record<string, unknown>) {
    return this.prisma.eopsTenantConfig.upsert({
      where: { organizationId_tenantKey_configKey: { organizationId, tenantKey, configKey } },
      create: { organizationId, tenantKey, configKey, value: value as object },
      update: { value: value as object, version: { increment: 1 } },
    });
  }

  listModuleConfigs(organizationId: string, moduleRef?: string) {
    return this.prisma.eopsModuleConfig.findMany({
      where: { organizationId, ...(moduleRef ? { moduleRef } : {}) },
    });
  }

  upsertModuleConfig(organizationId: string, moduleRef: string, configKey: string, value: Record<string, unknown>) {
    return this.prisma.eopsModuleConfig.upsert({
      where: { organizationId_moduleRef_configKey: { organizationId, moduleRef, configKey } },
      create: { organizationId, moduleRef, configKey, value: value as object },
      update: { value: value as object, version: { increment: 1 } },
    });
  }

  listEnvVariables(organizationId: string) {
    return this.prisma.eopsEnvVariable.findMany({ where: { organizationId } });
  }

  registerEnvVariable(
    organizationId: string,
    userId: string,
    varKey: string,
    displayName: string,
    opts: { scope?: string; environment?: string; isSecret?: boolean; valueRef?: string },
  ) {
    return this.prisma.eopsEnvVariable.upsert({
      where: { organizationId_varKey_environment: { organizationId, varKey, environment: opts.environment ?? 'production' } },
      create: {
        organizationId,
        varKey,
        displayName,
        scope: opts.scope ?? 'global',
        environment: opts.environment ?? 'production',
        isSecret: opts.isSecret ?? false,
        valueRef: opts.valueRef,
        createdBy: userId,
      },
      update: { displayName, valueRef: opts.valueRef, isSecret: opts.isSecret ?? false },
    });
  }

  listMaintenance(organizationId: string) {
    return this.prisma.eopsMaintenanceWindow.findMany({ where: { organizationId }, orderBy: { startsAt: 'desc' } });
  }

  async setMaintenanceMode(
    organizationId: string,
    userId: string,
    windowKey: string,
    title: string,
    active: boolean,
    message?: string,
  ) {
    const row = await this.prisma.eopsMaintenanceWindow.upsert({
      where: { organizationId_windowKey: { organizationId, windowKey } },
      create: {
        organizationId,
        windowKey,
        title,
        message,
        startsAt: new Date(),
        isActive: active,
        createdBy: userId,
      },
      update: { isActive: active, title, message, ...(active ? { startsAt: new Date() } : { endsAt: new Date() }) },
    });
    await this.audit.log(
      organizationId,
      'Maintenance',
      windowKey,
      active ? 'maintenance_enabled' : 'maintenance_disabled',
      userId,
    );
    return row;
  }

  listScheduledTasks(organizationId: string) {
    return this.prisma.eopsScheduledTask.findMany({ where: { organizationId } });
  }

  createScheduledTask(
    organizationId: string,
    userId: string,
    taskKey: string,
    name: string,
    cron: string,
    handlerRef: string,
    payload?: Record<string, unknown>,
  ) {
    return this.prisma.eopsScheduledTask.upsert({
      where: { organizationId_taskKey: { organizationId, taskKey } },
      create: { organizationId, taskKey, name, cron, handlerRef, payload: (payload ?? {}) as object, createdBy: userId },
      update: { name, cron, handlerRef, payload: (payload ?? {}) as object },
    });
  }

  isMaintenanceActive(organizationId: string) {
    return this.prisma.eopsMaintenanceWindow.findFirst({
      where: { organizationId, isActive: true },
    });
  }
}
