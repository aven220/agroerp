import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type { FormReportRepository } from '../../domain/interfaces/form-report.repository';
import type {
  DataCenterCampaignRow,
  DataCenterSubmissionRow,
  FormDefinition,
  FormStatusGroupCount,
  StatusCount,
  SubmissionExportRow,
  SubmissionFormStatusCount,
  SyncStatusCount,
} from '../../domain/types/form.types';

@Injectable()
export class PrismaFormReportRepository implements FormReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryKpiCounts(organizationId: string) {
    const [
      totalForms,
      publishedForms,
      draftForms,
      inReviewForms,
      totalSubmissions,
      pendingSync,
      totalAssignments,
      pendingAssignments,
    ] = await Promise.all([
      this.prisma.formDefinition.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'published', deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'draft', deletedAt: null },
      }),
      this.prisma.formDefinition.count({
        where: { organizationId, status: 'in_review', deletedAt: null },
      }),
      this.prisma.formSubmission.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.formSubmission.count({
        where: { organizationId, syncStatus: 'pending', deletedAt: null },
      }),
      this.prisma.formAssignment.count({ where: { organizationId } }),
      this.prisma.formAssignment.count({
        where: { organizationId, status: 'pending' },
      }),
    ]);

    return {
      totalForms,
      publishedForms,
      draftForms,
      inReviewForms,
      totalSubmissions,
      pendingSync,
      totalAssignments,
      pendingAssignments,
    };
  }

  async groupFormsByStatus(
    organizationId: string,
  ): Promise<FormStatusGroupCount[]> {
    const rows = await this.prisma.formDefinition.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });
    return rows.map((s) => ({ status: s.status, count: s._count.id }));
  }

  async findFormsForCatalog(organizationId: string): Promise<FormDefinition[]> {
    return this.prisma.formDefinition.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ formKey: 'asc' }, { version: 'desc' }],
    }) as Promise<FormDefinition[]>;
  }

  async findFormsForFieldReport(
    organizationId: string,
    formId?: string,
  ): Promise<FormDefinition[]> {
    return this.prisma.formDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { id: formId } : {}),
      },
      orderBy: [{ formKey: 'asc' }, { version: 'desc' }],
    }) as Promise<FormDefinition[]>;
  }

  async findSubmissionsForExport(
    organizationId: string,
    formId?: string,
  ): Promise<SubmissionExportRow[]> {
    return this.prisma.formSubmission.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { formId } : {}),
      },
      include: {
        form: {
          select: {
            formKey: true,
            name: true,
            schema: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    }) as Promise<SubmissionExportRow[]>;
  }

  async groupSubmissionsByFormAndStatus(
    organizationId: string,
    formId?: string,
  ): Promise<SubmissionFormStatusCount[]> {
    const rows = await this.prisma.formSubmission.groupBy({
      by: ['formId', 'status'],
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { formId } : {}),
      },
      _count: { id: true },
    });
    return rows.map((item) => ({
      formId: item.formId,
      status: item.status,
      count: item._count.id,
    }));
  }

  async groupAssignmentsByStatus(
    organizationId: string,
  ): Promise<StatusCount[]> {
    const rows = await this.prisma.formAssignment.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });
    return rows.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async groupSubmissionsBySyncStatus(
    organizationId: string,
  ): Promise<SyncStatusCount[]> {
    const rows = await this.prisma.formSubmission.groupBy({
      by: ['syncStatus'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });
    return rows.map((item) => ({
      syncStatus: item.syncStatus,
      count: item._count.id,
    }));
  }

  async findDataCenterSubmissions(
    organizationId: string,
    formId?: string,
  ): Promise<DataCenterSubmissionRow[]> {
    return this.prisma.formSubmission.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(formId ? { formId } : {}),
      },
      select: {
        id: true,
        formId: true,
        status: true,
        syncStatus: true,
        gpsLocation: true,
        createdAt: true,
        form: { select: { formKey: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }) as Promise<DataCenterSubmissionRow[]>;
  }

  async findDataCenterCampaigns(
    organizationId: string,
  ): Promise<DataCenterCampaignRow[]> {
    return this.prisma.formCampaign.findMany({
      where: { organizationId, status: { in: ['active', 'closed'] } },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        expectedCount: true,
        formId: true,
      },
    }) as Promise<DataCenterCampaignRow[]>;
  }
}
