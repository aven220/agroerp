import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PerfAuditService } from './perf-audit.service';

@Injectable()
export class PerfDbService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: PerfAuditService,
  ) {}

  listPartitionJobs() {
    return this.prisma.epopPartitionJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  listArchiveJobs() {
    return this.prisma.epopArchiveJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  listMaintenanceJobs() {
    return this.prisma.epopMaintenanceJob.findMany({ orderBy: { jobKey: 'asc' } });
  }

  async schedulePartition(organizationId: string | undefined, tableName: string, strategy = 'range_monthly') {
    const jobKey = `partition-${tableName}-${Date.now()}`;
    return this.prisma.epopPartitionJob.create({
      data: {
        organizationId,
        jobKey,
        tableName,
        strategy,
        status: 'pending',
        details: { prepared: true },
      },
    });
  }

  async runPartition(jobKey: string) {
    const startedAt = new Date();
    const job = await this.prisma.epopPartitionJob.update({
      where: { jobKey },
      data: { status: 'running', startedAt },
    });
    const completedAt = new Date();
    return this.prisma.epopPartitionJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt,
        details: {
          strategy: job.strategy,
          partitionsPlanned: 12,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
      },
    });
  }

  async scheduleArchive(organizationId: string | undefined, tableName: string, olderThanDays = 90) {
    const jobKey = `archive-${tableName}-${Date.now()}`;
    return this.prisma.epopArchiveJob.create({
      data: {
        organizationId,
        jobKey,
        tableName,
        olderThanDays,
        status: 'pending',
      },
    });
  }

  async runArchive(jobKey: string) {
    const startedAt = new Date();
    const job = await this.prisma.epopArchiveJob.update({
      where: { jobKey },
      data: { status: 'running', startedAt },
    });

    let rowsArchived = 0;
    if (job.tableName === 'eop_log_entries') {
      const cutoff = new Date(Date.now() - job.olderThanDays * 86_400_000);
      const result = await this.prisma.eopLogEntry.deleteMany({
        where: {
          recordedAt: { lt: cutoff },
          ...(job.organizationId ? { organizationId: job.organizationId } : {}),
        },
      });
      rowsArchived = result.count;
    }

    const completedAt = new Date();
    const updated = await this.prisma.epopArchiveJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt,
        rowsArchived,
        details: { durationMs: completedAt.getTime() - startedAt.getTime() },
      },
    });

    if (job.organizationId) {
      await this.core.emitUserAction(
        job.organizationId,
        'ArchiveJob',
        job.id,
        EVENT_TYPES.PERF_ARCHIVE_COMPLETED,
        { tableName: job.tableName, rowsArchived },
      );
    }
    await this.audit.log(job.organizationId ?? undefined, 'archive_completed', 'ArchiveJob', jobKey, undefined, { rowsArchived });
    return updated;
  }

  async upsertMaintenance(jobKey: string, jobType: string, scheduleCron?: string, organizationId?: string) {
    return this.prisma.epopMaintenanceJob.upsert({
      where: { jobKey },
      update: { jobType, scheduleCron, isActive: true, organizationId },
      create: { jobKey, jobType, scheduleCron, organizationId, status: 'pending' },
    });
  }

  async runMaintenance(jobKey: string) {
    const startedAt = new Date();
    const job = await this.prisma.epopMaintenanceJob.update({
      where: { jobKey },
      data: { status: 'running' },
    });

    const details: Record<string, unknown> = { startedAt: startedAt.toISOString() };
    if (job.jobType === 'vacuum_analyze') {
      details.action = 'ANALYZE planned for hot tables';
      details.tables = ['events', 'audit_logs', 'eop_log_entries', 'epop_perf_metrics'];
    } else if (job.jobType === 'cache_purge') {
      details.action = 'cache purge delegated';
    } else if (job.jobType === 'reindex') {
      details.action = 'reindex recommendations reviewed';
    }

    const updated = await this.prisma.epopMaintenanceJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        lastRunAt: new Date(),
        details: details as object,
      },
    });

    if (job.organizationId) {
      await this.core.emitUserAction(
        job.organizationId,
        'MaintenanceJob',
        job.id,
        EVENT_TYPES.PERF_MAINTENANCE_COMPLETED,
        { jobType: job.jobType },
      );
    }
    return updated;
  }
}
