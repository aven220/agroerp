import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class JobMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 86_400_000);

    const [
      totalJobs,
      activeJobs,
      runs24h,
      failures24h,
      avgDuration,
      queuedRuns,
      runningRuns,
      deadLetters,
      onlineWorkers,
    ] = await Promise.all([
      this.prisma.esdjeJob.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.esdjeJob.count({
        where: { organizationId, deletedAt: null, status: { in: ['pending', 'queued', 'running'] } },
      }),
      this.prisma.esdjeJobRun.count({ where: { organizationId, createdAt: { gte: since24h } } }),
      this.prisma.esdjeJobRun.count({
        where: { organizationId, createdAt: { gte: since24h }, status: 'failed' },
      }),
      this.prisma.esdjeJobRun.aggregate({
        where: { organizationId, createdAt: { gte: since24h }, durationMs: { gt: 0 } },
        _avg: { durationMs: true },
      }),
      this.prisma.esdjeJobRun.count({ where: { organizationId, status: 'queued' } }),
      this.prisma.esdjeJobRun.count({ where: { organizationId, status: 'running' } }),
      this.prisma.esdjeDeadLetter.count({ where: { organizationId, isResolved: false } }),
      this.prisma.esdjeWorker.count({
        where: {
          organizationId,
          status: { in: ['online', 'busy'] },
          lastHeartbeat: { gte: new Date(Date.now() - 120_000) },
        },
      }),
    ]);

    const topJobs = await this.prisma.esdjeJobRun.groupBy({
      by: ['jobKey'],
      where: { organizationId, createdAt: { gte: since24h } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const queueStats = await this.prisma.esdjeJobQueue.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { jobs: true } } },
      orderBy: { priority: 'asc' },
    });

    return {
      totalJobs,
      activeJobs,
      runs24h,
      failures24h,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      queuedRuns,
      runningRuns,
      deadLetters,
      onlineWorkers,
      successRatePct: runs24h ? Math.round(((runs24h - failures24h) / runs24h) * 100) : 100,
      topJobs: topJobs.map((j) => ({ jobKey: j.jobKey, count: j._count.id })),
      queues: queueStats.map((q) => ({
        queueKey: q.queueKey,
        name: q.name,
        priority: q.priority,
        jobCount: q._count.jobs,
        maxConcurrency: q.maxConcurrency,
      })),
    };
  }
}
