import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class JobQueueService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.esdjeJobQueue.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { jobs: true } } },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    organizationId: string,
    data: {
      queueKey: string;
      name: string;
      moduleKey?: string;
      priority?: string;
      maxConcurrency?: number;
    },
  ) {
    return this.prisma.esdjeJobQueue.create({
      data: {
        organizationId,
        queueKey: data.queueKey,
        name: data.name,
        moduleKey: data.moduleKey ?? 'core',
        priority: (data.priority as 'normal') ?? 'normal',
        maxConcurrency: data.maxConcurrency ?? 5,
      },
    });
  }

  async getOrCreateDefault(organizationId: string) {
    const existing = await this.prisma.esdjeJobQueue.findFirst({
      where: { organizationId, queueKey: 'default' },
    });
    if (existing) return existing;
    return this.create(organizationId, {
      queueKey: 'default',
      name: 'Cola principal',
      moduleKey: 'core',
      priority: 'normal',
    });
  }
}
