/**
 * PM-44 — Dashboard Inteligente.
 * Cambia por rol · centro · paquete · empresa. Persistencia local existente.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { EnterpriseDataGrid } from '../data-workspace/EnterpriseDataGrid';
import type { GridColumnDef } from '../../lib/data-grid/types';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { resolveWorkspaceRole, WORKSPACE_ROLE_LABELS, type WorkspaceRole } from '../../config/workspaceRoles';
import {
  SMART_DASH_WIDGETS,
  SMART_WIDGET_IDS,
  normalizeSmartLayout,
  type SmartWidgetId,
} from '../../config/smartDashboard';
import { readCachedCompanyProfile } from '../../config/navProgression';
import { useWorkspaceData, type WorkspaceData } from '../../hooks/useWorkspaceData';
import { buildRoleWorkGuide } from '../../config/roleWorkGuide';
import { humanizeCopy } from '../../lib/humanizeCopy';
import { SmartWidgetShell } from './SmartWidgetShell';

function storageCollapsedKey(userId: string | undefined, role: WorkspaceRole) {
  return `agroerp_smart_collapsed_v1_${userId ?? 'anon'}_${role}`;
}

function ticketLabel(t: { ticketKey?: string; id?: string; producerName?: string }) {
  return t.ticketKey || t.producerName || t.id || 'Ticket';
}

function TaskList({
  items,
  emptyTitle,
  emptyDescription,
  emptyHint,
  emptyAction,
}: {
  items: Array<{ id: string; label: string; meta?: string; to?: string }>;
  emptyTitle: string;
  emptyDescription: string;
  emptyHint?: string;
  emptyAction?: { label: string; to?: string };
}) {
  if (!items.length) {
    return (
      <EmptyPanel
        title={emptyTitle}
        description={emptyDescription}
        hint={emptyHint}
        action={emptyAction}
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

function RoleBrief({ role, data }: { role: WorkspaceRole; data: WorkspaceData }) {
  const guide = buildRoleWorkGuide(role, data);
  return (
    <div className="sd-role-brief">
      <p>
        <span className="page-experience-q">¿Qué hago aquí?</span> {guide.what}
      </p>
      <p>
        <span className="page-experience-q">¿Qué sigue?</span> {guide.next}
      </p>
      <p>
        <span className="page-experience-q">¿Qué falta?</span> {guide.missing}
      </p>
      <p>
        <span className="page-experience-q">¿Qué riesgo tengo?</span> {guide.risk}
      </p>
      <p className="sd-role-brief-cta">
        <Link to={guide.primary.to} className="btn btn-primary btn-sm">
          {guide.primary.label}
        </Link>
      </p>
    </div>
  );
}

function WelcomeBlock({
  firstName,
  company,
  centerLabel,
  packageLabel,
  roleLabel,
  role,
  data,
}: {
  firstName: string;
  company: string;
  centerLabel: string;
  packageLabel: string;
  roleLabel: string;
  role: WorkspaceRole;
  data: WorkspaceData;
}) {
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div className="sd-welcome">
      <p className="sd-welcome-hello">
        Hola, <strong>{firstName}</strong>
      </p>
      <p className="sd-welcome-meta muted">
        {today} · {company} · {centerLabel} · {packageLabel} · {roleLabel}
      </p>
      <RoleBrief role={role} data={data} />
    </div>
  );
}

function SummaryMetrics({ role, data }: { role: WorkspaceRole; data: WorkspaceData }) {
  if (role === 'admin') {
    return (
      <PageSummary>
        <MetricCard label="Go Live" value={data.certified ? 'Listo' : 'Pendiente'} tone={data.certified ? 'green' : 'coffee'} />
        <MetricCard label="Alertas" value={data.alerts.length} />
        <MetricCard label="Aprobaciones" value={data.inbox.length} />
        <MetricCard label="Paquete" value="Coop. café" tone="teal" />
      </PageSummary>
    );
  }
  if (role === 'executive' || role === 'consulta') {
    return (
      <PageSummary>
        <MetricCard label="Kg hoy" value={data.center ? data.center.kgToday.toFixed(0) : '—'} tone="coffee" />
        <MetricCard
          label="Ingresos"
          value={data.center ? `$${data.center.amountToday.toLocaleString('es-CO')}` : '—'}
          tone="teal"
        />
        <MetricCard label="Tickets" value={data.center?.ticketsToday ?? '—'} />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
    );
  }
  if (role === 'quality') {
    return (
      <PageSummary>
        <MetricCard label="Por evaluar" value={data.quality.length} tone="coffee" />
        <MetricCard label="Hoy" value={data.center?.qualityToday ?? 0} tone="green" />
        <MetricCard label="Alertas" value={data.alerts.length} />
      </PageSummary>
    );
  }
  if (role === 'inventory') {
    return (
      <PageSummary>
        <MetricCard label="Movimientos" value={data.movements.length} />
        <MetricCard label="Stock bajo" value={data.lowStock.length} tone="coffee" />
        <MetricCard label="Reservas" value={data.reservations.length} tone="teal" />
      </PageSummary>
    );
  }
  return (
    <PageSummary>
      <MetricCard label="En cola" value={data.center?.queueLength ?? 0} tone="coffee" />
      <MetricCard label="Pesajes" value={data.weighing.length} />
      <MetricCard label="Liquidaciones" value={data.settlements.length} tone="teal" />
      <MetricCard label="Alertas" value={data.alerts.length} />
    </PageSummary>
  );
}

function NextQueue({ role, data }: { role: WorkspaceRole; data: WorkspaceData }) {
  if (role === 'consulta') {
    return (
      <EmptyPanel
        title="Vista de consulta"
        description="No hay cola operativa. Use reportes e indicadores."
        action={{ label: 'Centro de reportes', to: '/bi' }}
      />
    );
  }
  if (role === 'executive') {
    const risks: Array<{ id: string; label: string; meta?: string }> = [];
    if ((data.center?.queueLength ?? 0) > 5) {
      risks.push({ id: 'q', label: 'Cola elevada', meta: String(data.center?.queueLength) });
    }
    if ((data.wfDash?.summary.overdueProcesses ?? 0) > 0) {
      risks.push({ id: 'o', label: 'Trámites vencidos', meta: String(data.wfDash?.summary.overdueProcesses) });
    }
    return (
      <TaskList
        emptyTitle="Sin riesgos inmediatos"
        emptyDescription="No hay colas elevadas ni trámites vencidos. La operación se ve estable."
        emptyHint="Revise reportes gerenciales si necesita profundidad."
        emptyAction={{ label: 'Abrir reportes', to: '/bi' }}
        items={risks}
      />
    );
  }
  if (role === 'admin') {
    return (
      <TaskList
        emptyTitle="—"
        emptyDescription=""
        items={[
          {
            id: 'go',
            label: data.certified ? 'Revisar estado Go Live' : 'Continuar implementación',
            to: data.certified ? '/implementacion/estado' : '/implementacion',
          },
          { id: 'u', label: 'Gestionar usuarios', to: '/implementacion/usuarios' },
        ]}
      />
    );
  }
  if (role === 'quality') {
    return (
      <TaskList
        emptyTitle="Sin evaluaciones pendientes"
        emptyDescription="No hay muestras esperando calidad. El flujo de evaluación está al día."
        emptyHint="Cuando haya tickets pesados, aparecerán aquí para evaluar."
        emptyAction={{ label: 'Abrir calidad', to: '/compras/calidad' }}
        items={data.quality.slice(0, 6).map((t) => ({
          id: t.id,
          label: ticketLabel(t),
          meta: t.producerName,
          to: '/compras/calidad',
        }))}
      />
    );
  }
  if (role === 'inventory') {
    return (
      <TaskList
        emptyTitle="Sin pendientes de stock"
        emptyDescription="No hay stock bajo ni reservas urgentes. El inventario está estable."
        emptyHint="Puede registrar una entrada o consultar el kardex."
        emptyAction={{ label: 'Nuevo movimiento', to: '/inventario/movimientos' }}
        items={[
          ...data.lowStock.slice(0, 4).map((s, i) => ({
            id: `s${i}`,
            label: String(s.itemName ?? s.itemKey ?? 'Artículo'),
            meta: 'Stock bajo',
            to: '/inventario',
          })),
          ...data.reservations.slice(0, 3).map((r, i) => ({
            id: `r${i}`,
            label: String(r.reservationKey ?? r.itemKey ?? 'Reserva'),
            to: '/inventario/reservas',
          })),
          {
            id: 'kardex',
            label: 'Consultar kardex',
            meta: 'Trazabilidad',
            to: '/inventario/kardex',
          },
        ]}
      />
    );
  }
  if (role === 'field') {
    return (
      <TaskList
        emptyTitle="Sin pendientes de campo"
        emptyDescription="No hay visitas ni formularios en cola. Puede capturar un nuevo formulario."
        emptyAction={{ label: 'Abrir formularios', to: '/formularios' }}
        items={[
          ...(data.inbox.length
            ? [{ id: 'i', label: 'Aprobaciones de campo', meta: String(data.inbox.length), to: '/procesos/bandeja' }]
            : []),
          { id: 'f', label: 'Formularios', meta: 'Captura', to: '/formularios' },
          { id: 'p', label: 'Productores', meta: 'Visitas', to: '/productores' },
        ]}
      />
    );
  }
  // purchasing / supervisor
  return (
    <TaskList
      emptyTitle="Todo al día"
      emptyDescription="No hay recepciones, pesajes ni liquidaciones pendientes ahora."
      emptyHint="Si llega café, registre una nueva recepción."
      emptyAction={{ label: 'Nueva recepción', to: '/compras/recepcion' }}
      items={[
        ...(data.center?.queueLength
          ? [{ id: 'q', label: 'Recepciones en cola', meta: String(data.center.queueLength), to: '/compras/cola' }]
          : []),
        ...(data.weighing.length
          ? [{ id: 'w', label: 'Pesajes pendientes', meta: String(data.weighing.length), to: '/compras/pesaje' }]
          : []),
        ...(data.settlements.length
          ? [{ id: 's', label: 'Liquidaciones', meta: String(data.settlements.length), to: '/compras/liquidaciones' }]
          : []),
        ...(data.inbox.length
          ? [{ id: 'i', label: 'Aprobaciones', meta: String(data.inbox.length), to: '/procesos/bandeja' }]
          : []),
      ]}
    />
  );
}

type MoveRow = { id: string; label: string; meta: string; when: string };

function MovementsBlock({ role, data }: { role: WorkspaceRole; data: WorkspaceData }) {
  const rows: MoveRow[] = useMemo(() => {
    if (role === 'inventory') {
      return data.movements.slice(0, 8).map((m, i) => ({
        id: String(m.id ?? m.movementKey ?? i),
        label: humanizeCopy(String(m.movementType ?? m.type ?? 'Movimiento')),
        meta: String(m.itemKey ?? m.itemName ?? '—'),
        when: m.createdAt ? new Date(String(m.createdAt)).toLocaleString('es-CO') : '—',
      }));
    }
    if (role === 'admin' || role === 'executive' || role === 'consulta') {
      return (data.center?.queue ?? []).slice(0, 8).map((t) => ({
        id: t.id,
        label: ticketLabel(t),
        meta: t.producerName ?? '—',
        when: t.createdAt ? new Date(t.createdAt).toLocaleString('es-CO') : '—',
      }));
    }
    return (data.center?.queue ?? []).slice(0, 8).map((t) => ({
      id: t.id,
      label: ticketLabel(t),
      meta: t.producerName ?? '—',
      when: t.createdAt ? new Date(t.createdAt).toLocaleString('es-CO') : '—',
    }));
  }, [role, data]);

  const columns: GridColumnDef<MoveRow>[] = [
    { key: 'label', label: 'Registro', getValue: (r) => r.label },
    { key: 'meta', label: 'Detalle', getValue: (r) => r.meta },
    { key: 'when', label: 'Fecha', getValue: (r) => r.when },
  ];

  if (!rows.length) {
    return (
      <EmptyPanel
        title="Sin movimientos recientes"
        description="Todavía no hay actividad registrada en su dominio de trabajo."
        hint="Los movimientos aparecerán al operar compras o inventario."
        action={
          role === 'inventory'
            ? { label: 'Registrar movimiento', to: '/inventario/movimientos' }
            : { label: 'Ir a compras', to: '/compras' }
        }
      />
    );
  }

  return (
    <EnterpriseDataGrid
      gridId={`smart-movements-${role}`}
      columns={columns}
      data={rows}
      selectable={false}
      emptyMessage="Sin movimientos"
    />
  );
}

function FrequentBlock({
  role,
  favorites,
  navHistory,
  recentSearches,
}: {
  role: WorkspaceRole;
  favorites: Array<{ id: string; label: string; to: string; icon: string }>;
  navHistory: Array<{ id: string; label: string; to: string; icon: string }>;
  recentSearches: string[];
}) {
  const roleLinks: Array<{ id: string; label: string; to: string }> =
    role === 'admin'
      ? [
          { id: 'imp', label: 'Implementación', to: '/implementacion' },
          { id: 'usr', label: 'Usuarios', to: '/implementacion/usuarios' },
          { id: 'go', label: 'Go Live', to: '/implementacion/go-live' },
        ]
      : role === 'executive' || role === 'consulta'
        ? [
            { id: 'bi', label: 'Reportes', to: '/bi' },
            { id: 'ger', label: 'Gerenciales', to: '/gerencia' },
            { id: 'ind', label: 'Operativos', to: '/compras/ops/reportes' },
          ]
        : role === 'quality'
          ? [{ id: 'cal', label: 'Calidad', to: '/compras/calidad' }]
          : role === 'inventory'
            ? [
                { id: 'inv', label: 'Inventario', to: '/inventario' },
                { id: 'mov', label: 'Movimientos', to: '/inventario/movimientos' },
              ]
            : [
                { id: 'com', label: 'Compras', to: '/compras' },
                { id: 'rec', label: 'Nueva recepción', to: '/compras/recepcion' },
                { id: 'col', label: 'Cola', to: '/compras/cola' },
              ];

  const favItems = favorites.slice(0, 5).map((f) => ({
    id: `f-${f.id}`,
    label: f.label,
    meta: 'Favorito',
    to: f.to,
  }));
  const histItems = navHistory.slice(0, 5).map((h) => ({
    id: `h-${h.id}`,
    label: h.label,
    meta: 'Reciente',
    to: h.to,
  }));
  const searchItems = recentSearches.slice(0, 3).map((q, i) => ({
    id: `s-${i}`,
    label: q,
    meta: 'Búsqueda',
  }));

  return (
    <div className="edl-split">
      <PageSection title="Favoritos y sugeridos">
        <TaskList
          emptyTitle="Sin favoritos"
          emptyDescription="Marque ★ en el menú para fijar accesos."
          items={[...favItems, ...roleLinks.filter((l) => !favItems.some((f) => f.to === l.to))]}
        />
      </PageSection>
      <PageSection title="Últimas páginas y búsquedas">
        <TaskList
          emptyTitle="Sin historial"
          emptyDescription="Navegue el sistema para llenar este bloque."
          items={[...histItems, ...searchItems]}
        />
      </PageSection>
    </div>
  );
}

export function SmartDashboard({ forceRole }: { forceRole?: WorkspaceRole }) {
  const { user } = useAuth();
  const experience = useExperienceCenterOptional();
  const command = useCommandPaletteOptional();
  const {
    favorites,
    navHistory,
    recentSearches,
    widgetLayout,
    setWidgetOrder,
    toggleWidget,
    replaceWidgetLayout,
  } = useNavigation();
  const data = useWorkspaceData();
  const role = forceRole ?? resolveWorkspaceRole(user?.roles ?? []);
  const roleLabel = WORKSPACE_ROLE_LABELS[role];
  const firstName = user?.firstName ?? 'equipo';
  const company =
    readCachedCompanyProfile()?.legalName?.trim() ||
    user?.organization?.name ||
    'Empresa';
  const centerLabel = experience?.centerMeta.shortLabel ?? 'Operación';
  const packageLabel =
    experience?.packageId === 'coop-cafe-co' ? 'Cooperativa cafetera' : 'Paquete activo';

  const layout = useMemo(
    () => normalizeSmartLayout(widgetLayout.order, widgetLayout.hidden, role),
    [widgetLayout.order, widgetLayout.hidden, role],
  );

  useEffect(() => {
    const looksLegacy =
      widgetLayout.order.length > 0 && !widgetLayout.order.some((id) => SMART_WIDGET_IDS.includes(id as SmartWidgetId));
    if (!widgetLayout.order.length || looksLegacy) {
      replaceWidgetLayout({ order: layout.order, hidden: layout.hidden });
    }
    // solo al montar / cambio de rol
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const [editMode, setEditMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageCollapsedKey(user?.id, role)) ?? '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      setCollapsed(JSON.parse(localStorage.getItem(storageCollapsedKey(user?.id, role)) ?? '{}'));
    } catch {
      setCollapsed({});
    }
  }, [user?.id, role]);

  useEffect(() => {
    localStorage.setItem(storageCollapsedKey(user?.id, role), JSON.stringify(collapsed));
  }, [collapsed, user?.id, role]);

  const visibleIds = layout.order.filter((id) => !layout.hidden.includes(id));

  const moveWidget = (id: SmartWidgetId, dir: -1 | 1) => {
    const idx = layout.order.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= layout.order.length) return;
    const next = [...layout.order];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setWidgetOrder(next);
  };

  const restoreHidden = (id: SmartWidgetId) => {
    if (layout.hidden.includes(id)) toggleWidget(id);
  };

  if (!data.loaded) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Preparando su dashboard…" />;
  }

  const guide = buildRoleWorkGuide(role, data);

  return (
    <>
      <PageHeader
        title="Inicio"
        subtitle={`${firstName}, aquí está su trabajo de hoy · ${roleLabel}`}
        description={guide.what}
        help={guide.next}
        nextStep={guide.primary}
        lastUpdated={new Date().toISOString()}
        showExperience
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={
              role === 'executive' || role === 'consulta' ? undefined : guide.primary
            }
            searchPlaceholder="Buscar en AGROERP…"
            searchValue=""
            onSearchChange={() => command?.openPalette('launcher')}
            moreActions={[
              {
                label: editMode ? 'Listo' : 'Personalizar',
                onClick: () => setEditMode((v) => !v),
              },
              {
                label: 'Restablecer widgets',
                onClick: () => {
                  const defaults = normalizeSmartLayout([], [], role);
                  replaceWidgetLayout({ order: defaults.order, hidden: defaults.hidden });
                  setCollapsed({});
                },
              },
              ...layout.hidden.map((id) => ({
                label: `Mostrar: ${SMART_DASH_WIDGETS.find((w) => w.id === id)?.label ?? id}`,
                onClick: () => restoreHidden(id),
              })),
            ]}
          />
        }
      >
        {data.error ? <PageState variant="error" message={data.error} /> : null}

        {editMode ? (
          <p className="muted sd-edit-hint">Modo personalización: reordene, colapse u oculte bloques.</p>
        ) : null}

        <div className="sd-stack">
          {visibleIds.map((id, index) => (
            <SmartWidgetShell
              key={id}
              id={id}
              editMode={editMode}
              collapsed={Boolean(collapsed[id])}
              onToggleCollapse={() => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
              onHide={() => toggleWidget(id)}
              onMoveUp={() => moveWidget(id, -1)}
              onMoveDown={() => moveWidget(id, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < visibleIds.length - 1}
            >
              {id === 'sd-welcome' ? (
                <WelcomeBlock
                  firstName={firstName}
                  company={company}
                  centerLabel={centerLabel}
                  packageLabel={packageLabel}
                  roleLabel={roleLabel}
                  role={role}
                  data={data}
                />
              ) : null}
              {id === 'sd-summary' ? <SummaryMetrics role={role} data={data} /> : null}
              {id === 'sd-next' ? <NextQueue role={role} data={data} /> : null}
              {id === 'sd-movements' ? <MovementsBlock role={role} data={data} /> : null}
              {id === 'sd-alerts' ? (
                <TaskList
                  emptyTitle="Sin alertas"
                  emptyDescription="No hay alertas abiertas."
                  items={data.alerts.slice(0, 8).map((a, i) => ({
                    id: String(a.id ?? i),
                    label: humanizeCopy(String(a.title ?? a.message ?? 'Alerta')),
                    to: '/notificaciones',
                  }))}
                />
              ) : null}
              {id === 'sd-frequent' ? (
                <FrequentBlock
                  role={role}
                  favorites={favorites}
                  navHistory={navHistory}
                  recentSearches={recentSearches}
                />
              ) : null}
            </SmartWidgetShell>
          ))}
        </div>
      </PageLayout>
    </>
  );
}

/** Compat: el dashboard clásico ahora es el inteligente */
export function DashboardWorkspace() {
  return <SmartDashboard />;
}
