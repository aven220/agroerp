/**
 * PM-42 — Datos del workspace (APIs existentes, sin endpoints nuevos).
 */

import { useEffect, useState } from 'react';
import {
  getCoffeeCenter,
  getOpsAlerts,
  getExecutiveDashboard,
  listSettlementPending,
  listQualityPending,
  listWeighingPending,
  type CoffeeTicket,
} from '../api/coffee';
import { getWorkflowInbox, getWorkflowDashboard, type WorkflowAssignment } from '../api/workflows';
import { listEimsMovements, listEimsOpsAlerts, listEimsReservations, listEimsStockLevels } from '../api/eims';
import { useOnEntityUpdated } from '../lib/entitySync';
import { readCertifiedLocalSafe } from '../lib/goliveLocal';

export interface WorkspaceData {
  loaded: boolean;
  error: string;
  center: Awaited<ReturnType<typeof getCoffeeCenter>> | null;
  exec: Record<string, unknown> | null;
  inbox: WorkflowAssignment[];
  settlements: CoffeeTicket[];
  quality: CoffeeTicket[];
  weighing: CoffeeTicket[];
  alerts: Array<Record<string, unknown>>;
  movements: Array<Record<string, unknown>>;
  invAlerts: Array<Record<string, unknown>>;
  reservations: Array<Record<string, unknown>>;
  lowStock: Array<Record<string, unknown>>;
  wfDash: Awaited<ReturnType<typeof getWorkflowDashboard>> | null;
  certified: boolean;
  certifiedAt: string | null;
}

export function useWorkspaceData(): WorkspaceData {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState<WorkspaceData['center']>(null);
  const [exec, setExec] = useState<Record<string, unknown> | null>(null);
  const [inbox, setInbox] = useState<WorkflowAssignment[]>([]);
  const [settlements, setSettlements] = useState<CoffeeTicket[]>([]);
  const [quality, setQuality] = useState<CoffeeTicket[]>([]);
  const [weighing, setWeighing] = useState<CoffeeTicket[]>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [movements, setMovements] = useState<Array<Record<string, unknown>>>([]);
  const [invAlerts, setInvAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [reservations, setReservations] = useState<Array<Record<string, unknown>>>([]);
  const [lowStock, setLowStock] = useState<Array<Record<string, unknown>>>([]);
  const [wfDash, setWfDash] = useState<WorkspaceData['wfDash']>(null);
  const [certified, setCertified] = useState(false);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);

  const reload = () => {
    const local = readCertifiedLocalSafe();
    setCertified(local.certified);
    setCertifiedAt(local.at);

    Promise.all([
      getCoffeeCenter().catch((e: Error) => {
        setError(e.message);
        return null;
      }),
      getExecutiveDashboard().catch(() => null),
      getWorkflowInbox().catch(() => [] as WorkflowAssignment[]),
      listSettlementPending().catch(() => [] as CoffeeTicket[]),
      listQualityPending().catch(() => [] as CoffeeTicket[]),
      listWeighingPending().catch(() => [] as CoffeeTicket[]),
      getOpsAlerts(false).catch(() => []),
      listEimsMovements({}).catch(() => []),
      listEimsOpsAlerts().catch(() => []),
      listEimsReservations({}).catch(() => []),
      listEimsStockLevels({}).catch(() => []),
      getWorkflowDashboard().catch(() => null),
    ]).then(([c, executive, wf, settle, qual, weigh, opsAlerts, movs, iAlerts, reserv, stock, wfd]) => {
      if (c) setCenter(c);
      if (executive) setExec(executive as Record<string, unknown>);
      setInbox(Array.isArray(wf) ? wf : []);
      setSettlements(Array.isArray(settle) ? settle : []);
      setQuality(Array.isArray(qual) ? qual : []);
      setWeighing(Array.isArray(weigh) ? weigh : []);
      const alertList = Array.isArray(opsAlerts)
        ? (opsAlerts as Array<Record<string, unknown>>)
        : opsAlerts && typeof opsAlerts === 'object' && Array.isArray((opsAlerts as { alerts?: unknown[] }).alerts)
          ? (opsAlerts as { alerts: Array<Record<string, unknown>> }).alerts
          : [];
      setAlerts([...alertList, ...((c?.alerts ?? []) as Array<Record<string, unknown>>)].slice(0, 8));
      setMovements((Array.isArray(movs) ? movs : []).slice(0, 8) as Array<Record<string, unknown>>);
      setInvAlerts((Array.isArray(iAlerts) ? iAlerts : []).slice(0, 8) as Array<Record<string, unknown>>);
      setReservations((Array.isArray(reserv) ? reserv : []).slice(0, 8) as Array<Record<string, unknown>>);
      const levels = (Array.isArray(stock) ? stock : []) as Array<Record<string, unknown>>;
      setLowStock(
        levels
          .filter((s) => {
            const qty = Number(s.quantity ?? s.onHand ?? s.available ?? 0);
            const min = Number(s.minQuantity ?? s.reorderPoint ?? s.minStock ?? 0);
            return min > 0 ? qty <= min : qty <= 0;
          })
          .slice(0, 8),
      );
      if (wfd) setWfDash(wfd);
      setLoaded(true);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  useOnEntityUpdated(() => {
    reload();
  }, ['purchase', 'inventory', 'workflow']);

  return {
    loaded,
    error,
    center,
    exec,
    inbox,
    settlements,
    quality,
    weighing,
    alerts,
    movements,
    invAlerts,
    reservations,
    lowStock,
    wfDash,
    certified,
    certifiedAt,
  };
}
