import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { isBusinessDay, isWithinAllowedHours, matchesCron, nextCronRun } from './job-cron.util';

@Injectable()
export class JobSchedulerService {
  constructor(private readonly prisma: PrismaService) {}

  async computeNextRun(job: {
    cronExpression?: string | null;
    schedule: unknown;
    timezone: string;
    businessDaysOnly: boolean;
    lastRunAt?: Date | null;
  }): Promise<Date | null> {
    const schedule = job.schedule as {
      intervalMinutes?: number;
      runAt?: string;
      allowedHours?: { start: string; end: string };
    };
    const now = new Date();

    if (schedule.runAt) {
      const runAt = new Date(schedule.runAt);
      return runAt > now ? runAt : null;
    }

    if (job.cronExpression) {
      let next = nextCronRun(job.cronExpression, now);
      if (job.businessDaysOnly) {
        while (!isBusinessDay(next)) next = new Date(next.getTime() + 86_400_000);
      }
      if (!isWithinAllowedHours(next, schedule.allowedHours)) {
        next = new Date(next.getTime() + 3_600_000);
      }
      return next;
    }

    if (schedule.intervalMinutes) {
      const base = job.lastRunAt ?? now;
      return new Date(base.getTime() + schedule.intervalMinutes * 60_000);
    }

    return null;
  }

  async findDueJobs(limit = 200) {
    const now = new Date();
    return this.prisma.esdjeJob.findMany({
      where: {
        deletedAt: null,
        status: { in: ['pending', 'queued'] },
        OR: [
          { nextRunAt: { lte: now } },
          { runAt: { lte: now } },
        ],
      },
      include: { queue: true },
      orderBy: [{ priority: 'asc' }, { nextRunAt: 'asc' }],
      take: limit,
    });
  }

  isCronDue(cronExpression: string, date = new Date()): boolean {
    return matchesCron(cronExpression, date);
  }
}
