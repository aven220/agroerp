import { Injectable } from '@nestjs/common';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EOPS_HA_STRATEGIES } from '../domain/eops.engine';

@Injectable()
export class EopsHaService {
  constructor(private readonly prisma: EopsPrismaService) {}

  catalog() {
    return EOPS_HA_STRATEGIES;
  }

  listProfiles(organizationId: string) {
    return this.prisma.eopsHaProfile.findMany({ where: { organizationId } });
  }

  upsertProfile(
    organizationId: string,
    profileKey: string,
    name: string,
    strategy: string,
    config: Record<string, unknown>,
  ) {
    return this.prisma.eopsHaProfile.upsert({
      where: { organizationId_profileKey: { organizationId, profileKey } },
      create: { organizationId, profileKey, name, strategy, config: config as object },
      update: { name, strategy, config: config as object, version: { increment: 1 } },
    });
  }

  readiness(organizationId: string) {
    return {
      loadBalancerReady: true,
      horizontalScalingReady: true,
      verticalScalingReady: true,
      failoverReady: true,
      replicationReady: true,
      clusterReady: true,
      autoRecoveryReady: true,
      profiles: EOPS_HA_STRATEGIES.length,
      note: 'Architecture metadata — infrastructure deployment external',
    };
  }
}
