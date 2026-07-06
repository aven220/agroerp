import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EintReportFormat, EintStatus } from '@agroerp/prisma-eint-client';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { generateEintKey } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';
import { EintBiService } from './eint-bi.service';

@Injectable()
export class EintReportingService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly bi: EintBiService,
    private readonly audit: EintAuditService,
  ) {}

  listTemplates(organizationId: string) {
    return this.prisma.eintReportTemplate.findMany({ where: { organizationId }, orderBy: { templateKey: 'asc' } });
  }

  async createTemplate(
    organizationId: string,
    userId: string,
    templateKey: string,
    name: string,
    category: string,
    definition: Record<string, unknown>,
    opts?: { filters?: Record<string, unknown>; groupings?: unknown[]; subreports?: unknown[] },
  ) {
    const existing = await this.prisma.eintReportTemplate.findFirst({ where: { organizationId, templateKey } });
    if (existing) throw new BadRequestException(`Plantilla ${templateKey} ya existe`);
    return this.prisma.eintReportTemplate.create({
      data: {
        organizationId,
        templateKey,
        name,
        category,
        definition: definition as object,
        filters: (opts?.filters ?? {}) as object,
        groupings: (opts?.groupings ?? []) as object,
        subreports: (opts?.subreports ?? []) as object,
        createdBy: userId,
        status: 'draft',
      },
    });
  }

  async publishTemplate(organizationId: string, templateKey: string) {
    const t = await this.prisma.eintReportTemplate.findFirst({ where: { organizationId, templateKey } });
    if (!t) throw new NotFoundException('Plantilla no encontrada');
    return this.prisma.eintReportTemplate.update({ where: { id: t.id }, data: { status: 'active', version: t.version + 1 } });
  }

  async runReport(
    organizationId: string,
    userId: string,
    templateKey: string,
    format: EintReportFormat,
    filters?: Record<string, unknown>,
  ) {
    const template = await this.prisma.eintReportTemplate.findFirst({
      where: { organizationId, templateKey, status: 'active' },
    });
    if (!template) throw new NotFoundException('Plantilla no activa');
    const seq = await this.prisma.eintReportRun.count({ where: { organizationId } });
    const run = await this.prisma.eintReportRun.create({
      data: {
        organizationId,
        templateId: template.id,
        runKey: generateEintKey('RPT', seq + 1),
        format,
        status: 'running',
        filters: (filters ?? template.filters ?? {}) as object,
        userId,
      },
    });
    const def = template.definition as Record<string, unknown>;
    let data: unknown = {};
    if (def.dataSource) {
      data = await this.bi.executeQuery(organizationId, userId, def as unknown as import('@agroerp/shared').BiVisualQueryDefinition);
    }
    const outputUrl = `/reports/${run.runKey}.${format}`;
    const updated = await this.prisma.eintReportRun.update({
      where: { id: run.id },
      data: { status: 'completed', outputUrl, completedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EintReport', templateKey, 'report_generated', userId, { format, runKey: run.runKey });
    return { run: updated, data };
  }

  runs(organizationId: string, limit = 100) {
    return this.prisma.eintReportRun.findMany({
      where: { organizationId },
      include: { template: { select: { templateKey: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async schedule(
    organizationId: string,
    templateKey: string,
    scheduleKey: string,
    cron: string,
    recipients: string[],
  ) {
    const template = await this.prisma.eintReportTemplate.findFirst({ where: { organizationId, templateKey } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    const schedule = await this.prisma.eintReportSchedule.create({
      data: { organizationId, templateId: template.id, scheduleKey, cron, recipients, status: 'active' },
    });
    await this.audit.log(organizationId, 'EintReport', templateKey, 'report_scheduled', undefined, { scheduleKey, cron });
    return schedule;
  }

  schedules(organizationId: string) {
    return this.prisma.eintReportSchedule.findMany({
      where: { organizationId },
      include: { template: { select: { templateKey: true, name: true } } },
    });
  }
}
