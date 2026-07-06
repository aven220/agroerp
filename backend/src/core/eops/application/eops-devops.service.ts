import { Injectable } from '@nestjs/common';
import { EopsDeploymentStatus, EopsRunStatus } from '@agroerp/prisma-eops-client';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAuditService } from './eops-audit.service';
import { generateEopsKey } from '../domain/eops.engine';

@Injectable()
export class EopsDevopsService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly audit: EopsAuditService,
  ) {}

  listDeployments(organizationId: string) {
    return this.prisma.eopsDeployment.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async createDeployment(
    organizationId: string,
    userId: string,
    deploymentKey: string,
    version: string,
    environment = 'production',
    changelog?: string,
  ) {
    await this.audit.log(organizationId, 'Deployment', deploymentKey, 'deployment_started', userId, { version });
    const row = await this.prisma.eopsDeployment.upsert({
      where: { organizationId_deploymentKey: { organizationId, deploymentKey } },
      create: {
        organizationId,
        deploymentKey,
        version,
        environment,
        changelog,
        status: 'deployed' as EopsDeploymentStatus,
        deployedBy: userId,
        deployedAt: new Date(),
      },
      update: {
        version,
        changelog,
        status: 'deployed',
        deployedBy: userId,
        deployedAt: new Date(),
      },
    });
    await this.audit.log(organizationId, 'Deployment', deploymentKey, 'deployment_completed', userId);
    return row;
  }

  async rollback(organizationId: string, userId: string, deploymentKey: string) {
    const row = await this.prisma.eopsDeployment.update({
      where: { organizationId_deploymentKey: { organizationId, deploymentKey } },
      data: { status: 'rolled_back', rolledBackAt: new Date() },
    });
    await this.audit.log(organizationId, 'Deployment', deploymentKey, 'rollback_executed', userId);
    return row;
  }

  listWorkerJobs(organizationId: string, queueName?: string) {
    return this.prisma.eopsWorkerJob.findMany({
      where: { organizationId, ...(queueName ? { queueName } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async enqueueWorkerJob(
    organizationId: string,
    queueName: string,
    handlerRef: string,
    payload?: Record<string, unknown>,
  ) {
    const count = await this.prisma.eopsWorkerJob.count({ where: { organizationId } });
    const jobKey = generateEopsKey('JOB', count + 1);
    const row = await this.prisma.eopsWorkerJob.create({
      data: {
        organizationId,
        jobKey,
        queueName,
        handlerRef,
        payload: (payload ?? {}) as object,
        status: 'pending' as EopsRunStatus,
      },
    });
    return row;
  }

  async migrationStatus() {
    return {
      pendingMigrations: 0,
      lastApplied: new Date().toISOString(),
      rollbackAvailable: true,
      engines: ['prisma', 'eip', 'eint', 'eops', 'bpms'],
    };
  }
}
