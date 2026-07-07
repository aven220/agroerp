import { Injectable } from '@nestjs/common';
import { FormsService } from '@/core/forms/application/forms.service';
import type {
  CaptureAvailableFormsResponse,
  CaptureFormDetailResponse,
} from '../domain';
import { CaptureAssignmentService } from './capture-assignment.service';

@Injectable()
export class CaptureQueryService {
  constructor(
    private readonly forms: FormsService,
    private readonly assignments: CaptureAssignmentService,
  ) {}

  async getAvailableForms(
    organizationId: string,
    userId: string,
  ): Promise<CaptureAvailableFormsResponse> {
    const bootstrap = await this.forms.bootstrap(organizationId);
    const userAssignments = await this.assignments.getAssignmentsForUser(
      organizationId,
      userId,
    );

    return {
      syncedAt: bootstrap.syncedAt,
      forms: bootstrap.forms,
      assignmentCount: userAssignments.length,
    };
  }

  async getFormDefinition(
    organizationId: string,
    formId: string,
  ): Promise<CaptureFormDetailResponse> {
    const form = await this.forms.findOne(organizationId, formId);
    const rendered = await this.forms.render(organizationId, formId, {});

    return {
      formId: form.id,
      formKey: form.formKey,
      name: form.name,
      description: form.description,
      version: form.version,
      status: form.status,
      publishedAt: form.publishedAt,
      schema: form.schema,
      metadata: form.metadata,
      render: {
        schemaVersion: rendered.schemaVersion,
        settings: rendered.settings,
        fields: rendered.fields,
        resolvedData: rendered.resolvedData,
      },
    };
  }
}
