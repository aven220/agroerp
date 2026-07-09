import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAuditLogs } from '../../api/audit';
import { listBiKpis, getBiRealtime } from '../../api/bi';
import type { BiKpi } from '../../api/bi';
import { getEneacInbox } from '../../api/eneac';
import type { NotificationMessage } from '../../api/eneac';
import { getBpmsInbox } from '../../api/bpms';
import { getWorkflowInbox } from '../../api/workflows';
import { listEsdjeCalendar } from '../../api/scheduler';
import type { EsdjeJob } from '../../api/scheduler';
import { aiChat } from '../../api/ai';
import { useDashboardStats } from '../../hooks/useResources';
import { useAutoRefresh, useInView } from '../../hooks/useInView';
import { useNavigation } from '../../context/NavigationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getQuickActionsForRole } from '../../config/widgetRegistry';
import type { WidgetDefinition, WidgetKind } from '../../config/widgetRegistry';
import type { AuditLog } from '../../types';
import { WidgetLoading } from './WidgetShell';

interface Props {
  kind: WidgetKind;
  widgetId: string;
  definition: WidgetDefinition;
}

function KpiOverview({ kpiKey }: { kpiKey?: string }) {
  const { ref, visible } = useInView();
  const { stats, loading, reload } = useDashboardStats(visible);
  useAutoRefresh(reload, 60000, visible && !!stats);

  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (loading || !stats) return <WidgetLoading />;

  if (kpiKey === 'inventory') {
    return (
      <div ref={ref} className="kpi-grid">
        <div className="kpi-card kpi-blue"><span className="kpi-label">Inventario kg</span><strong className="kpi-value">{stats.inventoryKg.toLocaleString('es-CO')}<small> kg</small></strong></div>
        <div className="kpi-card"><span className="kpi-label">Documentos</span><strong className="kpi-value">{stats.documents}</strong></div>
      </div>
    );
  }
  if (kpiKey === 'purchases') {
    return (
      <div ref={ref} className="kpi-grid">
        <div className="kpi-card kpi-coffee"><span className="kpi-label">Compras</span><strong className="kpi-value">{stats.purchases}</strong></div>
        <div className="kpi-card"><span className="kpi-label">Kg</span><strong className="kpi-value">{stats.totalKg.toLocaleString('es-CO')}</strong></div>
        <div className="kpi-card"><span className="kpi-label">Valor</span><strong className="kpi-value">${stats.totalValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong></div>
      </div>
    );
  }
  return (
    <div ref={ref} className="kpi-grid kpi-grid-lg">
      <div className="kpi-card kpi-green"><span className="kpi-label">Productores</span><strong className="kpi-value">{stats.producers}</strong></div>
      <div className="kpi-card kpi-teal"><span className="kpi-label">Fincas</span><strong className="kpi-value">{stats.farms}</strong></div>
      <div className="kpi-card kpi-coffee"><span className="kpi-label">Compras</span><strong className="kpi-value">{stats.purchases}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Kg comprados</span><strong className="kpi-value">{stats.totalKg.toLocaleString('es-CO')}</strong></div>
      <div className="kpi-card kpi-blue"><span className="kpi-label">Inventario</span><strong className="kpi-value">{stats.inventoryKg.toLocaleString('es-CO')}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Documentos</span><strong className="kpi-value">{stats.documents}</strong></div>
    </div>
  );
}

function KpiBiWidget() {
  const [kpis, setKpis] = useState<BiKpi[]>([]);
  const [realtime, setRealtime] = useState<Record<string, unknown> | null>(null);
  const { ref, visible } = useInView();

  const load = useCallback(() => {
    listBiKpis().then((k) => setKpis(k.filter((x) => x.active).slice(0, 6))).catch(() => {});
    getBiRealtime().then(setRealtime).catch(() => {});
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);
  useAutoRefresh(load, 120000, visible);

  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (!kpis.length && !realtime) return <WidgetLoading />;

  return (
    <div ref={ref}>
      {realtime ? (
        <div className="ws-bi-realtime ds-caption" style={{ marginBottom: '0.5rem' }}>
          Actualización en tiempo real · {new Date().toLocaleTimeString('es-CO')}
        </div>
      ) : null}
      <div className="kpi-grid">
        {kpis.map((k) => {
          const last = k.history?.[0];
          const pct = last?.variancePct;
          return (
            <div key={k.id} className="kpi-card">
              <span className="kpi-label">{k.name}</span>
              <strong className="kpi-value">
                {last ? last.value.toLocaleString('es-CO') : '—'}
                {k.unit ? <small> {k.unit}</small> : null}
              </strong>
              {pct != null ? (
                <span className={`ws-trend${pct >= 0 ? ' up' : ' down'}`}>
                  {pct >= 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
                </span>
              ) : null}
              {k.goalValue != null ? (
                <span className="ds-caption">Meta: {k.goalValue}{k.unit ? ` ${k.unit}` : ''}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <Link to="/bi" className="ws-widget-link">Ver BI completo →</Link>
    </div>
  );
}

function QuickActionsWidget() {
  const { dashboardRole } = useWorkspace();
  const actions = getQuickActionsForRole(dashboardRole);
  return (
    <div className="ws-quick-actions-wrap">
      <p className="ws-quick-actions-lead">Acciones principales según su perfil</p>
      <div className="ws-quick-actions">
        {actions.map((a) => (
          <Link key={a.id} to={a.to} className="ws-quick-action">
            <span aria-hidden>{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FavoritesWidget() {
  const { favorites } = useNavigation();
  const sorted = [...favorites].sort((a, b) => a.order - b.order);
  if (!sorted.length) return <p className="muted">Marque pantallas con ☆ en el menú.</p>;
  return (
    <div className="quick-links">
      {sorted.map((f) => (
        <Link key={f.id} to={f.to} className="quick-link">{f.icon} {f.label}</Link>
      ))}
    </div>
  );
}

function NotificationsWidget() {
  const [items, setItems] = useState<NotificationMessage[]>([]);
  const { ref, visible } = useInView();
  const load = useCallback(() => {
    getEneacInbox({ status: 'unread' }).then(setItems).catch(() => getEneacInbox().then((all) => setItems(all.slice(0, 6))));
  }, []);
  useEffect(() => { if (visible) load(); }, [visible, load]);
  useAutoRefresh(load, 30000, visible);

  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (!items.length) return <p className="muted" ref={ref}>Sin notificaciones pendientes</p>;

  return (
    <div ref={ref}>
      <ul className="ws-notif-list">
        {items.map((n) => (
          <li key={n.id} className={`ws-notif ws-sev-${n.alertSeverity}`}>
            <strong>{n.title}</strong>
            {n.body ? <span>{n.body}</span> : null}
            <time>{new Date(n.createdAt).toLocaleString('es-CO')}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityWidget({ team }: { team?: boolean }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const { ref, visible } = useInView();
  const load = useCallback(() => {
    listAuditLogs({ limit: team ? 12 : 8 }).then(setLogs).catch(() => {});
  }, [team]);
  useEffect(() => { if (visible) load(); }, [visible, load]);
  useAutoRefresh(load, 60000, visible);

  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (!logs.length) return <p className="muted" ref={ref}>Sin actividad registrada</p>;

  return (
    <div ref={ref}>
      <ul className="activity-list">
        {logs.map((log) => (
          <li key={log.id}>
            <span className="activity-action">{log.action}</span>
            <span className="activity-entity">{log.entityType} · {log.entityId.slice(0, 8)}…</span>
            <time>{new Date(log.createdAt).toLocaleString('es-CO')}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingWidget() {
  const [wf, setWf] = useState<unknown[]>([]);
  const [bpms, setBpms] = useState<unknown[]>([]);
  const { ref, visible } = useInView();
  const load = useCallback(() => {
    getWorkflowInbox().then(setWf).catch(() => {});
    getBpmsInbox().then(setBpms).catch(() => {});
  }, []);
  useEffect(() => { if (visible) load(); }, [visible, load]);
  useAutoRefresh(load, 45000, visible);

  const total = wf.length + bpms.length;
  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (!total) return <p className="muted" ref={ref}>Sin pendientes</p>;

  return (
    <div ref={ref} className="ws-pending">
      <div className="ws-pending-summary">
        <span className="ws-pending-count">{total}</span>
        <span>elementos pendientes</span>
      </div>
      <div className="ws-cluster">
        <Link to="/procesos/bandeja" className="btn btn-sm">Bandeja BPM ({wf.length})</Link>
        <Link to="/bpms/bandeja" className="btn btn-sm">Bandeja BPMS ({bpms.length})</Link>
      </div>
    </div>
  );
}

function CalendarWidget() {
  const [jobs, setJobs] = useState<EsdjeJob[]>([]);
  const { ref, visible } = useInView();
  const load = useCallback(() => { listEsdjeCalendar().then(setJobs).catch(() => {}); }, []);
  useEffect(() => { if (visible) load(); }, [visible, load]);
  useAutoRefresh(load, 120000, visible);

  const upcoming = jobs
    .filter((j) => j.nextRunAt || j.runAt)
    .sort((a, b) => new Date(a.nextRunAt ?? a.runAt ?? 0).getTime() - new Date(b.nextRunAt ?? b.runAt ?? 0).getTime())
    .slice(0, 6);

  if (!visible) return <div ref={ref} className="ws-lazy-placeholder" />;
  if (!upcoming.length) return <p className="muted" ref={ref}>Sin eventos programados</p>;

  return (
    <div ref={ref}>
      <ul className="ws-calendar-list">
        {upcoming.map((j) => (
          <li key={j.id}>
            <strong>{j.name}</strong>
            <span>{j.nextRunAt ? new Date(j.nextRunAt).toLocaleString('es-CO') : j.runAt ? new Date(j.runAt).toLocaleString('es-CO') : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TasksWidget() {
  return (
    <div className="ws-cluster">
      <Link to="/tareas" className="quick-link">Centro de tareas</Link>
      <Link to="/tareas/calendario" className="quick-link">Calendario</Link>
      <Link to="/tareas/colas" className="quick-link">Colas</Link>
    </div>
  );
}

function SearchWidget() {
  const { setSearchOpen } = useNavigation();
  return (
    <button type="button" className="ws-search-trigger global-search-trigger" onClick={() => setSearchOpen(true)}>
      <span aria-hidden>⌕</span>
      <span>Buscar pantallas, módulos, procesos, clientes, facturas…</span>
      <kbd>⌘K</kbd>
    </button>
  );
}

function AiWidget() {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const q = prompt.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const res = await aiChat({ prompt: q, copilotKey: 'executive' });
      setAnswer(res.content);
    } catch {
      setAnswer('No fue posible consultar al asistente en este momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ws-ai">
      <div className="ws-ai-suggestions">
        {['Resumen de KPIs del día', 'Pendientes de aprobación', 'Estado del inventario'].map((s) => (
          <button key={s} type="button" className="global-search-chip" onClick={() => { setPrompt(s); }}>{s}</button>
        ))}
      </div>
      <div className="ws-ai-input-row">
        <input
          className="ds-input"
          placeholder="Pregunte al asistente empresarial…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={ask} disabled={loading}>
          {loading ? '…' : 'Enviar'}
        </button>
      </div>
      {answer ? <div className="ws-ai-answer">{answer}</div> : null}
      <Link to="/ia/chat" className="ws-widget-link">Abrir chat completo →</Link>
    </div>
  );
}

function LinksWidget({ links }: { links?: { to: string; label: string }[] }) {
  if (!links?.length) return <p className="muted">Sin enlaces configurados</p>;
  return (
    <div className="quick-links">
      {links.map((l) => <Link key={l.to} to={l.to} className="quick-link">{l.label}</Link>)}
    </div>
  );
}

export function WidgetBody({ kind, definition }: Props) {
  switch (kind) {
    case 'kpi-overview':
      return <KpiOverview kpiKey={definition.kpiKey} />;
    case 'kpi-bi':
      return <KpiBiWidget />;
    case 'quick-actions':
      return <QuickActionsWidget />;
    case 'favorites':
      return <FavoritesWidget />;
    case 'notifications':
      return <NotificationsWidget />;
    case 'activity':
      return <ActivityWidget />;
    case 'team-activity':
      return <ActivityWidget team />;
    case 'pending':
      return <PendingWidget />;
    case 'calendar':
      return <CalendarWidget />;
    case 'tasks':
      return <TasksWidget />;
    case 'search':
      return <SearchWidget />;
    case 'ai-assistant':
      return <AiWidget />;
    case 'links':
    case 'reports':
    case 'gis':
    case 'inventory':
    case 'sales':
    case 'purchases':
    case 'production':
      return <LinksWidget links={definition.links} />;
    default:
      return <p className="muted">Widget no disponible</p>;
  }
}
