import { Link } from 'react-router-dom';
import { Header } from '../layout/Header';
import { PageLayout } from '../page';
import { LoadingState } from '../ux/LoadingState';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { resolveWorkspaceRole, WORKSPACE_ROLE_LABELS, type WorkspaceRole } from '../../config/workspaceRoles';
import { useWorkspaceData, type WorkspaceData } from '../../hooks/useWorkspaceData';
import { humanizeCopy } from '../../lib/humanizeCopy';
import { WsCard, WsKpi, WsList, WsPrimaryAction } from './WorkspaceChrome';

function ticketLabel(t: { ticketKey?: string; id?: string; producerName?: string }): string {
  return t.ticketKey || t.producerName || t.id || 'Ticket';
}

function alertItems(alerts: Array<Record<string, unknown>>, limit = 5) {
  return alerts.slice(0, limit).map((a, i) => ({
    id: String(a.id ?? a.key ?? i),
    label: humanizeCopy(String(a.title ?? a.message ?? a.type ?? 'Alerta')),
    meta: a.severity ? String(a.severity) : undefined,
    to: '/notificaciones',
  }));
}

function AdminWorkspace({ data, recent }: { data: WorkspaceData; recent: Array<{ id: string; label: string; to: string }> }) {
  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Go Live" value={data.certified ? 'Listo' : 'Pendiente'} to="/implementacion/go-live" tone={data.certified ? 'ok' : 'warn'} />
        <WsKpi label="Usuarios" value="—" to="/implementacion/usuarios" />
        <WsKpi label="Alertas" value={data.alerts.length} to="/notificaciones" tone={data.alerts.length ? 'warn' : 'ok'} />
        <WsKpi label="Aprobaciones" value={data.inbox.length} to="/procesos/bandeja" />
      </div>
      <div className="ews-grid">
        <WsCard title="Estado general" icon="◈" action={{ label: 'Implementación', to: '/implementacion' }}>
          <p className="ews-lead">
            {data.certified
              ? `Empresa certificada${data.certifiedAt ? ` · ${new Date(data.certifiedAt).toLocaleDateString('es-CO')}` : ''}.`
              : 'La empresa aún no está certificada para Go Live. Complete la puesta en marcha.'}
          </p>
        </WsCard>
        <WsCard title="Implementación" icon="🧭" action={{ label: 'Abrir', to: '/implementacion' }}>
          <WsList
            empty="Sin pasos visibles"
            items={[
              { id: 'emp', label: 'Organización', to: '/implementacion/empresa' },
              { id: 'usr', label: 'Usuarios y roles', to: '/implementacion/usuarios' },
              { id: 'cfg', label: 'Configuración', to: '/implementacion/configuracion' },
              { id: 'est', label: 'Estado del sistema', to: '/implementacion/estado' },
            ]}
          />
        </WsCard>
        <WsCard title="Go Live" icon="✓" action={{ label: 'Certificar', to: '/implementacion/go-live' }}>
          <p className="ews-lead">{data.certified ? 'Certificación activa.' : 'Pendiente de certificación.'}</p>
        </WsCard>
        <WsCard title="Alertas" icon="🔔" action={{ label: 'Ver todas', to: '/notificaciones' }}>
          <WsList items={alertItems(data.alerts)} empty="Sin alertas abiertas" />
        </WsCard>
        <WsCard title="Licencia / paquete" icon="▦">
          <p className="ews-lead">Cooperativa cafetera — Colombia</p>
          <Link to="/implementacion/modulos" className="ews-card-action">
            Ver alcance
          </Link>
        </WsCard>
        <WsCard title="Actividad reciente" icon="🕒">
          <WsList
            empty="Sin actividad reciente"
            items={recent.slice(0, 5).map((r) => ({ id: r.id, label: r.label, to: r.to }))}
          />
        </WsCard>
      </div>
    </>
  );
}

