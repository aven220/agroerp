import { Injectable } from '@nestjs/common';
import { EopsRunStatus } from '@agroerp/prisma-eops-client';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAuditService } from './eops-audit.service';
import { computeChecksum, generateEopsKey, mapRunStatus } from '../domain/eops.engine';

@Injectable()
export class EopsBackupService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly audit: EopsAuditService,
  ) {}

  listSchedules(organizationId: string) {
    return this.prisma.eopsBackupSchedule.findMany({ where: { organizationId }, include: { runs: { take: 5, orderBy: { startedAt: 'desc' } } } });
  }

  createSchedule(
    organizationId: string,
    userId: string,
    scheduleKey: string,
    name: string,
    targetType: string,
    cron: string,
    retentionDays = 30,
  ) {
    return this.prisma.eopsBackupSchedule.upsert({
      where: { organizationId_scheduleKey: { organizationId, scheduleKey } },
      create: { organizationId, scheduleKey, name, targetType, cron, retentionDays, createdBy: userId },
      update: { name, targetType, cron, retentionDays },
    });
  }

  listRuns(organizationId: string) {
    return this.prisma.eopsBackupRun.findMany({ where: { organizationId }, orderBy: { startedAt: 'desc' }, take: 100 });
  }

  listRestores(organizationId: string) {
    return this.prisma.eopsRestoreRun.findMany({ where: { organizationId }, orderBy: { startedAt: 'desc' } });
  }

  async runBackup(organizationId: string, userId: string, scheduleKey?: string, payload?: Record<string, unknown>) {
    const count = await this.prisma.eopsBackupRun.count({ where: { organizationId } });
    const runKey = generateEopsKey('BKP', count + 1);
    const schedule = scheduleKey
      ? await this.prisma.eopsBackupSchedule.findFirst({ where: { organizationId, scheduleKey } })
      : null;
    await this.audit.log(organizationId, 'Backup', runKey, 'backup_started', userId);
    const checksum = computeChecksum(JSON.stringify(payload ?? { ts: Date.now() }));
    const row = await this.prisma.eopsBackupRun.create({
      data: {
        organizationId,
        scheduleId: schedule?.id,
        runKey,
        checksum,
        sizeBytes: BigInt(JSON.stringify(payload ?? {}).length),
        status: 'completed' as EopsRunStatus,
        completedAt: new Date(),
        metadata: (payload ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'Backup', runKey, 'backup_completed', userId, { checksum });
    return row;
  }

  async restore(organizationId: string, userId: string, backupRunKey: string, validate = true) {
    const count = await this.prisma.eopsRestoreRun.count({ where: { organizationId } });
    const restoreKey = generateEopsKey('RST', count + 1);
    await this.audit.log(organizationId, 'Restore', restoreKey, 'restore_started', userId, { backupRunKey });
    const backup = await this.prisma.eopsBackupRun.findFirst({ where: { organizationId, runKey: backupRunKey } });
    const valid = !!backup?.checksum;
    const row = await this.prisma.eopsRestoreRun.create({
      data: {
        organizationId,
        restoreKey,
        backupRunKey,
        status: mapRunStatus(valid),
        validated: validate && valid,
        startedBy: userId,
        completedAt: new Date(),
        metadata: { checksum: backup?.checksum },
      },
    });
    await this.audit.log(organizationId, 'Restore', restoreKey, 'restore_completed', userId);
    return row;
  }
}
