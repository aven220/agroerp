import { Injectable } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EAPP_SATELLITE_PROVIDERS, generateEappKey } from '../domain/eapp.engine';

@Injectable()
export class EappSatelliteService {
  constructor(private readonly prisma: EappPrismaService) {}

  providerCatalog() {
    return EAPP_SATELLITE_PROVIDERS;
  }

  listProviders(organizationId: string) {
    return this.prisma.eappSatelliteProvider.findMany({
      where: { organizationId },
      include: { scenes: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async ensureProviders(organizationId: string) {
    for (const p of EAPP_SATELLITE_PROVIDERS) {
      await this.prisma.eappSatelliteProvider.upsert({
        where: { organizationId_providerKey: { organizationId, providerKey: p.providerKey } },
        create: {
          organizationId,
          providerKey: p.providerKey,
          name: p.name,
          vendor: p.vendor,
          capabilities: p.capabilities,
          status: 'active',
        },
        update: {},
      });
    }
    return this.listProviders(organizationId);
  }

  listScenes(organizationId: string, providerKey?: string) {
    return this.prisma.eappSatelliteScene.findMany({
      where: {
        organizationId,
        ...(providerKey ? { sourceVendor: providerKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async registerScene(
    organizationId: string,
    data: {
      sceneKey?: string;
      sourceVendor: string;
      capturedAt?: Date;
      bbox?: Record<string, unknown>;
      cloudCoverPct?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappSatelliteScene.count({ where: { organizationId } });
    const sceneKey = data.sceneKey ?? generateEappKey('SCN', count + 1);
    const provider = await this.prisma.eappSatelliteProvider.findFirst({
      where: { organizationId, providerKey: data.sourceVendor },
    });
    return this.prisma.eappSatelliteScene.create({
      data: {
        organizationId,
        sceneKey,
        providerId: provider?.id,
        sourceVendor: data.sourceVendor,
        capturedAt: data.capturedAt,
        bbox: (data.bbox ?? {}) as object,
        cloudCoverPct: data.cloudCoverPct,
        status: 'pending',
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }
}
