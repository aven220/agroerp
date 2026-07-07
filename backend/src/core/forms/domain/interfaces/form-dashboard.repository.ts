import type {
  FormDashboardKpis,
  FormIdCount,
  FormStatusGroupCount,
  FormSummary,
} from '../types/form.types';

export interface FormDashboardRepository {
  getKpiCounts(organizationId: string): Promise<FormDashboardKpis>;

  groupFormsByStatus(organizationId: string): Promise<FormStatusGroupCount[]>;

  topFormsBySubmissions(
    organizationId: string,
    take: number,
  ): Promise<FormIdCount[]>;

  findFormSummariesByIds(ids: string[]): Promise<FormSummary[]>;
}
