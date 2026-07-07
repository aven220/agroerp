import { apiRequest } from '../../api/client';
import type { UreRecordExplorerResponse } from '../types';

export async function fetchRecordExplorer(
  entityType: string,
  recordId: string,
): Promise<UreRecordExplorerResponse> {
  const encodedEntity = encodeURIComponent(entityType);
  const encodedId = encodeURIComponent(recordId);
  return apiRequest<UreRecordExplorerResponse>(
    `/record-explorer/${encodedEntity}/${encodedId}`,
  );
}