function PurchasingWorkspace({ data }: { data: WorkspaceData }) {
  const queue = (data.center?.queue ?? []).slice(0, 5);
  const recentTickets = queue.map((t, i) => ({
    id: String((t as { id?: string }).id ?? i),
    label: ticketLabel(t as { ticketKey?: string; id?: string }),
    meta: 'En cola',
    to: '/compras/cola',
  }));

  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Recepciones / cola" value={data.center?.queueLength ?? queue.length} to="/compras/cola" tone="coffee" />
        <WsKpi label="Pesajes" value={data.weighing.length} to="/compras/pesaje" />
        <WsKpi label="Calidad" value={data.quality.length} to="/compras/calidad" tone="warn" />
        <WsKpi label="Liquidaciones" value={data.settlements.length} to="/compras/liquidaciones" tone="teal" />
        <WsKpi label="Compras hoy" value={data.center?.ticketsToday ?? '—'} to="/compras" />
      </div>
      <div className="ews-grid">
        <WsCard title="Pendientes de hoy" icon="⏳" action={{ label: 'Compras', to: '/compras' }}>
          <WsList
            empty="Sin pendientes operativos"
            items={[
              { id: 'q', label: 'Cola de espera', meta: `${data.center?.queueLength ?? 0}`, to: '/compras/cola' },
              { id: 'w', label: 'Pesajes pendientes', meta: `${data.weighing.length}`, to: '/compras/pesaje' },
              { id: 'c', label: 'Calidad pendiente', meta: `${data.quality.length}`, to: '/compras/calidad' },
              { id: 's', label: 'Liquidaciones', meta: `${data.settlements.length}`, to: '/compras/liquidaciones' },
            ]}
          />
        </WsCard>
        <WsCard title="Productores en espera" icon="👤" action={{ label: 'Cola', to: '/compras/cola' }}>
          <WsList items={recentTickets} empty="Nadie en cola ahora" />
        </WsCard>
        <WsCard title="Últimas en cola" icon="🛒">
          <WsList items={recentTickets} empty="Sin compras recientes en cola" />
        </WsCard>
        <WsCard title="Alertas" icon="🔔">
          <WsList items={alertItems(data.alerts)} empty="Sin alertas" />
        </WsCard>
      </div>
    </>
  );
}

function QualityWorkspace({ data }: { data: WorkspaceData }) {
  const approved = data.center?.qualityToday ?? 0;
  const pending = data.quality.length;
  const rejected = data.alerts.filter((a) =>
    String(a.title ?? a.message ?? a.type ?? '').toLowerCase().includes('rechaz'),
  ).length;

  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Muestras pendientes" value={pending} to="/compras/calidad" tone="warn" />
        <WsKpi label="Evaluadas hoy" value={approved} to="/compras/calidad" tone="ok" />
        <WsKpi label="Alertas calidad" value={data.alerts.length} tone={data.alerts.length ? 'warn' : 'ok'} />
        <WsKpi label="Rechazos (señales)" value={rejected} />
      </div>
      <div className="ews-grid">
        <WsCard title="Muestras pendientes" icon="✓" action={{ label: 'Abrir calidad', to: '/compras/calidad' }}>
          <WsList
            empty="Sin muestras pendientes"
            items={data.quality.slice(0, 6).map((t, i) => ({
              id: String(t.id ?? i),
              label: ticketLabel(t),
              to: '/compras/calidad',
            }))}
          />
        </WsCard>
        <WsCard title="Resultados del día" icon="📊">
          <p className="ews-lead">
            {approved} evaluaciones completadas hoy · {pending} en cola.
          </p>
        </WsCard>
        <WsCard title="Calidad promedio" icon="◈">
          <p className="ews-lead">
            Ciclo calidad:{' '}
            {String((data.center?.operations as Record<string, unknown> | undefined)?.avgQualityMinutes ?? '—')} min
          </p>
        </WsCard>
        <WsCard title="Alertas" icon="🔔">
          <WsList items={alertItems(data.alerts)} empty="Sin alertas de calidad" />
        </WsCard>
      </div>
    </>
  );
}

