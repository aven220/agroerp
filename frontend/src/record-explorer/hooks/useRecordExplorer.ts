import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRecordExplorer } from '../api/record-explorer';
import type { UreRecordExplorerResponse } from '../types';

export function useRecordExplorer(entityType: string, recordId: string) {
  const [data, setData] = useState<UreRecordExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!entityType || !recordId) return;
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const payload = await fetchRecordExplorer(entityType, recordId);
      setData(payload);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el registro');
      if (!hasDataRef.current) setData(null);
    } finally {
      if (!hasDataRef.current) setLoading(false);
    }
  }, [entityType, recordId]);

  useEffect(() => {
    hasDataRef.current = false;
    setData(null);
    setError(null);
    setLoading(true);

    let cancelled = false;

    (async () => {
      try {
        const payload = await fetchRecordExplorer(entityType, recordId);
        if (!cancelled) {
          setData(payload);
          hasDataRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el registro');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityType, recordId]);

  return { data, loading, error, reload };
}
