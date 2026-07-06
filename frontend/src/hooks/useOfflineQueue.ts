import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export type QueueItemStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface OfflineQueueItem {
  id: string;
  type: 'form_draft' | 'form_submit' | 'quick_capture';
  label: string;
  route?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  status: QueueItemStatus;
  error?: string;
}

function storageKey(userId: string | undefined) {
  return `agroerp_offline_queue_${userId ?? 'anon'}`;
}

export function useOfflineQueue() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<OfflineQueueItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]');
    } catch {
      return [];
    }
  });
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  }, [items, userId]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const enqueue = useCallback((item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const now = new Date().toISOString();
    const entry: OfflineQueueItem = {
      ...item,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
    };
    setItems((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<OfflineQueueItem>) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearSynced = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== 'synced'));
  }, []);

  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'failed').length;

  return {
    items,
    online,
    pendingCount,
    enqueue,
    updateItem,
    removeItem,
    clearSynced,
  };
}