function InventoryWorkspace({ data }: { data: WorkspaceData }) {
  const entries = data.movements.filter((m) =>
    String(m.movementType ?? m.type ?? '').toLowerCase().includes('in') ||
    String(m.movementType ?? m.type ?? '').toLowerCase().includes('entr'),
  ).length;
  const exits = data.movements.length - entries;

  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Movimientos" value={data.movements.length} to="/inventario/movimientos" />
        <WsKpi label="Entradas (muestra)" value={entries} tone="ok" />
        <WsKpi label="Salidas (muestra)" value={Math.max(0, exits)} />
        <WsKpi label="Existencias bajas" value={data.lowStock.length} to="/inventario" tone={data.lowStock.length ? 'warn' : 'ok'} />
        <WsKpi label="Reservas" value={data.reservations.length} to="/inventario/reservas" />
      </div>
      <div className="ews-grid">
        <WsCard title="Movimientos recientes" icon="🔄" action={{ label: 'Ver todos', to: '/inventario/movimientos' }}>
          <WsList
            empty="Sin movimientos recientes"
            items={data.movements.slice(0, 5).map((m, i) => ({
              id: String(m.id ?? m.movementKey ?? i),
              label: humanizeCopy(String(m.movementType ?? m.type ?? 'Movimiento')),
              meta: String(m.itemKey ?? m.itemName ?? ''),
              to: '/inventario/movimientos',
            }))}
          />
        </WsCard>
        <WsCard title="Existencias bajas" icon="📦" action={{ label: 'Inventario', to: '/inventario' }}>
          <WsList
            empty="Sin alertas de stock bajo"
            items={data.lowStock.slice(0, 5).map((s, i) => ({
              id: String(s.id ?? s.itemKey ?? i),
              label: String(s.itemName ?? s.itemKey ?? 'Artículo'),
              meta: `Qty ${String(s.quantity ?? s.onHand ?? '—')}`,
              to: '/inventario',
            }))}
          />
        </WsCard>
        <WsCard title="Reservas" icon="🔖" action={{ label: 'Reservas', to: '/inventario/reservas' }}>
          <WsList
            empty="Sin reservas activas"
            items={data.reservations.slice(0, 5).map((r, i) => ({
              id: String(r.id ?? r.reservationKey ?? i),
              label: String(r.itemKey ?? r.reservationKey ?? 'Reserva'),
              to: '/inventario/reservas',
            }))}
          />
        </WsCard>
        <WsCard title="Alertas de bodega" icon="🔔">
          <WsList items={alertItems(data.invAlerts.length ? data.invAlerts : data.alerts)} empty="Sin alertas" />
        </WsCard>
      </div>
    </>
  );
}

function ExecutiveWorkspace({ data }: { data: WorkspaceData }) {
  const conversion =
    data.center && data.center.ticketsToday > 0
      ? Math.round(((data.center.settlementsToday ?? 0) / data.center.ticketsToday) * 100)
      : null;

  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Compras (tickets)" value={data.center?.ticketsToday ?? '—'} tone="coffee" />
        <WsKpi label="Kg" value={data.center ? data.center.kgToday.toFixed(0) : '—'} />
        <WsKpi label="Liquidaciones" value={data.center?.settlementsToday ?? '—'} tone="teal" />
        <WsKpi label="Conversión" value={conversion != null ? `${conversion}%` : '—'} />
        <WsKpi label="Cola" value={data.center?.queueLength ?? '—'} tone="warn" />
      </div>
      <div className="ews-grid">
        <WsCard title="Indicadores del día" icon="📈" action={{ label: 'Analítica', to: '/gerencia' }}>
          <p className="ews-lead">
            Monto:{' '}
            {data.center ? `$${data.center.amountToday.toLocaleString('es-CO')}` : '—'} · Calidad hoy:{' '}
            {data.center?.qualityToday ?? '—'}
          </p>
        </WsCard>
        <WsCard title="Comparativos" icon="📊" action={{ label: 'Indicadores', to: '/compras/ops/ejecutivo' }}>
          <p className="ews-lead">
            Pesajes {data.center?.weighedToday ?? '—'} · Calidad {data.center?.qualityToday ?? '—'} · Liquidaciones{' '}
            {data.center?.settlementsToday ?? '—'}
          </p>
        </WsCard>
        <WsCard title="Rentabilidad / producción" icon="◈">
          <p className="ews-lead">
            Ciclo total:{' '}
            {String((data.center?.operations as Record<string, unknown> | undefined)?.avgTotalProcessMinutes ?? '—')} min
            promedio.
          </p>
        </WsCard>
        <WsCard title="Alertas gerenciales" icon="🔔" action={{ label: 'Ver', to: '/notificaciones' }}>
          <WsList items={alertItems(data.alerts)} empty="Sin alertas críticas" />
        </WsCard>
      </div>
    </>
  );
}

