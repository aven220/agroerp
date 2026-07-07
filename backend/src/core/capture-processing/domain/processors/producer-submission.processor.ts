import { Injectable } from '@nestjs/common';
import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { ProducersService } from '@/core/prm/application/producers.service';
import { CreateProducerDto } from '@/core/prm/presentation/producers.dto';
import { resolveProcessingType } from '../types/processing-type';
import type { ProcessableSubmission, SubmissionProcessorResult } from '../types/processable-submission';
import type { SubmissionProcessor } from './submission-processor.interface';
import { asRecord, pickGps, pickString } from './submission-data.mapper';

@Injectable()
export class ProducerSubmissionProcessor implements SubmissionProcessor {
  readonly key = 'producer';

  constructor(private readonly producers: ProducersService) {}

  canProcess(submission: ProcessableSubmission): boolean {
    return resolveProcessingType(submission.form) === CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE;
  }

  async process(submission: ProcessableSubmission): Promise<SubmissionProcessorResult> {
    const data = asRecord(submission.submission.data);
    const gps = pickGps(data, submission.submission.gpsLocation);

    const dto: CreateProducerDto = {
      producerTypeCode: pickString(data, ['producerTypeCode', 'producer_type'], 'individual'),
      legalName: pickString(data, ['legalName', 'name', 'fullName']),
      commercialName: pickString(data, ['commercialName', 'commercial_name']) || undefined,
      firstName: pickString(data, ['firstName', 'first_name']) || undefined,
      lastName: pickString(data, ['lastName', 'last_name']) || undefined,
      documentTypeCode: pickString(data, ['documentTypeCode', 'document_type'], 'CC'),
      documentNumber: pickString(data, ['documentNumber', 'document_number']),
      municipalityCode: pickString(data, ['municipalityCode', 'municipality_code']) || undefined,
      veredaCode: pickString(data, ['veredaCode', 'vereda_code']) || undefined,
      latitude: gps.lat,
      longitude: gps.lng,
      externalId: submission.submission.externalId ?? undefined,
      metadata: {
        captureSubmissionId: submission.submission.id,
        formKey: submission.form.formKey,
        phone: pickString(data, ['phone', 'mobilePhone', 'mobile']) || undefined,
        email: pickString(data, ['email']) || undefined,
      },
    };

    const producer = await this.producers.create(
      submission.organizationId,
      submission.userId,
      dto,
      submission.ctx,
    );

    return {
      processorKey: this.key,
      processingType: CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
      entityType: 'Producer',
      entityId: producer.id,
      duplicate: Boolean(
        submission.submission.externalId && producer.externalId === submission.submission.externalId,
      ),
    };
  }
}
