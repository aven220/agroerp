/**
 * PM-43 FASE 4 — Workspaces por rol (Mi Día).
 * Solo Design System: PageLayout, PageHeader, MetricCard, PageSection,
 * EmptyPanel, PageState, HubToolbar. Sin paneles legacy.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  PageHeader,
  PageLayout,
  PageSection,
  PageSummary,
  MetricCard,
  EmptyPanel,
  PageState,
} from '../page';
import { HubToolbar } from '../layout/HubToolbar';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { resolveWorkspaceRole, WORKSPACE_ROLE_LABELS, type WorkspaceRole } from '../../config/workspaceRoles';
import { useWorkspaceData, type WorkspaceData } from '../../hooks/useWorkspaceData';
import { humanizeCopy } from '../../lib/humanizeCopy';

type RecentItem = { id: string; label: string; to: string };

function ticketLabel(t: { ticketKey?: string; id?: string; producerName?: string }): string {
  return t.ticketKey || t.producerName || t.id || 'Ticket';
}

function NextAction({
  label,
  hint,
  to,
}: {
  label: string;
  hint?: string;
  to: string;
}) {
  return (
    <PageSection title="Siguiente acción">
      <div className="mi-dia-hero eoc-next-action">
        <div>
          <p className="mi-dia-hero-kicker">Ahora</p>
          <p>
            <strong>{label}</strong>
            {hint ? <span className="muted"> — {hint}</span> : null}
          </p>
        </div>
        <Link to={to} className="btn btn-primary">
          Continuar
        </Link>
      </div>
    </PageSection>
  );
}

function TaskList({
  items,
  emptyTitle,
  emptyDescription,
  emptyTo,
  emptyAction,
}: {
  items: Array<{ id: string; label: string; meta?: string; to?: string }>;
  emptyTitle: string;
  emptyDescription: string;
  emptyTo?: string;
  emptyAction?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyPanel
        title={emptyTitle}
        description={emptyDescription}
        action={emptyTo && emptyAction ? { label: emptyAction, to: emptyTo } : undefined}
      />
    );
  }
  return (
    <ul className="eoc-list mi-dia-work-list">
      {items.map((item) => (
        <li key={item.id}>
          {item.to ? (
            <Link to={item.to}>
              <strong>{item.label}</strong>
              {item.meta ? <small className="muted">{item.meta}</small> : null}
            </Link>
          ) : (
            <>
              <strong>{item.label}</strong>
              {item.meta ? <small className="muted">{item.meta}</small> : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function PurchasingBody({ data }: { data: WorkspaceData }) {
  const queue = data.center?.queue ?? [];
  const docsPending = data.inbox.length;
  const next =
    (data.center?.queueLength ?? 0) > 0
      ? { label: 'Atender cola de recepción', hint: `${data.center?.queueLength} en espera`, to: '/compras/cola' }
      : data.weighing.length > 0
        ? { label: 'Continuar pesajes', hint: `${data.weighing.length} pendientes`, to: '/compras/pesaje' }
        : data.quality.length > 0
          ? { label: 'Evaluar calidad', hint: `${data.quality.length} pendientes`, to: '/compras/calidad' }
          : data.settlements.length > 0
            ? { label: 'Liquidar compras', hint: `${data.settlements.length} pendientes`, to: '/compras/liquidaciones' }
            : { label: 'Registrar nueva recepción', hint: 'Inicie la jornada de compras', to: '/compras/recepcion' };

  return (
    <>
      <NextAction {...next} />
      <PageSummary>
        <MetricCard label="Recepciones en cola" value={data.center?.queueLength ?? 0} tone="coffee" />
        <MetricCard label="Pesajes pendientes" value={data.weighing.length} />
        <MetricCard label="Liquidaciones pendientes" value={data.settlements.length} tone="teal" />
        <MetricCard label="Documentos / aprobaciones" value={docsPending} />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Tareas pendientes">
          <TaskList
            emptyTitle="Todo al día"
            emptyDescription="No hay tareas de compras pendientes."
            emptyTo="/compras/recepcion"
            emptyAction="Nueva recepción"
            items={[
              { id: 'r', label: 'Recepciones esperando', meta: String(data.center?.queueLength ?? 0), to: '/compras/cola' },
              { id: 'p', label: 'Pesajes pendientes', meta: String(data.weighing.length), to: '/compras/pesaje' },
              { id: 'l', label: 'Liquidaciones pendientes', meta: String(data.settlements.length), to: '/compras/liquidaciones' },
              { id: 'd', label: 'Documentos por aprobar', meta: String(docsPending), to: '/procesos/bandeja' },
            ].filter((i) => Number(i.meta) > 0)}
          />
        </PageSection>
        <PageSection title="Actividad reciente">
          <TaskList
            emptyTitle="Sin actividad"
            emptyDescription="Cuando haya tickets en cola, aparecerán aquí."
            items={queue.slice(0, 6).map((t) => ({
              id: t.id || t.ticketKey,
              label: ticketLabel(t),
              meta: t.producerName,
              to: '/compras/cola',
            }))}
          />
        </PageSection>
      </div>
      <PageSection title="Alertas">
        <TaskList
          emptyTitle="Sin alertas"
          emptyDescription="No hay alertas operativas abiertas."
          items={data.alerts.slice(0, 5).map((a, i) => ({
            id: String(a.id ?? i),
            label: humanizeCopy(String(a.title ?? a.message ?? 'Alerta')),
            to: '/notificaciones',
          }))}
        />
      </PageSection>
    </>
  );
}

function QualityBody({ data }: { data: WorkspaceData }) {
  const pending = data.quality.length;
  const avg = String((data.center?.operations as Record<string, unknown> | undefined)?.avgQualityMinutes ?? '—');
  return (
    <>
      <NextAction
        label={pending > 0 ? 'Evaluar lotes pendientes' : 'Revisar calidad del día'}
        hint={pending > 0 ? `${pending} en cola` : 'Sin cola de evaluación'}
        to="/compras/calidad"
      />
      <PageSummary>
        <MetricCard label="Lotes esperando evaluación" value={pending} tone="coffee" />
        <MetricCard label="Calificaciones hoy" value={data.center?.qualityToday ?? 0} tone="green" />
        <MetricCard label="Promedio ciclo (min)" value={avg} tone="teal" />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Calificaciones pendientes">
          <TaskList
            emptyTitle="Sin pendientes"
            emptyDescription="No hay muestras esperando evaluación."
            emptyTo="/compras/calidad"
            emptyAction="Abrir calidad"
            items={data.quality.slice(0, 8).map((t) => ({
              id: t.id,
              label: ticketLabel(t),
              meta: t.producerName,
              to: '/compras/calidad',
            }))}
          />
        </PageSection>
        <PageSection title="Últimos análisis">
          <TaskList
            emptyTitle="Sin análisis recientes"
            emptyDescription="Los resultados del día aparecerán aquí."
            items={[
              {
                id: 'today',
                label: `Evaluaciones completadas hoy: ${data.center?.qualityToday ?? 0}`,
                to: '/compras/calidad',
              },
              {
                id: 'avg',
                label: `Tiempo promedio de calidad: ${avg} min`,
              },
            ]}
          />
        </PageSection>
      </div>
    </>
  );
}

function InventoryBody({ data }: { data: WorkspaceData }) {
  const pendingMoves = data.movements.filter((m) =>
    String(m.status ?? '').toLowerCase().includes('pend'),
  );
  return (
    <>
      <NextAction
        label={data.lowStock.length > 0 ? 'Revisar existencias bajas' : 'Registrar movimiento'}
        hint={data.lowStock.length > 0 ? `${data.lowStock.length} alertas de stock` : 'Mantenga el kardex al día'}
        to={data.lowStock.length > 0 ? '/inventario' : '/inventario/movimientos'}
      />
      <PageSummary>
        <MetricCard label="Entradas / movimientos" value={data.movements.length} />
        <MetricCard label="Alertas de stock" value={data.lowStock.length} tone="coffee" />
        <MetricCard label="Reservas" value={data.reservations.length} tone="teal" />
        <MetricCard label="Pendientes" value={pendingMoves.length || data.invAlerts.length} />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Entradas y movimientos recientes">
          <TaskList
            emptyTitle="Sin movimientos"
            emptyDescription="Aún no hay movimientos recientes."
            emptyTo="/inventario/movimientos"
            emptyAction="Nuevo movimiento"
            items={data.movements.slice(0, 6).map((m, i) => ({
              id: String(m.id ?? m.movementKey ?? i),
              label: humanizeCopy(String(m.movementType ?? m.type ?? 'Movimiento')),
              meta: String(m.itemKey ?? m.itemName ?? ''),
              to: '/inventario/movimientos',
            }))}
          />
        </PageSection>
        <PageSection title="Alertas de stock y reservas">
          <TaskList
            emptyTitle="Sin alertas"
            emptyDescription="Stock y reservas bajo control."
            items={[
              ...data.lowStock.slice(0, 4).map((s, i) => ({
                id: `s-${i}`,
                label: String(s.itemName ?? s.itemKey ?? 'Artículo'),
                meta: 'Existencia baja',
                to: '/inventario',
              })),
              ...data.reservations.slice(0, 3).map((r, i) => ({
                id: `r-${i}`,
                label: String(r.itemKey ?? r.reservationKey ?? 'Reserva'),
                meta: 'Reserva',
                to: '/inventario/reservas',
              })),
            ]}
          />
        </PageSection>
      </div>
    </>
  );
}

function SupervisorBody({ data }: { data: WorkspaceData }) {
  const overdue = data.inbox.filter((a) => a.dueAt && new Date(a.dueAt).getTime() < Date.now()).length;
  return (
    <>
      <NextAction
        label={overdue > 0 ? 'Resolver aprobaciones atrasadas' : 'Revisar flujo del día'}
        hint={overdue > 0 ? `${overdue} fuera de plazo` : 'Cola, calidad y liquidaciones'}
        to={overdue > 0 ? '/procesos/bandeja' : '/compras/cola'}
      />
      <PageSummary>
        <MetricCard label="Cola" value={data.center?.queueLength ?? 0} tone="coffee" />
        <MetricCard label="Calidad" value={data.quality.length} />
        <MetricCard label="Liquidaciones" value={data.settlements.length} tone="teal" />
        <MetricCard label="Por aprobar" value={data.inbox.length} />
        <MetricCard label="Atrasados" value={overdue} tone="coffee" />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Pendientes del flujo">
          <TaskList
            emptyTitle="Flujo al día"
            emptyDescription="No hay cuellos de botella visibles."
            items={[
              { id: '1', label: 'Recepciones / cola', meta: String(data.center?.queueLength ?? 0), to: '/compras/cola' },
              { id: '2', label: 'Pesajes', meta: String(data.weighing.length), to: '/compras/pesaje' },
              { id: '3', label: 'Calidad', meta: String(data.quality.length), to: '/compras/calidad' },
              { id: '4', label: 'Liquidaciones', meta: String(data.settlements.length), to: '/compras/liquidaciones' },
            ].filter((i) => Number(i.meta) > 0)}
          />
        </PageSection>
        <PageSection title="Documentos y aprobaciones">
          <TaskList
            emptyTitle="Nada por aprobar"
            emptyDescription="Su bandeja está vacía."
            emptyTo="/procesos/bandeja"
            emptyAction="Abrir bandeja"
            items={data.inbox.slice(0, 6).map((a) => ({
              id: a.id,
              label: humanizeCopy(a.instance?.workflowDefinition?.name ?? a.stateKey),
              meta: a.dueAt ? new Date(a.dueAt).toLocaleString('es-CO') : undefined,
              to: '/procesos/bandeja',
            }))}
          />
        </PageSection>
      </div>
      <PageSection title="Alertas">
        <TaskList
          emptyTitle="Sin alertas"
          emptyDescription="Sin alertas abiertas."
          items={data.alerts.slice(0, 5).map((a, i) => ({
            id: String(a.id ?? i),
            label: humanizeCopy(String(a.title ?? a.message ?? 'Alerta')),
            to: '/notificaciones',
          }))}
        />
      </PageSection>
    </>
  );
}

function ExecutiveBody({ data }: { data: WorkspaceData }) {
  const conversion =
    data.center && data.center.ticketsToday > 0
      ? Math.round(((data.center.settlementsToday ?? 0) / data.center.ticketsToday) * 100)
      : null;
  const risks: Array<{ id: string; label: string; meta?: string }> = [];
  if ((data.center?.queueLength ?? 0) > 5) {
    risks.push({ id: 'q', label: 'Cola operativa elevada', meta: `${data.center?.queueLength} en espera` });
  }
  if ((data.wfDash?.summary.overdueProcesses ?? 0) > 0) {
    risks.push({
      id: 'o',
      label: 'Trámites fuera de plazo',
      meta: String(data.wfDash?.summary.overdueProcesses),
    });
  }
  const qualityGap = Math.max(0, (data.center?.weighedToday ?? 0) - (data.center?.qualityToday ?? 0));
  if (qualityGap > 0) {
    risks.push({ id: 'c', label: 'Brecha de calidad', meta: `${qualityGap} pesajes sin evaluar` });
  }

  return (
    <>
      <PageSummary>
        <MetricCard label="Producción (kg)" value={data.center ? data.center.kgToday.toFixed(0) : '—'} tone="coffee" />
        <MetricCard
          label="Ingresos"
          value={data.center ? `$${data.center.amountToday.toLocaleString('es-CO')}` : '—'}
          tone="teal"
        />
        <MetricCard label="Tickets" value={data.center?.ticketsToday ?? '—'} />
        <MetricCard label="Conversión" value={conversion != null ? `${conversion}%` : '—'} tone="green" />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Comparativos del día">
          <TaskList
            emptyTitle="Sin datos"
            emptyDescription="Aún no hay operación registrada hoy."
            items={[
              { id: 'w', label: `Pesajes: ${data.center?.weighedToday ?? '—'}` },
              { id: 'q', label: `Calidad: ${data.center?.qualityToday ?? '—'}` },
              { id: 's', label: `Liquidaciones: ${data.center?.settlementsToday ?? '—'}` },
              {
                id: 't',
                label: `Ciclo total: ${String((data.center?.operations as Record<string, unknown> | undefined)?.avgTotalProcessMinutes ?? '—')} min`,
              },
            ]}
          />
        </PageSection>
        <PageSection title="Riesgos">
          <TaskList
            emptyTitle="Sin riesgos destacados"
            emptyDescription="No se detectan riesgos operativos mayores."
            items={risks}
          />
        </PageSection>
      </div>
      <PageSection title="Alertas">
        <TaskList
          emptyTitle="Sin alertas"
          emptyDescription="Sin alertas gerenciales abiertas."
          items={data.alerts.slice(0, 6).map((a, i) => ({
            id: String(a.id ?? i),
            label: humanizeCopy(String(a.title ?? a.message ?? 'Alerta')),
            to: '/notificaciones',
          }))}
        />
      </PageSection>
    </>
  );
}

function AdminBody({ data, recent }: { data: WorkspaceData; recent: RecentItem[] }) {
  return (
    <>
      <NextAction
        label={data.certified ? 'Revisar estado de la empresa' : 'Continuar implementación'}
        hint={data.certified ? 'Go Live activo' : 'Certificación pendiente'}
        to={data.certified ? '/implementacion/estado' : '/implementacion'}
      />
      <PageSummary>
        <MetricCard label="Go Live" value={data.certified ? 'Listo' : 'Pendiente'} tone={data.certified ? 'green' : 'coffee'} />
        <MetricCard label="Alertas" value={data.alerts.length} />
        <MetricCard label="Aprobaciones" value={data.inbox.length} />
        <MetricCard label="Licencia" value="Coop. café" tone="teal" />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Estado empresa e implementación">
          <TaskList
            emptyTitle="—"
            emptyDescription=""
            items={[
              { id: 'e', label: 'Organización', to: '/implementacion/empresa' },
              { id: 'u', label: 'Usuarios', to: '/implementacion/usuarios' },
              { id: 'i', label: 'Implementación', to: '/implementacion' },
              { id: 'g', label: 'Go Live', to: '/implementacion/go-live' },
              { id: 'l', label: 'Licencia / paquete', to: '/implementacion/modulos' },
              { id: 'b', label: 'Respaldo / estado', meta: 'Revisar estado del sistema', to: '/implementacion/estado' },
            ]}
          />
        </PageSection>
        <PageSection title="Alertas y actividad">
          <TaskList
            emptyTitle="Sin actividad"
            emptyDescription="Sin alertas ni visitas recientes."
            items={[
              ...data.alerts.slice(0, 3).map((a, i) => ({
                id: `a-${i}`,
                label: humanizeCopy(String(a.title ?? a.message ?? 'Alerta')),
                to: '/notificaciones',
              })),
              ...recent.slice(0, 4).map((r) => ({ id: r.id, label: r.label, to: r.to })),
            ]}
          />
        </PageSection>
      </div>
    </>
  );
}

function ConsultaBody({ data }: { data: WorkspaceData }) {
  return (
    <>
      <PageSummary>
        <MetricCard label="Tickets hoy" value={data.center?.ticketsToday ?? '—'} />
        <MetricCard label="Kg" value={data.center ? data.center.kgToday.toFixed(0) : '—'} />
        <MetricCard label="Liquidaciones" value={data.center?.settlementsToday ?? '—'} tone="teal" />
        <MetricCard label="En cola" value={data.center?.queueLength ?? '—'} />
      </PageSummary>
      <PageSection title="Indicadores">
        <EmptyPanel
          title="Solo lectura"
          description="Este perfil muestra indicadores. No hay acciones operativas disponibles."
        />
      </PageSection>
    </>
  );
}

function FieldBody({ data, recent }: { data: WorkspaceData; recent: RecentItem[] }) {
  return (
    <>
      <NextAction label="Revisar productores" hint="Visitas y pendientes de campo" to="/productores" />
      <PageSummary>
        <MetricCard label="Cola / visitas" value={data.center?.queueLength ?? 0} tone="coffee" />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
      <div className="edl-split">
        <PageSection title="Pendientes">
          <TaskList
            emptyTitle="Sin pendientes"
            emptyDescription="Campo al día."
            items={[
              { id: 'p', label: 'Productores', to: '/productores' },
              { id: 'f', label: 'Fincas', to: '/fincas' },
              { id: 'l', label: 'Lotes', to: '/lotes' },
            ]}
          />
        </PageSection>
        <PageSection title="Últimas actividades">
          <TaskList
            emptyTitle="Sin recientes"
            emptyDescription="Aún no hay visitas registradas en esta sesión."
            items={recent.slice(0, 6).map((r) => ({ id: r.id, label: r.label, to: r.to }))}
          />
        </PageSection>
      </div>
    </>
  );
}

function bodyForRole(role: WorkspaceRole, data: WorkspaceData, recent: RecentItem[]) {
  switch (role) {
    case 'admin':
      return <AdminBody data={data} recent={recent} />;
    case 'purchasing':
      return <PurchasingBody data={data} />;
    case 'quality':
      return <QualityBody data={data} />;
    case 'inventory':
      return <InventoryBody data={data} />;
    case 'executive':
      return <ExecutiveBody data={data} />;
    case 'consulta':
      return <ConsultaBody data={data} />;
    case 'supervisor':
      return <SupervisorBody data={data} />;
    case 'field':
      return <FieldBody data={data} recent={recent} />;
    default:
      return <PurchasingBody data={data} />;
  }
}

function toolbarForRole(
  role: WorkspaceRole,
  opts: { search: string; setSearch: (v: string) => void; onSearch: () => void },
) {
  if (role === 'executive' || role === 'consulta') return null;
  if (role === 'admin') {
    return (
      <HubToolbar
        primaryAction={{ label: 'Implementación', to: '/implementacion' }}
        moreActions={[
          { label: 'Usuarios', to: '/implementacion/usuarios' },
          { label: 'Go Live', to: '/implementacion/go-live' },
          { label: 'Estado', to: '/implementacion/estado' },
        ]}
      />
    );
  }
  if (role === 'purchasing' || role === 'supervisor') {
    return (
      <HubToolbar
        primaryAction={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
        searchPlaceholder="Buscar recepción…"
        searchValue={opts.search}
        onSearchChange={opts.setSearch}
        moreActions={[
          { label: 'Abrir jornada', to: '/operacion' },
          { label: 'Ver pendientes', to: '/compras/cola' },
          { label: 'Buscar recepción', to: '/compras/cola', onClick: opts.onSearch },
        ]}
      />
    );
  }
  if (role === 'quality') {
    return (
      <HubToolbar
        primaryAction={{ label: 'Abrir calidad', to: '/compras/calidad' }}
        moreActions={[{ label: 'Indicadores', to: '/compras/calidad/indicadores' }]}
      />
    );
  }
  if (role === 'inventory') {
    return (
      <HubToolbar
        primaryAction={{ label: 'Nuevo movimiento', to: '/inventario/movimientos' }}
        moreActions={[
          { label: 'Reservas', to: '/inventario/reservas' },
          { label: 'Bodegas', to: '/inventario/bodegas' },
        ]}
      />
    );
  }
  if (role === 'field') {
    return (
      <HubToolbar
        primaryAction={{ label: 'Productores', to: '/productores' }}
        moreActions={[
          { label: 'Fincas', to: '/fincas' },
          { label: 'Lotes', to: '/lotes' },
        ]}
      />
    );
  }
  return null;
}

export function EnterpriseWorkspace({ forceRole }: { forceRole?: WorkspaceRole }) {
  const { user } = useAuth();
  const { navHistory } = useNavigation();
  const command = useCommandPaletteOptional();
  const navigate = useNavigate();
  const data = useWorkspaceData();
  const role = forceRole ?? resolveWorkspaceRole(user?.roles ?? []);
  const label = WORKSPACE_ROLE_LABELS[role];
  const firstName = user?.firstName ?? 'equipo';
  const recent = navHistory.slice(0, 8).map((h) => ({ id: h.id, label: h.label, to: h.to }));
  const [search, setSearch] = useState('');

  const onSearch = () => {
    if (search.trim()) {
      navigate(`/compras/cola`);
      return;
    }
    command?.openPalette('launcher');
  };

  if (!data.loaded) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Preparando su día de trabajo…" />;
  }

  const title =
    role === 'executive' ? 'Mi Día · Gerencia' : role === 'admin' ? 'Mi Día · Administración' : 'Mi Día';
  const description =
    role === 'executive' || role === 'consulta'
      ? 'Solo indicadores, riesgos y alertas. Sin acciones operativas.'
      : role === 'admin'
        ? 'Estado de la empresa, implementación y alertas. Sin operaciones de compra.'
        : 'Qué tiene que hacer hoy — pendientes, actividad y siguiente paso.';

  return (
    <PageLayout toolbar={toolbarForRole(role, { search, setSearch, onSearch })}>
      <PageHeader
        title={title}
        subtitle={`${label} · Hola, ${firstName}`}
        description={description}
        showExperience={false}
      />
      {data.error ? <PageState variant="error" message={data.error} /> : null}
      {bodyForRole(role, data, recent)}
    </PageLayout>
  );
}
