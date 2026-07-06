import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiReportFormat, BiVisualQueryDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BiQueryEngineService } from './bi-query-engine.service';
import { BiExportService } from './bi-export.service';

@Injectable()
export class BiReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryEngine: BiQueryEngineService,
    private readonly exportService: BiExportService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.biReportDefinition.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { schedules: true, runs: { orderBy: { executedAt: 'desc' }, take: 1 } },
    });
  }

  async findOne(organizationId: string, id: string) {
    const report = await this.prisma.biReportDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { schedules: true, runs: { orderBy: { executedAt: 'desc' }, take: 20 } },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      reportKey: string;
      name: string;
      description?: string;
      queryDef: BiVisualQueryDefinition;
      columns?: unknown[];
      parameters?: unknown[];
    },
  ) {
    const exists = await this.prisma.biReportDefinition.findFirst({
      where: { organizationId, reportKey: data.reportKey, deletedAt: null },
    });
    if (exists) throw new BadRequestException('reportKey ya existe');

    return this.prisma.biReportDefinition.create({
      data: {
        organizationId,
        reportKey: data.reportKey,
        name: data.name,
        description: data.description,
        queryDef: data.queryDef as object,
        columns: (data.columns ?? []) as object[],
        parameters: (data.parameters ?? []) as object[],
        createdBy: userId,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string;
      queryDef: BiVisualQueryDefinition;
      columns: unknown[];
      parameters: unknown[];
      status: string;
    }>,
  ) {
    const report = await this.findOne(organizationId, id);
    return this.prisma.biReportDefinition.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.queryDef ? { queryDef: data.queryDef as object, version: report.version + 1 } : {}),
        ...(data.columns ? { columns: data.columns as object[] } : {}),
        ...(data.parameters ? { parameters: data.parameters as object[] } : {}),
        ...(data.status ? { status: data.status as 'draft' } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.biReportDefinition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async run(
    organizationId: string,
    id: string,
    userId: string,
    format: BiReportFormat = 'json',
    parameters?: Record<string, unknown>,
  ) {
    const report = await this.findOne(organizationId, id);
    const reportDef = report.queryDef as unknown as BiVisualQueryDefinition;
    const queryDef: BiVisualQueryDefinition = {
      ...reportDef,
      parameters: {
        ...(reportDef.parameters ?? {}),
        ...parameters,
      },
    };
    const start = Date.now();
    const result = await this.queryEngine.execute(organizationId, queryDef);
    const exported = this.exportService.export(result.rows, result.columns, format, report.name);

    const run = await this.prisma.biReportRun.create({
      data: {
        reportId: id,
        organizationId,
        format: format as 'json',
        status: 'completed',
        rowCount: result.rowCount,
        result: { columns: result.columns, preview: result.rows.slice(0, 100) } as object,
        executedBy: userId,
        durationMs: Date.now() - start,
      },
    });

    return { run, query: result, export: exported };
  }

  async schedule(
    organizationId: string,
    id: string,
    data: {
      cronExpression?: string;
      nextRunAt: string;
      format?: BiReportFormat;
      recipients?: string[];
    },
  ) {
    await this.findOne(organizationId, id);
    await this.prisma.biReportDefinition.update({
      where: { id },
      data: { status: 'scheduled' },
    });
    return this.prisma.biScheduledReport.create({
      data: {
        reportId: id,
        organizationId,
        cronExpression: data.cronExpression,
        nextRunAt: new Date(data.nextRunAt),
        format: (data.format ?? 'pdf') as 'pdf',
        recipients: (data.recipients ?? []) as unknown as object[],
      },
    });
  }

  async listRuns(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.biReportRun.findMany({
      where: { reportId: id, organizationId },
      orderBy: { executedAt: 'desc' },
      take: 50,
    });
  }

  async processDueSchedules() {
    const due = await this.prisma.biScheduledReport.findMany({
      where: { active: true, nextRunAt: { lte: new Date() } },
      include: { report: true },
      take: 20,
    });
    for (const sched of due) {
      try {
        await this.run(
          sched.organizationId,
          sched.reportId,
          'system',
          sched.format as BiReportFormat,
        );
        const next = new Date(sched.nextRunAt.getTime() + 24 * 3600000);
        await this.prisma.biScheduledReport.update({
          where: { id: sched.id },
          data: { lastRunAt: new Date(), nextRunAt: next },
        });
      } catch {
        /* continue */
      }
    }
    return { processed: due.length };
  }
}
