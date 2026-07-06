import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { JobSchedulerService } from './job-scheduler.service';
import { JobWorkerPoolService } from './job-worker-pool.service';
import { JobExecutorService } from './job-executor.service';
import { JobRetryEngine } from './job-retry.engine';
import { JobDeadLetterService } from './job-dead-letter.service';
import { JobMaintenanceService } from './job-maintenance.service';

@Injectable()
export class JobDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(JobDispatcherService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly scheduler: JobSchedulerService,
    private readonly workers: JobWorkerPoolService,
    private readonly executor: JobExecutorService,
    private readonly retry: JobRetryEngine,
    private readonly deadLetter: JobDeadLetterService,
    private readonly maintenance: JobMaintenanceService,
  ) {}

  onModuleInit() {
    const timer = setInterval(() => this.tick().catch((e) => {
      this.logger.error(`Dispatch tick failed: ${(e as Error).message}`);
    }), 5000);
    timer.unref?.();
    this.logger.log('ESDJE dispatcher started (5s interval)');
  }

  async tick() {
    if (this.processing) return;
    this.processing = true;
    try {
      const dueJobs = await this.scheduler.findDueJobs(100);
      for (const job of dueJobs) {
        const queueKey = job.queue?.queueKey;
        if (await this.maintenance.isBlocked(job.organizationId, queueKey)) continue;
        if (!(await this.dependenciesMet(job.organizationId, job.dependencies))) continue;
        await this.dispatchJob(job);
      }

      const now = new Date();
      const queuedRuns = await this.prisma.esdjeJobRun.findMany({
        where: { status: 'queued', createdAt: { lte: now } },
        include: { job: { include: { queue: true } } },
        orderBy: [{ job: { priority: 'asc' } }, { createdAt: 'asc' }],
        take: 50,
      });
      for (const run of queuedRuns) {
        await this.executeRun(run);
      }
    } finally {
      this.processing = false;
    }
  }

  async dispatchJob(
    job: {
      id: string;
      organizationId: string;
      jobKey: string;
      payload: unknown;
      maxRetries: number;
      retryStrategy: string;
      retryDelayMs: number;
      jobType: string;
      cronExpression?: string | null;
      schedule: unknown;
      timezone: string;
      businessDaysOnly: boolean;
      lastRunAt?: Date | null;
      queue?: { queueKey: string; maxConcurrency: number } | null;
    },
    triggeredBy?: string,
  ) {
    const activeRuns = await this.prisma.esdjeJobRun.count({
      where: { jobId: job.id, status: 'running' },
    });
    const maxConc = job.queue?.maxConcurrency ?? 5;
    if (activeRuns >= maxConc) return null;

    const run = await this.prisma.esdjeJobRun.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        jobKey: job.jobKey,
        status: 'queued',
        inputPayload: (job.payload ?? {}) as object,
        triggeredBy,
      },
    });

    await this.prisma.esdjeJob.update({
      where: { id: job.id },
      data: { status: 'queued' },
    });

    await this.core.emitUserAction(
      job.organizationId,
      'Job',
      job.id,
      EVENT_TYPES.JOB_SCHEDULED,
      { jobKey: job.jobKey, runId: run.id },
    );

    return run;
  }

  async executeRun(run: {
    id: string;
    organizationId: string;
    jobId: string;
    jobKey: string;
    attempt: number;
    inputPayload: unknown;
    triggeredBy?: string | null;
    job: {
      handlerType: string;
      payload: unknown;
      maxRetries: number;
      retryStrategy: string;
      retryDelayMs: number;
      jobType: string;
      cronExpression?: string | null;
      schedule: unknown;
      timezone: string;
      businessDaysOnly: boolean;
      lastRunAt?: Date | null;
      queue?: { moduleKey?: string } | null;
    };
  }) {
    const worker = await this.workers.pickWorker(
      run.organizationId,
      run.job.queue?.moduleKey,
    );
    if (!worker) return;

    const started = Date.now();
    await this.prisma.esdjeJobRun.update({
      where: { id: run.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        workerId: worker.id,
        workerNode: worker.nodeId,
      },
    });
    await this.workers.incrementLoad(worker.id, 1);

    await this.core.emitUserAction(
      run.organizationId,
      'Job',
      run.jobId,
      EVENT_TYPES.JOB_STARTED,
      { runId: run.id, workerNode: worker.nodeId },
    );

    try {
      const output = await this.executor.execute(
        run.organizationId,
        {
          id: run.jobId,
          jobKey: run.jobKey,
          handlerType: run.job.handlerType,
          payload: run.inputPayload ?? run.job.payload,
        },
        run.triggeredBy ?? undefined,
      );

      const durationMs = Date.now() - started;
      await this.prisma.esdjeJobRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          durationMs,
          output: output as object,
        },
      });

      const nextRunAt = await this.scheduler.computeNextRun({
        cronExpression: run.job.cronExpression,
        schedule: run.job.schedule,
        timezone: run.job.timezone,
        businessDaysOnly: run.job.businessDaysOnly,
        lastRunAt: new Date(),
      });

      const jobStatus =
        run.job.jobType === 'one_time' && !nextRunAt ? 'completed' : 'pending';

      await this.prisma.esdjeJob.update({
        where: { id: run.jobId },
        data: {
          status: jobStatus,
          lastRunAt: new Date(),
          nextRunAt: nextRunAt ?? undefined,
          runAt: null,
        },
      });

      await this.core.emitUserAction(
        run.organizationId,
        'Job',
        run.jobId,
        EVENT_TYPES.JOB_COMPLETED,
        { runId: run.id, durationMs },
      );
    } catch (err) {
      const error = (err as Error).message;
      const durationMs = Date.now() - started;
      await this.prisma.esdjeJobRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          durationMs,
          error,
        },
      });

      if (this.retry.shouldRetry(run.attempt, run.job.maxRetries)) {
        const delay = this.retry.computeDelay(
          run.job.retryStrategy,
          run.job.retryDelayMs,
          run.attempt,
        );
        await this.prisma.esdjeJobRun.create({
          data: {
            organizationId: run.organizationId,
            jobId: run.jobId,
            jobKey: run.jobKey,
            status: 'queued',
            attempt: run.attempt + 1,
            inputPayload: run.inputPayload as object,
            triggeredBy: run.triggeredBy ?? undefined,
            createdAt: new Date(Date.now() + delay),
          },
        });
        await this.prisma.esdjeJob.update({
          where: { id: run.jobId },
          data: { status: 'pending', nextRunAt: new Date(Date.now() + delay) },
        });
        await this.core.emitUserAction(
          run.organizationId,
          'Job',
          run.jobId,
          EVENT_TYPES.JOB_RETRY_SCHEDULED,
          { runId: run.id, attempt: run.attempt + 1, delayMs: delay },
        );
      } else {
        await this.deadLetter.enqueue(
          run.organizationId,
          { id: run.jobId, jobKey: run.jobKey },
          run.id,
          run.inputPayload,
          error,
          run.attempt,
        );
        await this.core.emitUserAction(
          run.organizationId,
          'Job',
          run.jobId,
          EVENT_TYPES.JOB_FAILED,
          { runId: run.id, error },
        );
        await this.core.emitUserAction(
          run.organizationId,
          'Job',
          run.jobId,
          EVENT_TYPES.JOB_DEAD_LETTERED,
          { runId: run.id },
        );
      }
    } finally {
      if (worker) await this.workers.incrementLoad(worker.id, -1);
    }
  }

  async runNow(organizationId: string, jobId: string, userId?: string) {
    const job = await this.prisma.esdjeJob.findFirst({
      where: { id: jobId, organizationId, deletedAt: null },
      include: { queue: true },
    });
    if (!job) return null;
    return this.dispatchJob(job, userId);
  }

  private async dependenciesMet(organizationId: string, dependencies: string[]): Promise<boolean> {
    if (!dependencies?.length) return true;
    const completed = await this.prisma.esdjeJob.findMany({
      where: {
        organizationId,
        jobKey: { in: dependencies },
        status: 'completed',
        lastRunAt: { gte: new Date(Date.now() - 86_400_000) },
      },
    });
    return completed.length === dependencies.length;
  }
}
