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
    const filesByExternalId = new Map<string, NonNullable<CaptureSyncInput['files']>>();

    for (const file of dto.files ?? []) {
      if (!file.externalId) continue;
      const list = filesByExternalId.get(file.externalId) ?? [];
      list.push(file);
      filesByExternalId.set(file.externalId, list);
    }

    const batch = await this.submissions.syncBatch(
      organizationId,
      userId,
      {
        submissions: dto.submissions.map((item) => ({
          formId: item.formId,
          formKey: item.formKey,
          data: item.data,
          externalId: item.externalId,
          gpsLocation: item.gpsLocation,
          gpsTrack: item.gpsTrack,
          deviceInfo: {
            ...(item.deviceInfo ?? globalDeviceInfo ?? {}),
            captureFiles: filesByExternalId.get(item.externalId) ?? [],
          },
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
