import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class JobMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async isBlocked(organizationId: string, queueKey?: string): Promise<boolean> {
    const now = new Date();
    const windows = await this.prisma.esdjeMaintenanceWindow.findMany({
      where: {
        organizationId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    if (!windows.length) return false;
    for (const w of windows) {
      if (w.blockAllJobs) {
        if (!queueKey || !w.allowedQueues.includes(queueKey)) return true;
      }
    }
    return false;
  }

  findAll(organizationId: string) {
    return this.prisma.esdjeMaintenanceWindow.findMany({
      where: { organizationId, isActive: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  create(
    organizationId: string,
    data: {
      name: string;
      startsAt: string;
      endsAt: string;
      timezone?: string;
      blockAllJobs?: boolean;
      allowedQueues?: string[];
    },
  ) {
    return this.prisma.esdjeMaintenanceWindow.create({
      data: {
        organizationId,
        name: data.name,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        timezone: data.timezone ?? 'America/Bogota',
        blockAllJobs: data.blockAllJobs ?? true,
        allowedQueues: data.allowedQueues ?? [],
      },
    });
  }
}
