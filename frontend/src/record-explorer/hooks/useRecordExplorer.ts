import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRecordExplorer } from '../api/record-explorer';
import type { UreRecordExplorerResponse } from '../types';
import { useOnEntityUpdated } from '../../lib/entitySync';

export function useRecordExplorer(entityType: string, recordId: string) {
  const [data, setData] = useState<UreRecordExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!entityType || !recordId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchRecordExplorer(entityType, recordId);
      if (requestId !== requestIdRef.current) return;
      setData(payload);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar el registro');
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [entityType, recordId]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setData(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const payload = await fetchRecordExplorer(entityType, recordId);
        if (requestId !== requestIdRef.current) return;
        setData(payload);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Error al cargar el registro');
        setData(null);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    })();
  }, [entityType, recordId]);

  useOnEntityUpdated(reload, undefined, recordId, entityType);

  return { data, loading, error, reload };
}
