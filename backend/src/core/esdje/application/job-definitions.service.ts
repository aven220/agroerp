import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EsdjeJobDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { JobQueueService } from './job-queue.service';
import { JobSchedulerService } from './job-scheduler.service';

@Injectable()
export class JobDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: JobQueueService,
    private readonly scheduler: JobSchedulerService,
  ) {}

  findAll(organizationId: string, status?: string) {
    return this.prisma.esdjeJob.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status: status as 'pending' } : {}),
      },
      include: { queue: true },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const job = await this.prisma.esdjeJob.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { queue: true },
    });
    if (!job) throw new NotFoundException('Tarea no encontrada');
    return job;
  }

  async create(organizationId: string, userId: string, dto: EsdjeJobDefinition) {
    const existing = await this.prisma.esdjeJob.findFirst({
      where: { organizationId, jobKey: dto.jobKey, deletedAt: null },
    });
    if (existing) throw new BadRequestException(`Tarea ${dto.jobKey} ya existe`);

    let queueId: string | undefined;
    if (dto.queueKey) {
      const queue = await this.prisma.esdjeJobQueue.findFirst({
        where: { organizationId, queueKey: dto.queueKey },
      });
      queueId = queue?.id;
    } else {
      queueId = (await this.queues.getOrCreateDefault(organizationId)).id;
    }

    const runAt = dto.runAt ? new Date(dto.runAt) : undefined;
    const job = await this.prisma.esdjeJob.create({
      data: {
        organizationId,
        queueId,
        jobKey: dto.jobKey,
        name: dto.name,
        description: dto.description,
        jobType: dto.jobType ?? 'scheduled',
        handlerType: dto.handlerType,
        payload: (dto.payload ?? {}) as object,
        schedule: (dto.schedule ?? {}) as object,
        cronExpression: dto.cronExpression ?? dto.schedule?.cron,
        timezone: dto.timezone ?? dto.schedule?.timezone ?? 'America/Bogota',
        runAt,
        nextRunAt: runAt,
        eventTypes: dto.eventTypes ?? [],
        dependencies: dto.dependencies ?? [],
        maxRetries: dto.maxRetries ?? 3,
        retryStrategy: dto.retryStrategy ?? 'exponential',
        retryDelayMs: dto.retryDelayMs ?? 1000,
        timeoutMs: dto.timeoutMs ?? 300000,
        priority: dto.priority ?? 100,
        parallelism: dto.parallelism ?? 1,
        businessDaysOnly: dto.businessDaysOnly ?? dto.schedule?.businessDaysOnly ?? false,
        metadata: (dto.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const nextRunAt = await this.scheduler.computeNextRun(job);
    if (nextRunAt) {
      await this.prisma.esdjeJob.update({
        where: { id: job.id },
        data: { nextRunAt },
      });
    }
    return job;
  }

  async update(organizationId: string, id: string, userId: string, dto: Partial<EsdjeJobDefinition>) {
    await this.findOne(organizationId, id);
    const job = await this.prisma.esdjeJob.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        jobType: dto.jobType,
        handlerType: dto.handlerType,
        payload: dto.payload as object,
        schedule: dto.schedule as object,
        cronExpression: dto.cronExpression ?? dto.schedule?.cron,
        timezone: dto.timezone,
        runAt: dto.runAt ? new Date(dto.runAt) : undefined,
        eventTypes: dto.eventTypes,
        dependencies: dto.dependencies,
        maxRetries: dto.maxRetries,
        retryStrategy: dto.retryStrategy,
        retryDelayMs: dto.retryDelayMs,
        timeoutMs: dto.timeoutMs,
        priority: dto.priority,
        parallelism: dto.parallelism,
        businessDaysOnly: dto.businessDaysOnly,
        metadata: dto.metadata as object,
        updatedBy: userId,
      },
    });
    const nextRunAt = await this.scheduler.computeNextRun(job);
    if (nextRunAt) {
      await this.prisma.esdjeJob.update({ where: { id }, data: { nextRunAt } });
    }
    return job;
  }

  async pause(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    return this.prisma.esdjeJob.update({
      where: { id },
      data: { status: 'paused', updatedBy: userId },
    });
  }

  async resume(organizationId: string, id: string, userId: string) {
    const job = await this.findOne(organizationId, id);
    const nextRunAt = await this.scheduler.computeNextRun(job);
    return this.prisma.esdjeJob.update({
      where: { id },
      data: { status: 'pending', nextRunAt: nextRunAt ?? new Date(), updatedBy: userId },
    });
  }

  async cancel(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    return this.prisma.esdjeJob.update({
      where: { id },
      data: { status: 'cancelled', updatedBy: userId },
    });
  }

  async softDelete(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    return this.prisma.esdjeJob.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'cancelled', updatedBy: userId },
    });
  }

  listRuns(organizationId: string, jobId?: string) {
    return this.prisma.esdjeJobRun.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  calendar(organizationId: string) {
    return this.prisma.esdjeJob.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['pending', 'queued', 'paused'] },
      },
      select: {
        id: true,
        jobKey: true,
        name: true,
        jobType: true,
        nextRunAt: true,
        runAt: true,
        cronExpression: true,
        timezone: true,
        priority: true,
      },
      orderBy: { nextRunAt: 'asc' },
      take: 500,
    });
  }
}
