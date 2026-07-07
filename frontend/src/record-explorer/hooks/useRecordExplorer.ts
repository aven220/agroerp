import { useCallback, useEffect, useState } from 'react';
import { fetchRecordExplorer } from '../api/record-explorer';
import type { UreRecordExplorerResponse } from '../types';

export function useRecordExplorer(entityType: string, recordId: string) {
  const [data, setData] = useState<UreRecordExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!entityType || !recordId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchRecordExplorer(entityType, recordId);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el registro');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, recordId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
