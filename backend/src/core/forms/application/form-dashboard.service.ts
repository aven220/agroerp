import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class FormDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
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

    const byStatus = await this.prisma.formDefinition.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const topForms = await this.prisma.formSubmission.groupBy({
      by: ['formId'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const formIds = topForms.map((t) => t.formId);
    const forms = formIds.length
      ? await this.prisma.formDefinition.findMany({
          where: { id: { in: formIds } },
          select: { id: true, formKey: true, name: true },
        })
      : [];
    const formMap = new Map(forms.map((f) => [f.id, f]));

    return {
      kpis: {
        totalForms,
        publishedForms,
        draftForms,
        inReviewForms,
        totalSubmissions,
        pendingSync,
        totalAssignments,
        pendingAssignments,
        submissionRatePct:
          totalForms > 0 ? Math.round((totalSubmissions / totalForms) * 100) / 100 : 0,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      topForms: topForms.map((t) => ({
        formId: t.formId,
        formKey: formMap.get(t.formId)?.formKey,
        name: formMap.get(t.formId)?.name,
        submissions: t._count.id,
      })),
    };
  }
}
