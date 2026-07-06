import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeTwinDelta } from '../domain/digital-twin.engine';

@Injectable()
export class DeviceDigitalTwinService {
  constructor(private readonly prisma: PrismaService) {}

  async getTwin(deviceId: string) {
    return this.prisma.eiesdpDigitalTwin.findUnique({ where: { deviceId } });
  }

  async updateReported(deviceId: string, reported: Record<string, unknown>) {
    const twin = await this.prisma.eiesdpDigitalTwin.upsert({
      where: { deviceId },
      update: {
        reportedState: reported as object,
        version: { increment: 1 },
        delta: {} as object,
      },
      create: { deviceId, reportedState: reported as object },
    });
    const desired = twin.desiredState as Record<string, unknown>;
    const delta = computeTwinDelta(desired, reported as Record<string, unknown>);
    if (Object.keys(delta).length) {
      await this.prisma.eiesdpDigitalTwin.update({
        where: { deviceId },
        data: { delta: delta as object },
      });
    }
    return twin;
  }

  async updateDesired(deviceId: string, desired: Record<string, unknown>) {
    return this.prisma.eiesdpDigitalTwin.upsert({
      where: { deviceId },
      update: { desiredState: desired as object, version: { increment: 1 } },
      create: { deviceId, desiredState: desired as object },
    });
  }
}
