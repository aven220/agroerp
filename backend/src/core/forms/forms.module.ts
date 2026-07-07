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
