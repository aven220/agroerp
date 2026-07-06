import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EintEtlMode, EintStatus } from '@agroerp/prisma-eint-client';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { generateEintKey, partitionKey, transformEtlRecords } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintDwhService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly audit: EintAuditService,
  ) {}

  listDimensions(organizationId: string) {
    return this.prisma.eintDwhDimension.findMany({ where: { organizationId }, orderBy: { dimensionKey: 'asc' } });
  }

  listFacts(organizationId: string) {
    return this.prisma.eintDwhFact.findMany({
      where: { organizationId },
      include: { _count: { select: { snapshots: true } } },
      orderBy: { factKey: 'asc' },
    });
  }

  async createDimension(
    organizationId: string,
    dimensionKey: string,
    name: string,
    category: string,
    sourceModule: string,
    attributes?: Record<string, unknown>,
  ) {
    const existing = await this.prisma.eintDwhDimension.findFirst({ where: { organizationId, dimensionKey } });
    if (existing) throw new BadRequestException(`Dimensión ${dimensionKey} ya existe`);
    return this.prisma.eintDwhDimension.create({
      data: { organizationId, dimensionKey, name, category, sourceModule, attributes: (attributes ?? {}) as object, status: 'active' },
    });
  }

  async createFact(
    organizationId: string,
    factKey: string,
    name: string,
    category: string,
    sourceModule: string,
    measures?: Record<string, unknown>,
  ) {
    const existing = await this.prisma.eintDwhFact.findFirst({ where: { organizationId, factKey } });
    if (existing) throw new BadRequestException(`Hecho ${factKey} ya existe`);
    return this.prisma.eintDwhFact.create({
      data: {
        organizationId,
        factKey,
        name,
        category,
        sourceModule,
        measures: (measures ?? {}) as object,
        partitionKey: partitionKey(new Date()),
        status: 'active',
      },
    });
  }

  async loadSnapshot(organizationId: string, factKey: string, records: Array<Record<string, unknown>>, userId?: string) {
    const fact = await this.prisma.eintDwhFact.findFirst({ where: { organizationId, factKey } });
    if (!fact) throw new NotFoundException('Hecho no encontrado');
    const seq = await this.prisma.eintDwhSnapshot.count({ where: { organizationId } });
    const snapshot = await this.prisma.eintDwhSnapshot.create({
      data: {
        organizationId,
        factId: fact.id,
        snapshotKey: generateEintKey('SNAP', seq + 1),
        payload: records as object,
        recordCount: records.length,
      },
    });
    await this.audit.log(organizationId, 'EintDwhFact', factKey, 'dwh_loaded', userId, { records: records.length });
    return snapshot;
  }

  snapshots(organizationId: string, factKey?: string, limit = 50) {
    return this.prisma.eintDwhSnapshot.findMany({
      where: { organizationId, ...(factKey ? { fact: { factKey } } : {}) },
      include: { fact: { select: { factKey: true, name: true } } },
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });
  }
}

@Injectable()
export class EintEtlService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly dwh: EintDwhService,
    private readonly audit: EintAuditService,
  ) {}

  listJobs(organizationId: string) {
    return this.prisma.eintEtlJob.findMany({
      where: { organizationId },
      include: { _count: { select: { runs: true } } },
      orderBy: { jobKey: 'asc' },
    });
  }

  async createJob(
    organizationId: string,
    userId: string,
    jobKey: string,
    name: string,
    sourceModule: string,
    opts: { targetFactKey?: string; mode?: EintEtlMode; schedule?: string; transform?: Record<string, string> },
  ) {
    const existing = await this.prisma.eintEtlJob.findFirst({ where: { organizationId, jobKey } });
    if (existing) throw new BadRequestException(`Job ${jobKey} ya existe`);
    return this.prisma.eintEtlJob.create({
      data: {
        organizationId,
        jobKey,
        name,
        sourceModule,
        targetFactKey: opts.targetFactKey,
        mode: opts.mode ?? 'incremental',
        schedule: opts.schedule,
        transform: (opts.transform ?? {}) as object,
        createdBy: userId,
        status: 'draft',
      },
    });
  }

  async publishJob(organizationId: string, jobKey: string) {
    const job = await this.prisma.eintEtlJob.findFirst({ where: { organizationId, jobKey } });
    if (!job) throw new NotFoundException('Job no encontrado');
    return this.prisma.eintEtlJob.update({ where: { id: job.id }, data: { status: 'active', version: job.version + 1 } });
  }

  async runJob(organizationId: string, userId: string, jobKey: string, data: Array<Record<string, unknown>> = []) {
    const job = await this.prisma.eintEtlJob.findFirst({ where: { organizationId, jobKey, status: 'active' } });
    if (!job) throw new NotFoundException('Job ETL no activo');
    const seq = await this.prisma.eintEtlRun.count({ where: { organizationId } });
    const runKey = generateEintKey('ETL', seq + 1);
    const run = await this.prisma.eintEtlRun.create({
      data: { organizationId, jobId: job.id, runKey, status: 'running', mode: job.mode },
    });
    await this.audit.log(organizationId, 'EintEtlJob', jobKey, 'etl_started', userId, { runKey });
    const start = Date.now();
    try {
      const mapping = (job.transform as Record<string, string>) ?? {};
      const transformed = transformEtlRecords(data, mapping);
      if (job.targetFactKey) {
        await this.dwh.loadSnapshot(organizationId, job.targetFactKey, transformed, userId);
      }
      const updated = await this.prisma.eintEtlRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          recordsIn: data.length,
          recordsOut: transformed.length,
          durationMs: Date.now() - start,
          completedAt: new Date(),
        },
      });
      await this.audit.log(organizationId, 'EintEtlJob', jobKey, 'etl_completed', userId, { runKey, records: transformed.length });
      return updated;
    } catch (e) {
      await this.prisma.eintEtlRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'etl failed', completedAt: new Date() },
      });
      await this.audit.log(organizationId, 'EintEtlJob', jobKey, 'etl_failed', userId, { runKey });
      throw e;
    }
  }

  runs(organizationId: string, limit = 100) {
    return this.prisma.eintEtlRun.findMany({
      where: { organizationId },
      include: { job: { select: { jobKey: true, name: true } } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
