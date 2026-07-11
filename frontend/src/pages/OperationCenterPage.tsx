import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  PageLayout,
  PageSection,
  PageSummary,
  MetricCard,
  EmptyPanel,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import {
  getCoffeeCenter,
  getOpsAlerts,
  listSettlementPending,
  listQualityPending,
  listCoffeeDocuments,
  type CoffeeTicket,
} from '../api/coffee';
import { getWorkflowInbox, type WorkflowAssignment } from '../api/workflows';
import { listEimsMovements } from '../api/eims';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { labelTicketStatus, nextActionForTicket } from '../lib/productLabels';
import { humanizeCopy } from '../lib/humanizeCopy';
import { useOnEntityUpdated } from '../lib/entitySync';

type WorkItem = {
  id: string;
  label: string;
  count: number;
  to: string;
  urgency: 'now' | 'overdue' | 'waiting';
  hint?: string;
};

/**
 * PM-28 — Mi Día: home operativo por trabajo, no por módulos.
 */
export function OperationCenterPage() {
  const { user } = useAuth();
  const { navHistory } = useNavigation();
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [inbox, setInbox] = useState<WorkflowAssignment[]>([]);
  const [settlements, setSettlements] = useState<CoffeeTicket[]>([]);
  const [quality, setQuality] = useState<CoffeeTicket[]>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [movements, setMovements] = useState<Array<Record<string, unknown>>>([]);
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.all([
      getCoffeeCenter().catch((e: Error) => {
        if (!cancelled) setError(e.message);
        return null;
      }),
      getWorkflowInbox().catch(() => [] as WorkflowAssignment[]),
      listSettlementPending().catch(() => [] as CoffeeTicket[]),
      listQualityPending().catch(() => [] as CoffeeTicket[]),
      getOpsAlerts(false).catch(() => []),
      listEimsMovements({ status: 'pending' }).catch(() => []),
      listCoffeeDocuments().catch(() => []),
    ]).then(([center, wf, settle, qual, opsAlerts, movs, docs]) => {
      if (cancelled) return;
      if (center) setDash(center);
      setInbox(Array.isArray(wf) ? wf : []);
      setSettlements(Array.isArray(settle) ? settle : []);
      setQuality(Array.isArray(qual) ? qual : []);
      const alertList = Array.isArray(opsAlerts)
        ? (opsAlerts as Array<Record<string, unknown>>)
        : opsAlerts && typeof opsAlerts === 'object' && Array.isArray((opsAlerts as { alerts?: unknown[] }).alerts)
          ? (opsAlerts as { alerts: Array<Record<string, unknown>> }).alerts
          : [];
      setAlerts([...alertList, ...((center?.alerts ?? []) as Array<Record<string, unknown>>)].slice(0, 10));
      setMovements(
        (Array.isArray(movs) ? movs : []).slice(0, 8) as Array<Record<string, unknown>>,
      );
      setDocuments(
        (Array.isArray(docs) ? docs : []).slice(0, 8) as Array<Record<string, unknown>>,
      );
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useOnEntityUpdated(() => {
    getCoffeeCenter()
      .then((center) => setDash(center))
      .catch(() => undefined);
    getWorkflowInbox()
      .then((wf) => setInbox(Array.isArray(wf) ? wf : []))
      .catch(() => undefined);
    listSettlementPending()
      .then((settle) => setSettlements(Array.isArray(settle) ? settle : []))
      .catch(() => undefined);
    listQualityPending()
      .then((qual) => setQuality(Array.isArray(qual) ? qual : []))
      .catch(() => undefined);
  }, ['purchase', 'inventory', 'workflow']);

  const queue = useMemo(() => (dash?.queue ?? []).slice(0, 10), [dash]);

  const overdueApprovals = useMemo(() => {
    const now = Date.now();
    return inbox.filter((a) => a.dueAt && new Date(a.dueAt).getTime() < now);
  }, [inbox]);

  const signatureDocs = useMemo(() => {
    return documents.filter((d) => {
      const status = String(d.status ?? d.signatureStatus ?? d.state ?? '').toLowerCase();
      return (
        status.includes('sign') ||
        status.includes('firma') ||
        status.includes('pending') ||
        Boolean(d.requiresSignature)
      );
    });
  }, [documents]);

  const workNow = useMemo((): WorkItem[] => {
    const items: WorkItem[] = [];
    if ((dash?.queueLength ?? 0) > 0) {
      items.push({
        id: 'queue',
        label: 'Atender cola de pesaje',
        count: dash!.queueLength,
        to: '/compras/pesaje',
        urgency: 'now',
        hint: 'Hay vehículos o tickets esperando en recepción',
      });
    }
    if (quality.length > 0) {
      items.push({
        id: 'quality',
        label: 'Evaluar calidad pendiente',
        count: quality.length,
        to: '/compras/calidad',
        urgency: 'now',
      });
    }
    if (settlements.length > 0) {
      items.push({
        id: 'settle',
        label: 'Completar liquidaciones',
        count: settlements.length,
        to: '/compras/liquidaciones',
        urgency: 'now',
      });
    }
    if (inbox.length > 0) {
      items.push({
        id: 'approvals',
        label: 'Revisar aprobaciones',
        count: inbox.length,
        to: '/procesos/bandeja',
        urgency: overdueApprovals.length > 0 ? 'overdue' : 'waiting',
        hint: overdueApprovals.length > 0 ? `${overdueApprovals.length} fuera de plazo` : undefined,
      });
    }
    if (movements.length > 0) {
      items.push({
        id: 'movements',
        label: 'Movimientos que requieren atención',
        count: movements.length,
        to: '/inventario/movimientos',
        urgency: 'waiting',
      });
    }
    if (signatureDocs.length > 0) {
      items.push({
        id: 'docs',
        label: 'Documentos por firmar o completar',
        count: signatureDocs.length,
        to: '/documentos',
        urgency: 'waiting',
      });
    }
    if (alerts.length > 0) {
      items.push({
        id: 'alerts',
        label: 'Alertas operativas abiertas',
        count: alerts.length,
        to: '/notificaciones',
        urgency: 'waiting',
      });
    }
    return items;
  }, [dash, quality, settlements, inbox, overdueApprovals, movements, signatureDocs, alerts]);

  const recommended = useMemo(() => {
    const overdue = workNow.find((w) => w.urgency === 'overdue');
    if (overdue) return overdue;
    const now = workNow.find((w) => w.urgency === 'now');
    if (now) return now;
    if (workNow[0]) return workNow[0];
    return {
      id: 'idle',
      label: 'Registrar nueva recepción',
      count: 0,
      to: '/compras/recepcion',
      urgency: 'now' as const,
      hint: 'No hay pendientes críticos. Puede iniciar una compra.',
    };
  }, [workNow]);

  const queueRows = useMemo(
    () =>
      queue.map((t) =>
        withRowId(
          {
            ticketKey: t.ticketKey,
            producerName: t.producerName ?? '—',
            status: t.status,
            id: t.id || t.ticketKey,
          },
          'id',
          'ticketKey',
        ),
      ),
    [queue],
  );

  const approvalRows = useMemo(
    () =>
      inbox.slice(0, 8).map((a) =>
        withRowId(
          {
            id: a.id,
            label: a.instance?.workflowDefinition?.name ?? a.stateKey,
            resource: a.instance?.resourceType ?? 'Trámite',
            due: a.dueAt ? new Date(a.dueAt).toLocaleString() : 'Sin plazo',
            overdue: Boolean(a.dueAt && new Date(a.dueAt).getTime() < Date.now()),
          },
          'id',
        ),
      ),
    [inbox],
  );

  if (!loaded) {
    return <LoadingState variant="page" message="Preparando su día de trabajo…" />;
  }

  const firstName = user?.firstName ?? 'equipo';
  const openPurchases = queue.length + quality.length;

  return (
    <>
      <Header
        title="Mi día"
        subtitle={`Hola, ${firstName}`}
        description="Qué debe hacer ahora, qué está atrasado y qué espera su acción."
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <div className="row-actions mi-dia-toolbar">
            <Link to={recommended.to} className="btn btn-primary">
              {recommended.label}
            </Link>
            <Link to="/compras/recepcion" className="btn">
              Nueva recepción
            </Link>
            <Link to="/productores" className="btn btn-ghost">
              Buscar productor
            </Link>
            <Link to="/procesos/bandeja" className="btn btn-ghost">
              Aprobaciones
            </Link>
          </div>
        }
      >
        {error ? <section className="panel error-panel">{error}</section> : null}

        <PageSection title="Qué debo hacer ahora">
          <div className="eoc-next-action mi-dia-hero">
            <div>
              <p className="mi-dia-hero-kicker">
                {recommended.urgency === 'overdue' ? 'Atrasado' : 'Siguiente paso'}
              </p>
              <p>
                <strong>{recommended.label}</strong>
                {recommended.hint ? <span className="muted"> — {recommended.hint}</span> : null}
              </p>
            </div>
            <Link to={recommended.to} className="btn btn-primary">
              Continuar
            </Link>
          </div>
        </PageSection>

        <PageSummary>
          <MetricCard label="Hacer ahora" value={workNow.filter((w) => w.urgency === 'now').length} tone="coffee" />
          <MetricCard label="Atrasado" value={overdueApprovals.length} />
          <MetricCard label="Por aprobar" value={inbox.length} />
          <MetricCard label="Compras abiertas" value={openPurchases} />
          <MetricCard label="Liquidaciones" value={settlements.length} tone="teal" />
          <MetricCard label="Alertas" value={alerts.length} tone="green" />
        </PageSummary>

        <div className="eoc-grid mi-dia-grid">
          <PageSection title="Mis pendientes">
            {workNow.length === 0 ? (
              <EmptyPanel
                title="Todo al día"
                description="No hay trabajo operativo pendiente en este momento. Puede iniciar una recepción o revisar productores."
                hint="Cuando haya cola, calidad, liquidaciones o aprobaciones, aparecerán aquí."
                action={{ label: 'Registrar recepción', to: '/compras/recepcion' }}
              />
            ) : (
              <ul className="eoc-list mi-dia-work-list">
                {workNow.map((p) => (
                  <li key={p.id} className={`mi-dia-work-item urgency-${p.urgency}`}>
                    <Link to={p.to}>
                      <span className="mi-dia-work-count">{p.count}</span>
                      <span>
                        <strong>{p.label}</strong>
                        {p.hint ? <small className="muted">{p.hint}</small> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Qué está atrasado">
            {overdueApprovals.length === 0 ? (
              <EmptyPanel
                title="Sin atrasos"
                description="Ninguna aprobación o trámite está fuera de plazo."
                hint="Los ítems con fecha vencida se listan aquí automáticamente."
                action={{ label: 'Ver bandeja', to: '/procesos/bandeja' }}
              />
            ) : (
              <ul className="eoc-list">
                {overdueApprovals.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Link to="/procesos/bandeja">
                      <strong>{humanizeCopy(a.instance?.workflowDefinition?.name ?? a.stateKey)}</strong>
                      <span className="muted"> — venció {a.dueAt ? new Date(a.dueAt).toLocaleString() : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Esperando aprobación">
            {approvalRows.length === 0 ? (
              <EmptyPanel
                title="Nada por aprobar"
                description="Su bandeja de aprobaciones está vacía. Cuando alguien envíe un trámite, lo verá aquí."
                action={{ label: 'Abrir bandeja', to: '/procesos/bandeja' }}
              />
            ) : (
              <SimpleRecordsTable
                gridId="mi-dia-approvals"
                data={approvalRows}
                emptyMessage="Nada por aprobar"
                emptyDescription="Su bandeja está vacía."
                columns={[
                  { key: 'label', label: 'Trámite', getValue: (r) => humanizeCopy(String(r.label)) },
                  { key: 'resource', label: 'Tipo', getValue: (r) => humanizeCopy(String(r.resource)) },
                  {
                    key: 'due',
                    label: 'Plazo',
                    render: (r) => (
                      <span className={r.overdue ? 'text-danger' : undefined}>{String(r.due)}</span>
                    ),
                  },
                  {
                    key: 'go',
                    label: '',
                    render: () => <Link to="/procesos/bandeja">Abrir</Link>,
                  },
                ]}
              />
            )}
          </PageSection>

          <PageSection title="Compras abiertas">
            {queueRows.length === 0 && quality.length === 0 ? (
              <EmptyPanel
                title="Sin compras en curso"
                description="No hay tickets en cola ni pendientes de calidad. Registre una recepción para iniciar el flujo."
                action={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
              />
            ) : (
              <SimpleRecordsTable
                gridId="mi-dia-queue"
                data={queueRows}
                emptyMessage="Cola vacía"
                emptyDescription="No hay tickets en cola de pesaje."
                columns={[
                  { key: 'ticketKey', label: 'Ticket', getValue: (r) => r.ticketKey },
                  { key: 'producerName', label: 'Productor', getValue: (r) => r.producerName ?? '—' },
                  {
                    key: 'status',
                    label: 'Estado',
                    getValue: (r) => labelTicketStatus(r.status),
                  },
                  {
                    key: 'action',
                    label: 'Acción',
                    render: (r) => {
                      const next = nextActionForTicket(r.status);
                      return next ? (
                        <Link to={`${next.to}?ticket=${encodeURIComponent(r.ticketKey)}`}>{next.label}</Link>
                      ) : (
                        '—'
                      );
                    },
                  },
                ]}
              />
            )}
          </PageSection>

          <PageSection title="Liquidaciones pendientes">
            {settlements.length === 0 ? (
              <EmptyPanel
                title="Sin liquidaciones pendientes"
                description="No hay compras listas para liquidar. Avancen calidad y pesaje para generar liquidaciones."
                action={{ label: 'Ir a liquidaciones', to: '/compras/liquidaciones' }}
              />
            ) : (
              <ul className="eoc-list">
                {settlements.slice(0, 6).map((t) => (
                  <li key={t.id || t.ticketKey}>
                    <Link to={`/compras/liquidaciones?ticket=${encodeURIComponent(t.ticketKey)}`}>
                      <strong>{t.ticketKey}</strong> · {t.producerName ?? 'Productor'} ·{' '}
                      {labelTicketStatus(t.status)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Movimientos que requieren atención">
            {movements.length === 0 ? (
              <EmptyPanel
                title="Sin movimientos pendientes"
                description="No hay movimientos de inventario en estado pendiente. Los que requieran revisión aparecerán aquí."
                action={{ label: 'Ver movimientos', to: '/inventario/movimientos' }}
              />
            ) : (
              <ul className="eoc-list">
                {movements.map((m, i) => (
                  <li key={String(m.id ?? i)}>
                    <Link to="/inventario/movimientos">
                      <strong>{humanizeCopy(String(m.movementType ?? m.type ?? 'Movimiento'))}</strong>
                      <span className="muted">
                        {' '}
                        — {humanizeCopy(String(m.status ?? m.itemKey ?? 'Pendiente'))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Documentos que requieren firma">
            {signatureDocs.length === 0 ? (
              <EmptyPanel
                title="Sin documentos por firmar"
                description="No hay documentos pendientes de firma o completado en este momento."
                action={{ label: 'Abrir documentos', to: '/documentos' }}
              />
            ) : (
              <ul className="eoc-list">
                {signatureDocs.slice(0, 6).map((d, i) => (
                  <li key={String(d.id ?? i)}>
                    <Link to="/documentos">
                      <strong>{String(d.title ?? d.name ?? d.documentKey ?? 'Documento')}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Alertas">
            {alerts.length === 0 ? (
              <EmptyPanel
                title="Sin alertas"
                description="No hay alertas operativas abiertas. El centro de notificaciones mostrará avisos nuevos."
                action={{ label: 'Ver notificaciones', to: '/notificaciones' }}
              />
            ) : (
              <ul className="emc-alerts">
                {alerts.slice(0, 6).map((a, i) => (
                  <li key={i}>
                    <span className="emc-alert-sev">
                      [{humanizeCopy(String(a.severity ?? a.level ?? 'info'))}]
                    </span>{' '}
                    <strong>{String(a.title ?? a.type ?? 'Alerta')}</strong>
                    {a.message ? <span className="muted"> — {String(a.message)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Actividad reciente">
            {navHistory.length === 0 ? (
              <EmptyPanel
                title="Sin actividad reciente"
                description="Las pantallas que visite durante el día aparecerán aquí para retomar el trabajo."
              />
            ) : (
              <ul className="eoc-list">
                {navHistory.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <Link to={h.to}>
                      <span aria-hidden>{h.icon}</span> {h.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      </PageLayout>
    </>
  );
}