function ConsultaWorkspace({ data }: { data: WorkspaceData }) {
  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Tickets hoy" value={data.center?.ticketsToday ?? '—'} />
        <WsKpi label="Kg" value={data.center ? data.center.kgToday.toFixed(0) : '—'} />
        <WsKpi label="Liquidaciones" value={data.center?.settlementsToday ?? '—'} />
        <WsKpi label="En cola" value={data.center?.queueLength ?? '—'} />
      </div>
      <div className="ews-grid">
        <WsCard title="Indicadores" icon="📈">
          <p className="ews-lead">Vista de solo lectura. No hay acciones operativas disponibles en este perfil.</p>
        </WsCard>
        <WsCard title="Resumen" icon="◈">
          <p className="ews-lead">
            Calidad hoy {data.center?.qualityToday ?? '—'} · Pesajes {data.center?.weighedToday ?? '—'}
          </p>
        </WsCard>
      </div>
    </>
  );
}

function SupervisorWorkspace({ data }: { data: WorkspaceData }) {
  const overdue = data.inbox.filter((a) => a.dueAt && new Date(a.dueAt).getTime() < Date.now()).length;
  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Cola" value={data.center?.queueLength ?? 0} to="/compras/cola" tone="coffee" />
        <WsKpi label="Calidad" value={data.quality.length} to="/compras/calidad" />
        <WsKpi label="Liquidaciones" value={data.settlements.length} to="/compras/liquidaciones" />
        <WsKpi label="Por aprobar" value={data.inbox.length} to="/procesos/bandeja" tone="warn" />
        <WsKpi label="Atrasados" value={overdue} tone={overdue ? 'warn' : 'ok'} />
      </div>
      <div className="ews-grid">
        <WsCard title="Flujo operativo" icon="🚜" action={{ label: 'Mi día compras', to: '/compras' }}>
          <WsList
            empty="Flujo al día"
            items={[
              { id: '1', label: 'Recepción / cola', meta: `${data.center?.queueLength ?? 0}`, to: '/compras/cola' },
              { id: '2', label: 'Pesaje', meta: `${data.weighing.length}`, to: '/compras/pesaje' },
              { id: '3', label: 'Calidad', meta: `${data.quality.length}`, to: '/compras/calidad' },
              { id: '4', label: 'Liquidación', meta: `${data.settlements.length}`, to: '/compras/liquidaciones' },
            ]}
          />
        </WsCard>
        <WsCard title="Pendientes de aprobación" icon="📥" action={{ label: 'Bandeja', to: '/procesos/bandeja' }}>
          <WsList
            empty="Nada por aprobar"
            items={data.inbox.slice(0, 5).map((a) => ({
              id: a.id,
              label: humanizeCopy(a.instance?.workflowDefinition?.name ?? a.stateKey),
              meta: a.dueAt ? new Date(a.dueAt).toLocaleString('es-CO') : undefined,
              to: '/procesos/bandeja',
            }))}
          />
        </WsCard>
        <WsCard title="Alertas" icon="🔔">
          <WsList items={alertItems(data.alerts)} empty="Sin alertas" />
        </WsCard>
      </div>
    </>
  );
}

