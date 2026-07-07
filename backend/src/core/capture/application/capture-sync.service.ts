import { Injectable } from '@nestjs/common';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import type { CaptureSyncInput, CaptureSyncResponse } from '../domain';

@Injectable()
export class CaptureSyncService {
  constructor(private readonly submissions: FormSubmissionsService) {}

  async sync(
    organizationId: string,
    userId: string,
    dto: CaptureSyncInput,
    ctx?: RequestContext,
  ): Promise<CaptureSyncResponse> {
    const globalDeviceInfo = dto.deviceInfo;

    const batch = await this.submissions.syncBatch(
      organizationId,
      userId,
      {
        submissions: dto.submissions.map((item) => ({
          formId: item.formId,
          data: item.data,
          externalId: item.externalId,
          gpsLocation: item.gpsLocation,
          gpsTrack: item.gpsTrack,
          deviceInfo: item.deviceInfo ?? globalDeviceInfo,
          clientCreatedAt: item.clientCreatedAt,
        })),
      },
      ctx,
    );

    return {
      results: batch.results,
      filesReceived: dto.files?.length ?? 0,
      processedAt: new Date().toISOString(),
    };
  }
}
