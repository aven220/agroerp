import { Injectable } from '@nestjs/common';
import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { CreateFarmDto } from '@/core/ftip/presentation/farms.dto';
import { resolveProcessingType } from '../types/processing-type';
import type { ProcessableSubmission, SubmissionProcessorResult } from '../types/processable-submission';
import type { SubmissionProcessor } from './submission-processor.interface';
import { asRecord, pickGps, pickNumber, pickString } from './submission-data.mapper';

@Injectable()
export class FarmSubmissionProcessor implements SubmissionProcessor {
  readonly key = 'farm';

  constructor(private readonly farms: FarmsService) {}

  canProcess(submission: ProcessableSubmission): boolean {
    return resolveProcessingType(submission.form) === CAPTURE_PROCESSING_TYPES.FARM_CREATE;
  }

  async process(submission: ProcessableSubmission): Promise<SubmissionProcessorResult> {
    const data = asRecord(submission.submission.data);
    const gps = pickGps(data, submission.submission.gpsLocation);

    const dto: CreateFarmDto = {
      farmName: pickString(data, ['farmName', 'farm_name', 'name']),
      farmCode: pickString(data, ['farmCode', 'farm_code']) || undefined,
      farmTypeCode: pickString(data, ['farmTypeCode', 'farm_type'], 'coffee'),
      productionSystemCode:
        pickString(data, ['productionSystemCode', 'production_system']) || undefined,
      departmentCode: pickString(data, ['departmentCode', 'department_code']) || undefined,
      municipalityCode: pickString(data, ['municipalityCode', 'municipality_code']) || undefined,
      veredaCode: pickString(data, ['veredaCode', 'vereda_code']) || undefined,
      streetAddress: pickString(data, ['streetAddress', 'address']) || undefined,
      centroidLatitude: gps.lat ?? pickNumber(data, ['centroidLatitude', 'latitude', 'lat']),
      centroidLongitude: gps.lng ?? pickNumber(data, ['centroidLongitude', 'longitude', 'lng']),
      totalAreaHa: pickNumber(data, ['totalAreaHa', 'total_area_ha', 'areaHa']),
      agriculturalAreaHa:
        pickNumber(data, ['agriculturalAreaHa', 'agricultural_area_ha']) ?? undefined,
      tenureTypeCode: pickString(data, ['tenureTypeCode', 'tenure_type']) || undefined,
      producerId: pickString(data, ['producerId', 'producer_id']) || undefined,
      externalId: submission.submission.externalId ?? undefined,
      observations: pickString(data, ['observations', 'notes']) || undefined,
    };

    const farm = await this.farms.create(
      submission.organizationId,
      submission.userId,
      dto,
      submission.ctx,
    );

    return {
      processorKey: this.key,
      processingType: CAPTURE_PROCESSING_TYPES.FARM_CREATE,
      entityType: 'FarmUnit',
      entityId: farm.id,
      duplicate: Boolean(
        submission.submission.externalId && farm.externalId === submission.submission.externalId,
      ),
    };
  }
}