function FieldWorkspace({ data, recent }: { data: WorkspaceData; recent: Array<{ id: string; label: string; to: string }> }) {
  return (
    <>
      <div className="ews-kpi-row">
        <WsKpi label="Cola / visitas" value={data.center?.queueLength ?? 0} to="/compras/cola" />
        <WsKpi label="Alertas" value={data.alerts.length} tone={data.alerts.length ? 'warn' : 'ok'} />
      </div>
      <div className="ews-grid">
        <WsCard title="Productores" icon="👤" action={{ label: 'Abrir', to: '/productores' }}>
          <p className="ews-lead">Consulte y actualice productores asociados.</p>
        </WsCard>
        <WsCard title="Fincas" icon="🌿" action={{ label: 'Abrir', to: '/fincas' }}>
          <p className="ews-lead">Registro de fincas y predios.</p>
        </WsCard>
        <WsCard title="Pendientes" icon="⏳">
          <WsList
            empty="Sin pendientes de campo"
            items={[
              { id: 'p', label: 'Productores', to: '/productores' },
              { id: 'f', label: 'Fincas', to: '/fincas' },
              { id: 'l', label: 'Lotes', to: '/lotes' },
            ]}
          />
        </WsCard>
        <WsCard title="Recientes" icon="🕒">
          <WsList
            empty="Sin visitas recientes"
            items={recent.slice(0, 5).map((r) => ({ id: r.id, label: r.label, to: r.to }))}
          />
        </WsCard>
        <WsCard title="Alertas" icon="🔔">
          <WsList items={alertItems(data.alerts)} empty="Sin alertas" />
        </WsCard>
      </div>
    </>
  );
}

function bodyForRole(role: WorkspaceRole, data: WorkspaceData, recent: Array<{ id: string; label: string; to: string }>) {
  switch (role) {
    case 'admin':
      return <AdminWorkspace data={data} recent={recent} />;
    case 'purchasing':
      return <PurchasingWorkspace data={data} />;
    case 'quality':
      return <QualityWorkspace data={data} />;
    case 'inventory':
      return <InventoryWorkspace data={data} />;
    case 'executive':
      return <ExecutiveWorkspace data={data} />;
    case 'consulta':
      return <ConsultaWorkspace data={data} />;
    case 'supervisor':
      return <SupervisorWorkspace data={data} />;
    case 'field':
      return <FieldWorkspace data={data} recent={recent} />;
    default:
      return <PurchasingWorkspace data={data} />;
  }
}

export function EnterpriseWorkspace({ forceRole }: { forceRole?: WorkspaceRole }) {
  const { user } = useAuth();
  const { navHistory } = useNavigation();
  const data = useWorkspaceData();
  const role = forceRole ?? resolveWorkspaceRole(user?.roles ?? []);
  const label = WORKSPACE_ROLE_LABELS[role];
  const firstName = user?.firstName ?? 'equipo';
  const recent = navHistory.slice(0, 8).map((h) => ({ id: h.id, label: h.label, to: h.to }));

  if (!data.loaded) {
    return <LoadingState variant="page" message="Preparando su espacio de trabajo…" />;
  }

  const allowPrimaryAction = role !== 'consulta' && role !== 'executive' && role !== 'admin';

  return (
    <>
      <Header
        title={role === 'executive' ? 'Resumen ejecutivo' : 'Mi espacio de trabajo'}
        subtitle={`${label} · Hola, ${firstName}`}
        description={
          role === 'consulta'
            ? 'Solo indicadores. Sin acciones operativas.'
            : role === 'executive'
              ? 'Indicadores y alertas. Sin operaciones de compra.'
              : role === 'admin'
                ? 'Estado, implementación y gobierno. Sin operaciones de compra.'
                : 'Lo que necesita para trabajar hoy.'
        }
        showExperience={false}
        actions={
          allowPrimaryAction && role === 'purchasing' ? (
            <WsPrimaryAction to="/compras/recepcion" label="Nueva recepción" />
          ) : undefined
        }
      />
      <PageLayout>
        {data.error ? <section className="panel error-panel">{data.error}</section> : null}
        {bodyForRole(role, data, recent)}
      </PageLayout>
    </>
  );
}
