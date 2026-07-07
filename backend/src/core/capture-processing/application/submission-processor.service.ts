import { Inject, Injectable, Logger } from '@nestjs/common';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { AnalyticsEventService } from '@/core/capture-analytics/application/analytics-event.service';
import { resolveProcessingType } from '../domain/types/processing-type';
import type {
  ProcessableSubmission,
  SubmissionProcessingOutcome,
} from '../domain/types/processable-submission';
import {
  CAPTURE_SUBMISSION_PROCESSORS,
  type SubmissionProcessor,
} from '../domain/processors/submission-processor.interface';

@Injectable()
export class SubmissionProcessorService {
  private readonly logger = new Logger(SubmissionProcessorService.name);

  constructor(
    @Inject(CAPTURE_SUBMISSION_PROCESSORS)
    private readonly processors: SubmissionProcessor[],
    private readonly core: CoreEngineService,
    private readonly analyticsEvents: AnalyticsEventService,
  ) {}

  async processSubmission(
    input: ProcessableSubmission,
  ): Promise<SubmissionProcessingOutcome> {
    if (input.draft) {
      return this.skipped(input, 'draft');
    }

    const processingType = resolveProcessingType(input.form);
    if (!processingType) {
      return this.skipped(input, 'no_processing_type');
    }

    const processor = this.processors.find((p) => p.canProcess(input));
    if (!processor) {
      return this.skipped(input, 'no_processor', processingType);
    }

    try {
      const result = await processor.process(input);

      await this.core.emitUserAction(
        input.organizationId,
        result.entityType,
        result.entityId,
        'CaptureSubmissionProcessed',
        {
          submissionId: input.submission.id,
          formId: input.form.id,
          formKey: input.form.formKey,
          externalId: input.submission.externalId,
          processingType: result.processingType,
          processorKey: result.processorKey,
          duplicate: result.duplicate ?? false,
        },
        { ctx: { ...input.ctx, userId: input.userId, organizationId: input.organizationId } },
      );

      try {
        await this.analyticsEvents.emitFromProcessing(
          {
            organizationId: input.organizationId,
            userId: input.userId,
            form: input.form,
            submission: input.submission,
            processingType: result.processingType,
            processorKey: result.processorKey,
            entityType: result.entityType,
            entityId: result.entityId,
            duplicate: result.duplicate,
          },
          input.ctx,
        );
      } catch (err) {
        this.logger.warn(
          `Analytics event failed for submission ${input.submission.id}: ${(err as Error).message}`,
        );
      }

      this.logger.log(
        `Processed submission ${input.submission.id} via ${processor.key} → ${result.entityType}:${result.entityId}`,
      );

      return {
        processed: true,
        processingType: result.processingType,
        processorKey: result.processorKey,
        entityType: result.entityType,
        entityId: result.entityId,
        duplicate: result.duplicate,
      };
    } catch (err) {
      this.logger.error(
        `Capture processing failed for submission ${input.submission.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private skipped(
    input: ProcessableSubmission,
    reason: string,
    processingType?: string,
  ): SubmissionProcessingOutcome {
    this.logger.debug(
      `Skipping capture processing for submission ${input.submission.id}: ${reason}`,
    );
    return {
      processed: false,
      skippedReason: reason,
      processingType,
    };
  }
}
