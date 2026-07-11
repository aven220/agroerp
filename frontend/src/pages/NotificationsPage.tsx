import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, EmptyPanel } from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import {
  ALERT_SEVERITY_LABELS,
  archiveNotification,
  attendNotification,
  deleteNotification,
  getEneacInbox,
  markNotificationImportant,
  markNotificationRead,
  type NotificationMessage,
} from '../api/eneac';
import { humanizeCopy } from '../lib/humanizeCopy';

type NotifCategory = 'operation' | 'workflow' | 'system' | 'implementation';

const CATEGORY_META: Record<NotifCategory, { label: string; order: number }> = {
  operation: { label: 'Operación', order: 1 },
  workflow: { label: 'Procesos', order: 2 },
  implementation: { label: 'Implementación', order: 3 },
  system: { label: 'Sistema', order: 4 },
};

function categorize(row: NotificationMessage): NotifCategory {
  const hay = [
    row.groupKey ?? '',
    row.sourceEventType ?? '',
    row.channel ?? '',
    row.title ?? '',
    row.body ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (
    /implement|go.?live|bootstrap|config|onboard|setup|empresa lista/.test(hay)
  ) {
    return 'implementation';
  }
  if (/workflow|aprob|approval|bandeja|tr[aá]mite|proceso|assignment/.test(hay)) {
    return 'workflow';
  }
  if (
    /coffee|cpep|compra|pesaje|calidad|liquid|recep|invent|eims|productor|ticket|ops/.test(
      hay,
    )
  ) {
    return 'operation';
  }
  return 'system';
}

/**
 * PM-28 — Notification Center enterprise agrupado por experiencia.
 */
export function NotificationsPage() {
  const [items, setItems] = useState<NotificationMessage[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [activeCategory, setActiveCategory] = useState<NotifCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await getEneacInbox({
          status: status || undefined,
          search: search || undefined,
          severity: severity || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [status, search, severity]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRead(row: NotificationMessage) {
    await markNotificationRead(row.id);
    load();
  }

  async function handleImportant(row: NotificationMessage) {
    await markNotificationImportant(row.id, !row.isImportant);
    load();
  }

  async function handleArchive(row: NotificationMessage) {
    await archiveNotification(row.id);
    load();
  }

  async function handleDelete(row: NotificationMessage) {
    if (!confirm('¿Eliminar esta notificación?')) return;
    await deleteNotification(row.id);
    load();
  }

  async function handleAttend(row: NotificationMessage) {
    await attendNotification(row.id);
    load();
  }

  const grouped = useMemo(() => {
    const map = new Map<NotifCategory, NotificationMessage[]>();
    for (const item of items) {
      const cat = categorize(item);
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_META[a[0]].order - CATEGORY_META[b[0]].order,
    );
  }, [items]);

  const visibleGroups = useMemo(() => {
    if (activeCategory === 'all') return grouped;
    return grouped.filter(([cat]) => cat === activeCategory);
  }, [grouped, activeCategory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const [cat, list] of grouped) c[cat] = list.length;
    return c;
  }, [grouped, items.length]);

  return (
    <>
      <Header
        title="Centro de notificaciones"
        subtitle="Avisos agrupados por experiencia"
        description="Operación, procesos, sistema e implementación — no una lista plana."
        showExperience={false}
        actions={
          <div className="row-actions">
            <Link to="/notificaciones/dashboard" className="btn">
              Indicadores
            </Link>
            <Link to="/notificaciones/reglas" className="btn btn-ghost">
              Reglas
            </Link>
          </div>
        }
      />

      <PageLayout
        toolbar={
          <div className="filter-bar notif-filter-bar">
            <input
              placeholder="Buscar avisos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar notificaciones"
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
              <option value="">Todas</option>
              <option value="unread">No leídas</option>
              <option value="read">Leídas</option>
              <option value="archived">Archivadas</option>
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severidad">
              <option value="">Severidad</option>
              {Object.entries(ALERT_SEVERITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" className="btn" onClick={load}>
              Actualizar
            </button>
          </div>
        }
      >
        <div className="notif-category-tabs" role="tablist" aria-label="Categorías">
          {(
            [
              ['all', 'Todas'],
              ['operation', 'Operación'],
              ['workflow', 'Procesos'],
              ['implementation', 'Implementación'],
              ['system', 'Sistema'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeCategory === id}
              className={`notif-category-tab${activeCategory === id ? ' active' : ''}`}
              onClick={() => setActiveCategory(id)}
            >
              {label}
              <span className="notif-category-count">{counts[id] ?? 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState variant="table" message="Cargando bandeja…" />
        ) : items.length === 0 ? (
          <EmptyPanel
            title="Sin notificaciones"
            description="No hay avisos en la bandeja con los filtros actuales. Cuando ocurra un evento operativo o de proceso, aparecerá aquí."
            hint="Pruebe quitar filtros o revisar las reglas de aviso."
            action={{ label: 'Ver reglas', to: '/notificaciones/reglas' }}
          />
        ) : (
          visibleGroups.map(([category, groupItems]) => (
            <PageSection key={category} title={CATEGORY_META[category].label}>
              {groupItems.map((row) => (
                <article
                  key={row.id}
                  className={`inbox-card notif-card ${row.status === 'unread' ? 'unread' : ''}`}
                >
                  <header>
                    <div>
                      <strong>{humanizeCopy(row.title)}</strong>
                      {row.isImportant ? <span className="badge badge-warning">Importante</span> : null}
                      <span className={`badge badge-${row.alertSeverity}`}>
                        {ALERT_SEVERITY_LABELS[row.alertSeverity] ?? row.alertSeverity}
                      </span>
                    </div>
                    <time>{new Date(row.createdAt).toLocaleString()}</time>
                  </header>
                  {row.body ? <p>{humanizeCopy(row.body)}</p> : null}
                  {row.sourceEventType ? (
                    <p className="muted">Origen: {humanizeCopy(row.sourceEventType)}</p>
                  ) : null}
                  <div className="row-actions">
                    {row.status === 'unread' ? (
                      <button type="button" className="btn btn-sm" onClick={() => handleRead(row)}>
                        Marcar leída
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-sm" onClick={() => handleImportant(row)}>
                      {row.isImportant ? 'Quitar importante' : 'Importante'}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => handleAttend(row)}>
                      Atender
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => handleArchive(row)}>
                      Archivar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(row)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </PageSection>
          ))
        )}
      </PageLayout>
    </>
  );
}
