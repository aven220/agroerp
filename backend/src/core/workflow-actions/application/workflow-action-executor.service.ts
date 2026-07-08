import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type { DomainEventPayload } from '@agroerp/shared';
import { EventService } from '@/core/events/application/event.service';
import { SubmissionProcessorService } from '@/core/capture-processing/application/submission-processor.service';
import type { ProcessableSubmission } from '@/core/capture-processing/domain/types/processable-submission';
import { buildEventMetadata } from '@/core/engine/middleware/request-context.middleware';
import { FormsService } from '@/core/forms/application/forms.service';
import {
  FORM_SUBMISSION_REPOSITORY,
  type FormSubmissionRepository,
} from '@/core/forms/domain/interfaces';
import { SubmissionFlowService } from '@/core/submission-flow/application/submission-flow.service';
import {
  WORKFLOW_ACTION_AGGREGATE_TYPE,
  type WorkflowActionExecutionContext,
  type WorkflowBusinessEventPayload,
} from '../domain/workflow-action';
import { resolveWorkflowActionMapping } from '../domain/workflow-action-mapping';

@Injectable()
export class WorkflowActionExecutorService {
  private readonly logger = new Logger(WorkflowActionExecutorService.name);

  constructor(
    private readonly events: EventService,
    private readonly submissionFlow: SubmissionFlowService,
    private readonly submissionProcessor: SubmissionProcessorService,
    @Inject(FORM_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: FormSubmissionRepository,
    @Inject(forwardRef(() => FormsService))
    private readonly forms: FormsService,
  ) {}

  async executeAfterTransition(context: WorkflowActionExecutionContext): Promise<void> {
    const mapping = resolveWorkflowActionMapping(context.action);
    if (!mapping) {
      return;
    }

    try {
      if (mapping.kind === 'noop') {
        return;
      }

      if (mapping.kind === 'event') {
        await this.emitBusinessEvent(mapping.eventType, context);
        return;
      }

      await this.runSubmissionFlow(context);
    } catch (err) {
      this.logger.warn(
        `Workflow action ${context.action} failed for submission ${context.submissionId}: ${(err as Error).message}`,
      );
    }
  }

  private async emitBusinessEvent(
    eventType: string,
    context: WorkflowActionExecutionContext,
  ): Promise<void> {
    const payload: WorkflowBusinessEventPayload = {
      submissionId: context.submissionId,
      formId: context.formId,
      formKey: context.formKey,
      action: context.action,
      fromStateId: context.fromStateId,
      fromStateName: context.fromStateName,
      toStateId: context.toStateId,
      toStateName: context.toStateName,
      userId: context.userId,
    };

    await this.events.emit({
      organizationId: context.organizationId,
      aggregateType: WORKFLOW_ACTION_AGGREGATE_TYPE,
      aggregateId: context.submissionId,
      eventType,
      payload: payload as unknown as DomainEventPayload,
      metadata: buildEventMetadata({ userId: context.userId }),
    });
  }

  private async runSubmissionFlow(context: WorkflowActionExecutionContext): Promise<void> {
    const submission = await this.submissionRepository.findFirstByOrgAndId(
      context.organizationId,
      context.submissionId,
    );
    if (!submission) {
      this.logger.warn(
        `Submission ${context.submissionId} not found for workflow action ${context.action}`,
      );
      return;
    }

    const form = await this.forms.findOne(context.organizationId, context.formId);
    const resource = submission.resourceId
      ? await this.submissionRepository.findResourceById(submission.resourceId)
      : null;

    if (!resource) {
      this.logger.warn(
        `Resource missing for submission ${context.submissionId} during workflow action ${context.action}`,
      );
      return;
    }

    const processable: ProcessableSubmission = {
      organizationId: context.organizationId,
      userId: context.userId ?? submission.createdBy ?? 'system',
      form: {
        id: form.id,
        formKey: form.formKey,
        version: form.version,
        metadata: form.metadata,
        schema: form.schema,
      },
      submission,
      resource,
      draft: false,
    };

    const decision = await this.submissionFlow.decide(processable);
    await this.submissionProcessor.processSubmission(processable, decision);
  }
}
