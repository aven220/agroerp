import { useEffect, useState } from 'react';
import { listResources } from '../api/resources';
import { RESOURCE_TYPES, type DashboardStats, type Resource } from '../types';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listResources(RESOURCE_TYPES.PRODUCER),
      listResources(RESOURCE_TYPES.FARM),
      listResources(RESOURCE_TYPES.PURCHASE),
      listResources(RESOURCE_TYPES.INVENTORY),
      listResources(RESOURCE_TYPES.FILE),
    ])
      .then(([producers, farms, purchases, inventory, files]) => {
        const totalKg = purchases.reduce(
          (s, p) => s + Number((p.data as { weight_kg?: number }).weight_kg ?? 0),
          0,
        );
        const totalValue = purchases.reduce((s, p) => {
          const d = p.data as { weight_kg?: number; price_per_kg?: number };
          return s + (d.weight_kg ?? 0) * (d.price_per_kg ?? 0);
        }, 0);
        const inventoryKg = inventory.reduce(
          (s, i) => s + Number((i.data as { stock_kg?: number }).stock_kg ?? 0),
          0,
        );
        setStats({
          producers: producers.length,
          farms: farms.length,
          purchases: purchases.length,
          totalKg,
          totalValue,
          inventoryKg,
          documents: files.length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export function useResources(type: string, refreshKey = 0) {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setError(null);
    listResources(type)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, refreshKey]);

  return { items, loading, error, reload };
}
