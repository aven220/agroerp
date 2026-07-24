import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import type { FormSubmission, SubmissionResource } from '../domain/types/form.types';
import { FormValidationEngine } from './form-validation.engine';
import { FormsService } from './forms.service';
import { SubmitFormDto, SyncSubmissionsDto } from '../presentation/forms.dto';
import { SubmissionProcessorService } from '@/core/capture-processing/application/submission-processor.service';
import { SubmissionFlowService } from '@/core/submission-flow/application/submission-flow.service';
import { WorkflowEngineService } from '@/core/workflow-engine/application/workflow-engine.service';

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
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
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
        return this.handleExistingSubmission(
          organizationId,
          userId,
          form,
          existing as FormSubmission & {
            form: Awaited<ReturnType<FormsService['findOne']>>;
          },
          dto,
          ctx,
        );
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

    const attachedFiles = this.collectAttachedFiles(validation.data, dto.deviceInfo);
    const isDraft = dto.draft ?? false;
    const syncStatus = isDraft ? 'pending' : 'synced';

    let resource: SubmissionResource;
    let submission: FormSubmission;

    try {
      const created = await this.submissionRepository.createWithResource(
        {
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
          status: isDraft ? 'draft' : 'submitted',
          syncStatus,
          externalId: dto.externalId,
          createdBy: userId,
          updatedBy: userId,
        },
        {
          organizationId,
          formId: form.id,
          formVersion: form.version,
          data: validation.data as object,
          gpsLocation: dto.gpsLocation as object | undefined,
          gpsTrack: dto.gpsTrack as object | undefined,
          deviceInfo: dto.deviceInfo as object | undefined,
          context: (dto.context ?? {}) as object,
          status: isDraft ? 'draft' : 'submitted',
          syncStatus,
          externalId: dto.externalId,
          createdBy: userId,
        },
      );
      resource = created.resource;
      submission = created.submission;
    } catch (err) {
      if (
        dto.externalId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.submissionRepository.findByExternalId(
          organizationId,
          dto.externalId,
        );
        if (existing) {
          return this.handleExistingSubmission(
            organizationId,
            userId,
            form,
            existing as FormSubmission & {
              form: Awaited<ReturnType<FormsService['findOne']>>;
            },
            dto,
            ctx,
          );
        }
      }
      throw err;
    }

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
        draft: isDraft,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    await this.runFormWorkflow({
      organizationId,
      userId,
      form,
      submission,
      draft: isDraft,
    });

    if (!isDraft) {
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

  private async handleExistingSubmission(
    organizationId: string,
    userId: string,
    form: Awaited<ReturnType<FormsService['findOne']>>,
    existing: FormSubmission & {
      form: Awaited<ReturnType<FormsService['findOne']>>;
    },
    dto: SubmitFormDto,
    ctx?: RequestContext,
  ) {
    const isDraft = dto.draft ?? false;
    let resource = existing.resourceId
      ? await this.submissionRepository.findResourceById(existing.resourceId)
      : null;

    if (!isDraft && existing.status === 'draft') {
      const schema = form.schema as unknown as FormDefinitionSchema;
      const validation = this.validator.validate(schema, dto.data, {
        gpsLocation: dto.gpsLocation,
        emitFieldResults: false,
      });
      const attachedFiles = this.collectAttachedFiles(validation.data, dto.deviceInfo);

      if (!existing.resourceId) {
        throw new ConflictException('Draft submission missing resource');
      }

      const finalized = await this.submissionRepository.finalizeDraft(
        existing.id,
        existing.resourceId,
        {
          formId: form.id,
          formVersion: form.version,
          data: validation.data as object,
          gpsLocation: dto.gpsLocation as object | undefined,
          gpsTrack: dto.gpsTrack as object | undefined,
          deviceInfo: dto.deviceInfo as object | undefined,
          context: (dto.context ?? existing.context ?? {}) as object,
          updatedBy: userId,
          resourceData: {
            formId: form.id,
            formKey: form.formKey,
            formVersion: form.version,
            formName: form.name,
            ...validation.data,
          } as object,
          resourceAttributes: validation.data as object,
          resourceMetadata: {
            gpsLocation: dto.gpsLocation,
            gpsTrack: dto.gpsTrack,
            deviceInfo: dto.deviceInfo,
            attachedFiles,
            externalId: dto.externalId,
          } as object,
          resourceSchemaVersion: form.version,
        },
      );

      existing = { ...finalized.submission, form: existing.form };
      resource = finalized.resource;

      await this.runFormWorkflow({
        organizationId,
        userId,
        form,
        submission: existing,
        draft: false,
      });

      await this.runCaptureProcessing({
        organizationId,
        userId,
        form,
        submission: existing,
        resource,
        ctx,
      });

      return { submission: existing, resource, duplicate: true };
    }

    if (!isDraft && existing.status === 'submitted' && resource) {
      await this.submissionRepository.markSynced(existing.id, resource.id);

      await this.runCaptureProcessing({
        organizationId,
        userId,
        form,
        submission: existing,
        resource,
        ctx,
      });
    }

    return { submission: existing, resource, duplicate: true };
  }

  private async runFormWorkflow(input: {
    organizationId: string;
    userId: string;
    form: Awaited<ReturnType<FormsService['findOne']>>;
    submission: FormSubmission;
    draft: boolean;
  }) {
    try {
      await this.workflowEngine.onSubmissionSaved({
        organizationId: input.organizationId,
        submissionId: input.submission.id,
        formId: input.form.id,
        formKey: input.form.formKey,
        userId: input.userId,
        formMetadata: input.form.metadata,
        draft: input.draft,
      });
    } catch (err) {
      this.logger.warn(
        `Form workflow runtime failed for submission ${input.submission.id}: ${(err as Error).message}`,
      );
    }
  }

  private async runCaptureProcessing(input: {
    organizationId: string;
    userId: string;
    form: Awaited<ReturnType<FormsService['findOne']>>;
    submission: FormSubmission;
    resource: SubmissionResource;
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
        const formId = await this.resolveFormIdForSync(
          organizationId,
          item.formId,
          item.formKey,
        );
        const result = await this.submit(
          organizationId,
          formId,
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
          error: this.extractSyncError(err),
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

  private async resolveFormIdForSync(
    organizationId: string,
    formId: string,
    formKey?: string,
  ): Promise<string> {
    try {
      const form = await this.forms.findOne(organizationId, formId);
      return form.id;
    } catch {
      if (!formKey?.trim()) throw new NotFoundException('Formulario no encontrado');
      const published = await this.forms.findPublishedByKey(organizationId, formKey.trim());
      return published.id;
    }
  }

  private collectAttachedFiles(
    data: Record<string, unknown>,
    deviceInfo?: Record<string, unknown>,
  ): string[] {
    const refs = new Set(this.extractFileRefs(data));
    const captureFiles = deviceInfo?.captureFiles;
    if (Array.isArray(captureFiles)) {
      for (const file of captureFiles) {
        if (
          file &&
          typeof file === 'object' &&
          typeof (file as { resourceId?: string }).resourceId === 'string'
        ) {
          refs.add((file as { resourceId: string }).resourceId);
        }
      }
    }
    return [...refs];
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

  private extractSyncError(err: unknown): string {
    if (err instanceof BadRequestException || err instanceof HttpException) {
      const response = err.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object') {
        const body = response as {
          message?: string | string[];
          errors?: string[];
        };
        if (Array.isArray(body.errors) && body.errors.length > 0) {
          return body.errors.join('; ');
        }
        if (Array.isArray(body.message)) return body.message.join('; ');
        if (typeof body.message === 'string') return body.message;
      }
    }
    return err instanceof Error ? err.message : 'Unknown sync error';
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
