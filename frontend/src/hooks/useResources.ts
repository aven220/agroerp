import { useCallback, useEffect, useState } from 'react';
import { getProducerDashboard } from '../api/prm';
import { getFarmDashboard } from '../api/ftip';
import { getCoffeeCenter, listCoffeeDocuments } from '../api/coffee';
import { getEimsCenter } from '../api/eims';
import type { DashboardStats } from '../types';

interface CoffeeKpis {
  tickets?: number;
  kgTotal?: number;
  amountTotal?: number;
  inventoryKg?: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [prm, ftip, coffee, eims, docs] = await Promise.allSettled([
    getProducerDashboard(),
    getFarmDashboard(),
    getCoffeeCenter(),
    getEimsCenter(),
    listCoffeeDocuments(),
  ]);

  const producers =
    prm.status === 'fulfilled' ? prm.value.kpis.total : 0;
  const farms =
    ftip.status === 'fulfilled' ? ftip.value.kpis.total : 0;

  let purchases = 0;
  let totalKg = 0;
  let totalValue = 0;
  let inventoryKg = 0;

  if (coffee.status === 'fulfilled') {
    const kpis = coffee.value.kpis as CoffeeKpis | undefined;
    purchases = Number(kpis?.tickets ?? coffee.value.ticketsToday ?? 0);
    totalKg = Number(kpis?.kgTotal ?? coffee.value.kgToday ?? 0);
    totalValue = Number(kpis?.amountTotal ?? coffee.value.amountToday ?? 0);
    inventoryKg = Number(kpis?.inventoryKg ?? 0);
  }

  if (eims.status === 'fulfilled' && inventoryKg === 0) {
    const center = eims.value;
    inventoryKg = Number(center.totalStockQty ?? center.lotsCount ?? 0);
  }

  const documents = docs.status === 'fulfilled' ? docs.value.length : 0;

  return {
    producers,
    farms,
    purchases,
    totalKg,
    totalValue,
    inventoryKg,
    documents,
  };
}

export function useDashboardStats(enabled = true) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    fetchDashboardStats()
      .then(setStats)
      .catch((e: unknown) => {
        setStats(null);
        setError(e instanceof Error ? e.message : 'Error al cargar indicadores');
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [enabled, reload]);

  useEffect(() => {
    const onEntityUpdated = () => reload();
    window.addEventListener('agroerp:entity-updated', onEntityUpdated);
    return () => window.removeEventListener('agroerp:entity-updated', onEntityUpdated);
  }, [reload]);

  return { stats, loading, error, reload };
}
