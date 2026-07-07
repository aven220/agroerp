import type {
  DataCenterCampaignRow,
  DataCenterSubmissionRow,
  FormDefinition,
  FormStatusGroupCount,
  StatusCount,
  SubmissionExportRow,
  SubmissionFormStatusCount,
  SyncStatusCount,
} from '../types/form.types';

export interface FormReportRepository {
  getSummaryKpiCounts(organizationId: string): Promise<{
    totalForms: number;
    publishedForms: number;
    draftForms: number;
    inReviewForms: number;
    totalSubmissions: number;
    pendingSync: number;
    totalAssignments: number;
    pendingAssignments: number;
  }>;

  groupFormsByStatus(organizationId: string): Promise<FormStatusGroupCount[]>;

  findFormsForCatalog(organizationId: string): Promise<FormDefinition[]>;

  findFormsForFieldReport(
    organizationId: string,
    formId?: string,
  ): Promise<FormDefinition[]>;

  findSubmissionsForExport(
    organizationId: string,
    formId?: string,
  ): Promise<SubmissionExportRow[]>;

  groupSubmissionsByFormAndStatus(
    organizationId: string,
    formId?: string,
  ): Promise<SubmissionFormStatusCount[]>;

  groupAssignmentsByStatus(organizationId: string): Promise<StatusCount[]>;

  groupSubmissionsBySyncStatus(
    organizationId: string,
  ): Promise<SyncStatusCount[]>;

  findDataCenterSubmissions(
    organizationId: string,
    formId?: string,
  ): Promise<DataCenterSubmissionRow[]>;

  findDataCenterCampaigns(
    organizationId: string,
  ): Promise<DataCenterCampaignRow[]>;
}
