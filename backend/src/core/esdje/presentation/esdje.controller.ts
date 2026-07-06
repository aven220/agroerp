import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EsdjeJobDefinition } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { JobDefinitionsService } from '../application/job-definitions.service';
import { JobQueueService } from '../application/job-queue.service';
import { JobDispatcherService } from '../application/job-dispatcher.service';
import { JobWorkerPoolService } from '../application/job-worker-pool.service';
import { JobDeadLetterService } from '../application/job-dead-letter.service';
import { JobMaintenanceService } from '../application/job-maintenance.service';
import { JobMetricsService } from '../application/job-metrics.service';
import { JobAiService } from '../application/job-ai.service';
import {
  CloneEsdjeJobDto,
  CreateEsdjeJobDto,
  CreateEsdjeQueueDto,
  CreateMaintenanceWindowDto,
  UpdateEsdjeJobDto,
} from './esdje.dto';

@ApiTags('ESDJE — Enterprise Scheduler & Distributed Job Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('esdje')
export class EsdjeController {
  constructor(
    private readonly jobs: JobDefinitionsService,
    private readonly queues: JobQueueService,
    private readonly dispatcher: JobDispatcherService,
    private readonly workers: JobWorkerPoolService,
    private readonly deadLetter: JobDeadLetterService,
    private readonly maintenance: JobMaintenanceService,
    private readonly metrics: JobMetricsService,
    private readonly ai: JobAiService,
  ) {}

  @Get('center')
  @RequirePermissions('scheduler:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, suggestions] = await Promise.all([
      this.metrics.dashboard(user.organizationId),
      this.ai.suggestOptimizations(user.organizationId),
    ]);
    return { dashboard, suggestions };
  }

  @Get('jobs')
  @RequirePermissions('scheduler:read')
  listJobs(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.jobs.findAll(user.organizationId, status);
  }

  @Get('jobs/:id')
  @RequirePermissions('scheduler:read')
  getJob(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.jobs.findOne(user.organizationId, id);
  }

  @Post('jobs')
  @RequirePermissions('scheduler:create')
  createJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateEsdjeJobDto,
  ) {
    return this.jobs.create(user.organizationId, user.id, dto as EsdjeJobDefinition);
  }

  @Patch('jobs/:id')
  @RequirePermissions('scheduler:update')
  updateJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateEsdjeJobDto,
  ) {
    return this.jobs.update(user.organizationId, id, user.id, dto as Partial<EsdjeJobDefinition>);
  }

  @Post('jobs/:id/pause')
  @RequirePermissions('scheduler:update')
  pauseJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.jobs.pause(user.organizationId, id, user.id);
  }

  @Post('jobs/:id/resume')
  @RequirePermissions('scheduler:update')
  resumeJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.jobs.resume(user.organizationId, id, user.id);
  }

  @Post('jobs/:id/cancel')
  @RequirePermissions('scheduler:update')
  cancelJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.jobs.cancel(user.organizationId, id, user.id);
  }

  @Post('jobs/:id/run')
  @RequirePermissions('scheduler:execute')
  runJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.dispatcher.runNow(user.organizationId, id, user.id);
  }

  @Delete('jobs/:id')
  @RequirePermissions('scheduler:admin')
  deleteJob(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.jobs.softDelete(user.organizationId, id, user.id);
  }

  @Get('runs')
  @RequirePermissions('scheduler:audit:read')
  listRuns(
    @CurrentUser() user: { organizationId: string },
    @Query('jobId') jobId?: string,
  ) {
    return this.jobs.listRuns(user.organizationId, jobId);
  }

  @Get('calendar')
  @RequirePermissions('scheduler:read')
  calendar(@CurrentUser() user: { organizationId: string }) {
    return this.jobs.calendar(user.organizationId);
  }

  @Get('queues')
  @RequirePermissions('scheduler:read')
  listQueues(@CurrentUser() user: { organizationId: string }) {
    return this.queues.findAll(user.organizationId);
  }

  @Post('queues')
  @RequirePermissions('scheduler:queue:manage')
  createQueue(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateEsdjeQueueDto,
  ) {
    return this.queues.create(user.organizationId, dto);
  }

  @Get('workers')
  @RequirePermissions('scheduler:read')
  listWorkers(@CurrentUser() user: { organizationId: string }) {
    return this.workers.listWorkers(user.organizationId);
  }

  @Get('dead-letters')
  @RequirePermissions('scheduler:audit:read')
  listDeadLetters(
    @CurrentUser() user: { organizationId: string },
    @Query('all') all?: string,
  ) {
    return this.deadLetter.findAll(user.organizationId, all !== 'true');
  }

  @Post('dead-letters/:id/resolve')
  @RequirePermissions('scheduler:admin')
  resolveDeadLetter(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.deadLetter.resolve(user.organizationId, id);
  }

  @Post('dead-letters/:id/requeue')
  @RequirePermissions('scheduler:execute')
  requeueDeadLetter(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.deadLetter.requeue(user.organizationId, id);
  }

  @Get('maintenance')
  @RequirePermissions('scheduler:read')
  listMaintenance(@CurrentUser() user: { organizationId: string }) {
    return this.maintenance.findAll(user.organizationId);
  }

  @Post('maintenance')
  @RequirePermissions('scheduler:admin')
  createMaintenance(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateMaintenanceWindowDto,
  ) {
    return this.maintenance.create(user.organizationId, dto);
  }

  @Get('ai/suggestions')
  @RequirePermissions('scheduler:read')
  aiSuggestions(@CurrentUser() user: { organizationId: string }) {
    return this.ai.suggestOptimizations(user.organizationId);
  }

  @Get('mobile/jobs')
  @ApiOperation({ summary: 'Tareas para app móvil' })
  @RequirePermissions('scheduler:read')
  async mobileJobs(@CurrentUser() user: { organizationId: string }) {
    const jobs = await this.jobs.findAll(user.organizationId);
    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        jobKey: j.jobKey,
        name: j.name,
        status: j.status,
        jobType: j.jobType,
        nextRunAt: j.nextRunAt,
        handlerType: j.handlerType,
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('mobile/runs')
  @ApiOperation({ summary: 'Historial reciente para app móvil' })
  @RequirePermissions('scheduler:read')
  async mobileRuns(@CurrentUser() user: { organizationId: string }) {
    const runs = await this.jobs.listRuns(user.organizationId);
    return runs.slice(0, 50).map((r) => ({
      id: r.id,
      jobKey: r.jobKey,
      status: r.status,
      attempt: r.attempt,
      durationMs: r.durationMs,
      error: r.error,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
    }));
  }
}
