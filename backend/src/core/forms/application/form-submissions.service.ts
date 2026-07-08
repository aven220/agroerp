import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FORM_SUBMISSION_RESOURCE_TYPE,
  FormDefinitionSchema,
} from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  FORM_SUBMISSION_REPOSITORY,
  type FormSubmissionRepository,
} from '../domain/interfaces';
import { FormValidationEngine } from './form-validation.engine';
import { FormsService } from './forms.service';
import { SubmitFormDto, SyncSubmissionsDto } from '../presentation/forms.dto';
import { SubmissionProcessorService } from '@/core/capture-processing/application/submission-processor.service';
import { SubmissionFlowService } from '@/core/submission-flow/application/submission-flow.service';

@Injectable()
export class FormSubmissionsService {
  private readonly logger = new Logger(FormSubmissionsService.name);

  constructor(
    @Inject(FORM_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: FormSubmissionRepository,
    private readonly forms: FormsService,
    private readonly validator: FormValidationEngine,
    private readonly core: CoreEngineService,
    private readonly submissionProcessor: SubmissionProcessorService,
    private readonly submissionFlow: SubmissionFlowService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { formId?: string; formKey?: string },
  ) {
    return this.submissionRepository.findMany({
      organizationId,
      formId: filters?.formId,
      formKey: filters?.formKey,
    });
  }

  async findOne(organizationId: string, id: string) {
    const submission = await this.submissionRepository.findFirstByOrgAndId(
      organizationId,
      id,
    );
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async submit(
    organizationId: string,
    formId: string,
    userId: string,
    dto: SubmitFormDto,
    ctx?: RequestContext,
  ) {
    let form = await this.forms.findOne(organizationId, formId);
    if (form.status !== 'published' && !dto.draft) {
      try {
        form = await this.forms.findPublishedByKey(organizationId, form.formKey);
      } catch {
        throw new ConflictException(
          'El formulario debe estar publicado para enviar. Publíquelo desde Formularios.',
        );
      }
    }

    if (dto.externalId) {
      const existing = await this.submissionRepository.findByExternalId(
        organizationId,
        dto.externalId,
      );
      if (existing) {
        const resource = existing.resourceId
          ? await this.submissionRepository.findResourceById(existing.resourceId)
          : null;
        return { submission: existing, resource, duplicate: true };
      }
    }

    const schema = form.schema as unknown as FormDefinitionSchema;
    const validation = this.validator.validate(schema, dto.data, {
      gpsLocation: dto.gpsLocation,
      emitFieldResults: true,
    });

    for (const result of validation.fieldResults) {
      if (result.valid) {
        await this.core.emitFieldValidated(
          organizationId,
          formId,
          {
            formKey: form.formKey,
            fieldKey: result.key,
            submissionExternalId: dto.externalId,
          },
          { ctx: { ...ctx, userId, organizationId }, enqueueSync: false },
        );
      }
    }

    const attachedFiles = this.extractFileRefs(validation.data);

    const resource = await this.submissionRepository.createResource({
      organizationId,
      resourceType: FORM_SUBMISSION_RESOURCE_TYPE,
      schemaVersion: form.version,
      data: {
        formId: form.id,
        formKey: form.formKey,
        formVersion: form.version,
        formName: form.name,
        ...validation.data,
      } as object,
      attributes: validation.data as object,
      metadata: {
        gpsLocation: dto.gpsLocation,
        gpsTrack: dto.gpsTrack,
        deviceInfo: dto.deviceInfo,
        attachedFiles,
        externalId: dto.externalId,
      } as object,
      status: dto.draft ? 'draft' : 'submitted',
      syncStatus: 'pending',
      externalId: dto.externalId,
      createdBy: userId,
      updatedBy: userId,
    });

    const submission = await this.submissionRepository.create({
      organizationId,
      formId: form.id,
      formVersion: form.version,
      resourceId: resource.id,
      data: validation.data as object,
      gpsLocation: dto.gpsLocation as object | undefined,
      gpsTrack: dto.gpsTrack as object | undefined,
      deviceInfo: dto.deviceInfo as object | undefined,
      context: (dto.context ?? {}) as object,
      status: dto.draft ? 'draft' : 'submitted',
      syncStatus: 'pending',
      externalId: dto.externalId,
      createdBy: userId,
    });

    await this.core.emitResourceCreated(
      organizationId,
      resource.id,
      {
        resourceType: FORM_SUBMISSION_RESOURCE_TYPE,
        formId: form.id,
        formKey: form.formKey,
        submissionId: submission.id,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        newValues: {
          id: resource.id,
          type: FORM_SUBMISSION_RESOURCE_TYPE,
          data: resource.data,
          metadata: resource.metadata,
        },
      },
    );

    await this.core.emitFormSubmitted(
      organizationId,
      submission.id,
      {
        formId: form.id,
        formKey: form.formKey,
        formVersion: form.version,
        resourceId: resource.id,
        externalId: dto.externalId,
        fieldCount: Object.keys(validation.data).length,
        draft: dto.draft ?? false,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    if (!dto.draft) {
      await this.runCaptureProcessing({
        organizationId,
        userId,
        form,
        submission,
        resource,
        ctx,
      });
    }

    return { submission, resource, duplicate: false };
  }

  private async runCaptureProcessing(input: {
    organizationId: string;
    userId: string;
    form: Awaited<ReturnType<FormsService['findOne']>>;
    submission: Awaited<ReturnType<FormSubmissionRepository['create']>>;
    resource: Awaited<ReturnType<FormSubmissionRepository['createResource']>>;
    ctx?: RequestContext;
  }) {
    try {
      const processable = {
        organizationId: input.organizationId,
        userId: input.userId,
        form: {
          id: input.form.id,
          formKey: input.form.formKey,
          version: input.form.version,
          metadata: input.form.metadata,
          schema: input.form.schema,
        },
        submission: input.submission,
        resource: input.resource,
        draft: false,
        ctx: input.ctx,
      };

      const decision = await this.submissionFlow.decide(processable);
      await this.submissionProcessor.processSubmission(processable, decision);
    } catch (err) {
      this.logger.warn(
        `Capture processing failed for submission ${input.submission.id}: ${(err as Error).message}`,
      );
    }
  }

  async syncBatch(
    organizationId: string,
    userId: string,
    dto: SyncSubmissionsDto,
    ctx?: RequestContext,
  ) {
    const results: {
      externalId: string;
      status: 'created' | 'duplicate' | 'error';
      submissionId?: string;
      error?: string;
    }[] = [];

    for (const item of dto.submissions) {
      try {
        const result = await this.submit(
          organizationId,
          item.formId,
          userId,
          {
            data: item.data,
            gpsLocation: item.gpsLocation,
            gpsTrack: item.gpsTrack,
            deviceInfo: item.deviceInfo,
            externalId: item.externalId,
          },
          ctx,
        );

        results.push({
          externalId: item.externalId,
          status: result.duplicate ? 'duplicate' : 'created',
          submissionId: result.submission.id,
        });
      } catch (err) {
        results.push({
          externalId: item.externalId,
          status: 'error',
          error: (err as Error).message,
        });
      }
    }

    await this.core.emitSyncCompleted(
      organizationId,
      userId,
      {
        batchSize: dto.submissions.length,
        created: results.filter((r) => r.status === 'created').length,
        errors: results.filter((r) => r.status === 'error').length,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return { results };
  }

  private extractFileRefs(data: Record<string, unknown>): string[] {
    const refs: string[] = [];
    for (const value of Object.values(data)) {
      if (typeof value === 'string' && this.looksLikeUuid(value)) {
        refs.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && this.looksLikeUuid(item)) {
            refs.push(item);
          }
        }
      }
    }
    return refs;
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
