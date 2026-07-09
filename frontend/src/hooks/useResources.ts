import { useCallback, useEffect, useRef, useState } from 'react';
import { getProducerDashboard } from '../api/prm';
import { getFarmDashboard } from '../api/ftip';
import { getCoffeeCenter, listCoffeeDocuments } from '../api/coffee';
import { listEimsStock } from '../api/eims';
import type { DashboardStats } from '../types';
import { useOnEntityUpdated } from '../lib/entitySync';
import { useIsMounted } from './useIsMounted';

interface CoffeeKpis {
  tickets?: number;
  kgTotal?: number;
  amountTotal?: number;
  inventoryKg?: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [prm, ftip, coffee, docs, stock] = await Promise.allSettled([
    getProducerDashboard(),
    getFarmDashboard(),
    getCoffeeCenter(),
    listCoffeeDocuments(),
    listEimsStock(),
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

  if (stock.status === 'fulfilled') {
    const eimsQty = (stock.value as Array<Record<string, unknown>>).reduce(
      (sum, row) => sum + Number(row.onHandQty ?? row.availableQty ?? 0),
      0,
    );
    if (inventoryKg === 0 && eimsQty > 0) {
      inventoryKg = eimsQty;
    }
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
  const mounted = useIsMounted();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    fetchDashboardStats()
      .then((data) => {
        if (mounted.current) setStats(data);
      })
      .catch((e: unknown) => {
        if (!mounted.current) return;
        setStats(null);
        setError(e instanceof Error ? e.message : 'Error al cargar indicadores');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [enabled, mounted]);

  const scheduleReload = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(reload, 200);
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [enabled, reload]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useOnEntityUpdated(scheduleReload);

  return { stats, loading, error, reload };
}
