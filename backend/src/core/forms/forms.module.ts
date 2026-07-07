import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { FormsService } from './application/forms.service';
import { FormSubmissionsService } from './application/form-submissions.service';
import { ConditionalLogicEngine } from './application/conditional-logic.engine';
import { CalculatedFieldEngine } from './application/calculated-field.engine';
import { FormValidationEngine } from './application/form-validation.engine';
import { FormRendererService } from './application/form-renderer.service';
import { FormLifecycleService } from './application/form-lifecycle.service';
import { FormImportService } from './application/form-import.service';
import { FormTemplatesService } from './application/form-templates.service';
import { FormAssignmentsService } from './application/form-assignments.service';
import { FormCampaignsService } from './application/form-campaigns.service';
import { FormDashboardService } from './application/form-dashboard.service';
import { UdfeReportsService } from './application/udfe-reports.service';
import {
  FORM_ASSIGNMENT_REPOSITORY,
  FORM_CAMPAIGN_REPOSITORY,
  FORM_DASHBOARD_REPOSITORY,
  FORM_IMPORT_REPOSITORY,
  FORM_LIFECYCLE_REPOSITORY,
  FORM_REPORT_REPOSITORY,
  FORM_REPOSITORY,
  FORM_SUBMISSION_REPOSITORY,
  FORM_TEMPLATE_REPOSITORY,
} from './domain/interfaces';
import {
  PrismaFormAssignmentRepository,
  PrismaFormCampaignRepository,
  PrismaFormDashboardRepository,
  PrismaFormImportRepository,
  PrismaFormLifecycleRepository,
  PrismaFormReportRepository,
  PrismaFormRepository,
  PrismaFormSubmissionRepository,
  PrismaFormTemplateRepository,
} from './infrastructure/persistence';
import {
  FormsController,
  FormSubmissionsController,
} from './presentation/forms.controller';
import { UdfeController } from './presentation/udfe.controller';

@Module({
  imports: [CoreEngineModule],
  controllers: [FormsController, FormSubmissionsController, UdfeController],
  providers: [
    FormsService,
    FormSubmissionsService,
    ConditionalLogicEngine,
    CalculatedFieldEngine,
    FormValidationEngine,
    FormRendererService,
    FormLifecycleService,
    FormImportService,
    FormTemplatesService,
    FormAssignmentsService,
    FormCampaignsService,
    FormDashboardService,
    UdfeReportsService,
    { provide: FORM_REPOSITORY, useClass: PrismaFormRepository },
    { provide: FORM_TEMPLATE_REPOSITORY, useClass: PrismaFormTemplateRepository },
    { provide: FORM_SUBMISSION_REPOSITORY, useClass: PrismaFormSubmissionRepository },
    { provide: FORM_CAMPAIGN_REPOSITORY, useClass: PrismaFormCampaignRepository },
    { provide: FORM_ASSIGNMENT_REPOSITORY, useClass: PrismaFormAssignmentRepository },
    { provide: FORM_LIFECYCLE_REPOSITORY, useClass: PrismaFormLifecycleRepository },
    { provide: FORM_DASHBOARD_REPOSITORY, useClass: PrismaFormDashboardRepository },
    { provide: FORM_REPORT_REPOSITORY, useClass: PrismaFormReportRepository },
    { provide: FORM_IMPORT_REPOSITORY, useClass: PrismaFormImportRepository },
  ],
  exports: [
    FormsService,
    FormSubmissionsService,
    FormValidationEngine,
    FormLifecycleService,
    FormAssignmentsService,
    FormCampaignsService,
    FormDashboardService,
  ],
})
export class FormsModule {}
