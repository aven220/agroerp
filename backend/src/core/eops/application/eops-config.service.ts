import { Injectable } from '@nestjs/common';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAuditService } from './eops-audit.service';

@Injectable()
export class EopsConfigService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly audit: EopsAuditService,
  ) {}

  listFlags(organizationId: string, environment?: string) {
    return this.prisma.eopsFeatureFlag.findMany({
      where: { organizationId, ...(environment ? { environment } : {}) },
      orderBy: { flagKey: 'asc' },
    });
  }

  async upsertFlag(
    organizationId: string,
    userId: string,
    flagKey: string,
    name: string,
    opts: { enabled?: boolean; rolloutPct?: number; environment?: string; clientRef?: string; description?: string },
  ) {
    const env = opts.environment ?? 'production';
    const row = await this.prisma.eopsFeatureFlag.upsert({
      where: { organizationId_flagKey_environment: { organizationId, flagKey, environment: env } },
      create: {
        organizationId,
        flagKey,
        name,
        description: opts.description,
        enabled: opts.enabled ?? false,
        rolloutPct: opts.rolloutPct ?? 0,
        environment: env,
        clientRef: opts.clientRef,
        createdBy: userId,
      },
      update: {
        name,
        description: opts.description,
        enabled: opts.enabled,
        rolloutPct: opts.rolloutPct,
        clientRef: opts.clientRef,
        version: { increment: 1 },
      },
    });
    await this.audit.log(organizationId, 'FeatureFlag', flagKey, 'feature_flag_changed', userId, { enabled: row.enabled });
    return row;
  }

  evaluateFlag(organizationId: string, flagKey: string, environment = 'production', clientRef?: string) {
    return this.prisma.eopsFeatureFlag.findFirst({
      where: {
        organizationId,
        flagKey,
        environment,
        status: 'active',
        ...(clientRef ? { OR: [{ clientRef: null }, { clientRef }] } : {}),
      },
    });
  }

  listDynamicConfigs(organizationId: string, namespace?: string) {
    return this.prisma.eopsDynamicConfig.findMany({
      where: { organizationId, ...(namespace ? { namespace } : {}) },
    });
  }

  upsertDynamicConfig(
    organizationId: string,
    configKey: string,
    value: Record<string, unknown>,
    namespace = 'default',
    environment = 'production',
  ) {
    return this.prisma.eopsDynamicConfig.upsert({
      where: { organizationId_namespace_configKey_environment: { organizationId, namespace, configKey, environment } },
      create: { organizationId, namespace, configKey, value: value as object, environment },
      update: { value: value as object, version: { increment: 1 } },
    });
  }
}
