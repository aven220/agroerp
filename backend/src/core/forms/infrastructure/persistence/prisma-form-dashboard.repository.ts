import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type { FormDashboardRepository } from '../../domain/interfaces/form-dashboard.repository';
import type {
  FormDashboardKpis,
  FormIdCount,
  FormStatusGroupCount,
  FormSummary,
} from '../../domain/types/form.types';

@Injectable()
export class PrismaFormDashboardRepository implements FormDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getKpiCounts(organizationId: string): Promise<FormDashboardKpis> {
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

  async topFormsBySubmissions(
    organizationId: string,
    take: number,
  ): Promise<FormIdCount[]> {
    const rows = await this.prisma.formSubmission.groupBy({
      by: ['formId'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take,
    });
    return rows.map((t) => ({ formId: t.formId, count: t._count.id }));
  }

  async findFormSummariesByIds(ids: string[]): Promise<FormSummary[]> {
    if (!ids.length) return [];
    return this.prisma.formDefinition.findMany({
      where: { id: { in: ids } },
      select: { id: true, formKey: true, name: true },
    }) as Promise<FormSummary[]>;
  }
}
