import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class JobDeadLetterService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    organizationId: string,
    job: { id: string; jobKey: string },
    runId: string | null,
    payload: unknown,
    error: string,
    attempts: number,
  ) {
    await this.prisma.esdjeJob.update({
      where: { id: job.id },
      data: { status: 'dead_letter' },
    });
    return this.prisma.esdjeDeadLetter.create({
      data: {
        organizationId,
        jobId: job.id,
        jobKey: job.jobKey,
        runId: runId ?? undefined,
        payload: (payload ?? {}) as object,
        error,
        attempts,
      },
    });
  }

  findAll(organizationId: string, unresolvedOnly = true) {
    return this.prisma.esdjeDeadLetter.findMany({
      where: { organizationId, ...(unresolvedOnly ? { isResolved: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolve(organizationId: string, id: string) {
    return this.prisma.esdjeDeadLetter.updateMany({
      where: { id, organizationId },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }

  async requeue(organizationId: string, id: string) {
    const dl = await this.prisma.esdjeDeadLetter.findFirst({
      where: { id, organizationId },
    });
    if (!dl) return null;
    await this.prisma.esdjeJob.update({
      where: { id: dl.jobId },
      data: { status: 'pending', nextRunAt: new Date() },
    });
    await this.resolve(organizationId, id);
    return { requeued: true, jobId: dl.jobId };
  }
}
