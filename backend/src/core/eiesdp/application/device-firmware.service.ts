import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class DeviceFirmwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  listReleases(organizationId: string) {
    return this.prisma.eiesdpFirmwareRelease.findMany({
      where: { organizationId },
      include: { _count: { select: { deployments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createRelease(organizationId: string, data: {
    releaseKey: string;
    deviceType: string;
    version: string;
    checksum: string;
    downloadUrl?: string;
    releaseNotes?: string;
  }) {
    return this.prisma.eiesdpFirmwareRelease.create({
      data: {
        organizationId,
        releaseKey: data.releaseKey,
        deviceType: data.deviceType as 'temperature_sensor',
        version: data.version,
        checksum: data.checksum,
        downloadUrl: data.downloadUrl,
        releaseNotes: data.releaseNotes,
      },
    });
  }

  async deploy(organizationId: string, releaseId: string, deviceId: string) {
    const deployment = await this.prisma.eiesdpFirmwareDeployment.create({
      data: { releaseId, deviceId, status: 'deploying', scheduledAt: new Date() },
      include: { release: true, device: true },
    });
    await this.prisma.eiesdpFirmwareDeployment.update({
      where: { id: deployment.id },
      data: { status: 'deployed', deployedAt: new Date() },
    });
    await this.prisma.eiesdpDevice.update({
      where: { id: deviceId },
      data: { firmwareVersion: deployment.release.version },
    });
    await this.core.emitUserAction(
      organizationId,
      'Device',
      deviceId,
      EVENT_TYPES.FIRMWARE_DEPLOYED,
      { version: deployment.release.version, releaseKey: deployment.release.releaseKey },
    );
    return deployment;
  }

  listDeployments(deviceId?: string) {
    return this.prisma.eiesdpFirmwareDeployment.findMany({
      where: { ...(deviceId ? { deviceId } : {}) },
      include: { release: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
