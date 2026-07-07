import { Injectable } from '@nestjs/common';
import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { CreateFieldLotDto } from '@/core/fmdt/presentation/lots.dto';
import { resolveProcessingType } from '../types/processing-type';
import type { ProcessableSubmission, SubmissionProcessorResult } from '../types/processable-submission';
import type { SubmissionProcessor } from './submission-processor.interface';
import { asRecord, pickNumber, pickString } from './submission-data.mapper';

@Injectable()
export class ProductionSubmissionProcessor implements SubmissionProcessor {
  readonly key = 'production';

  constructor(private readonly lots: LotsService) {}

  canProcess(submission: ProcessableSubmission): boolean {
    return resolveProcessingType(submission.form) === CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE;
  }

  async process(submission: ProcessableSubmission): Promise<SubmissionProcessorResult> {
    const data = asRecord(submission.submission.data);

    const dto: CreateFieldLotDto = {
      ftipLotUnitId: pickString(data, ['ftipLotUnitId', 'ftip_lot_unit_id', 'farmLotId']),
      lotCode: pickString(data, ['lotCode', 'lot_code']) || undefined,
      lotName: pickString(data, ['lotName', 'lot_name', 'name']),
      lotTypeCode: pickString(data, ['lotTypeCode', 'lot_type']) || undefined,
      totalAreaHa: pickNumber(data, ['totalAreaHa', 'total_area_ha', 'areaHa']),
      cultivableAreaHa: pickNumber(data, ['cultivableAreaHa', 'cultivable_area_ha']),
      plantedAreaHa: pickNumber(data, ['plantedAreaHa', 'planted_area_ha']),
      primaryCropCode: pickString(data, ['primaryCropCode', 'crop_code', 'crop']) || undefined,
      varietyCodes: Array.isArray(data.varietyCodes)
        ? (data.varietyCodes as string[])
        : undefined,
      productionSystemCode:
        pickString(data, ['productionSystemCode', 'production_system']) || undefined,
      expectedYieldKgHa: pickNumber(data, ['expectedYieldKgHa', 'expected_yield_kg_ha']),
      externalId: submission.submission.externalId ?? undefined,
      observations: pickString(data, ['observations', 'notes']) || undefined,
    };

    const lot = await this.lots.create(
      submission.organizationId,
      submission.userId,
      dto,
      submission.ctx,
    );

    return {
      processorKey: this.key,
      processingType: CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE,
      entityType: 'FieldLotProfile',
      entityId: lot.id,
      duplicate: Boolean(
        submission.submission.externalId && lot.externalId === submission.submission.externalId,
      ),
    };
  }
}
