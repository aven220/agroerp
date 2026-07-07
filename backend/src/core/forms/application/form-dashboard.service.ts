import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_DASHBOARD_REPOSITORY,
  type FormDashboardRepository,
} from '../domain/interfaces';

@Injectable()
export class FormDashboardService {
  constructor(
    @Inject(FORM_DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: FormDashboardRepository,
  ) {}

  async getDashboard(organizationId: string) {
    const kpis = await this.dashboardRepository.getKpiCounts(organizationId);
    const byStatus = await this.dashboardRepository.groupFormsByStatus(organizationId);
    const topForms = await this.dashboardRepository.topFormsBySubmissions(
      organizationId,
      10,
    );

    const formIds = topForms.map((t) => t.formId);
    const forms = await this.dashboardRepository.findFormSummariesByIds(formIds);
    const formMap = new Map(forms.map((f) => [f.id, f]));

    return {
      kpis: {
        ...kpis,
        submissionRatePct:
          kpis.totalForms > 0
            ? Math.round((kpis.totalSubmissions / kpis.totalForms) * 100) / 100
            : 0,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s.count })),
      topForms: topForms.map((t) => ({
        formId: t.formId,
        formKey: formMap.get(t.formId)?.formKey,
        name: formMap.get(t.formId)?.name,
        submissions: t.count,
      })),
    };
  }
}
