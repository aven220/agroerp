import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationMessage[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getEneacInbox({
        status: status || undefined,
        search: search || undefined,
        severity: severity || undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [status, search, severity]);

  useEffect(() => { load(); }, [load]);

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
    if (!confirm('¿Eliminar notificación?')) return;
    await deleteNotification(row.id);
    load();
  }

  async function handleAttend(row: NotificationMessage) {
    await attendNotification(row.id);
    load();
  }

  const grouped = items.reduce<Record<string, NotificationMessage[]>>((acc, item) => {
    const key = item.groupKey ?? 'sin_grupo';
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <>
      <Header
        title="Centro de notificaciones"
        subtitle="ENEAC — Bandeja unificada"
        actions={
          <div className="row-actions">
            <Link to="/notificaciones/dashboard" className="btn">Dashboard</Link>
            <Link to="/notificaciones/eventos" className="btn">Timeline</Link>
            <Link to="/notificaciones/reglas" className="btn">Reglas</Link>
          </div>
        }
      />

      <div className="filter-bar">
        <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas</option>
          <option value="unread">No leídas</option>
          <option value="read">Leídas</option>
          <option value="archived">Archivadas</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Severidad</option>
          {Object.entries(ALERT_SEVERITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="button" className="btn" onClick={load}>Actualizar</button>
      </div>

      {loading ? (
        <LoadingState variant="table" message="Cargando bandeja..." />
      ) : (
        Object.entries(grouped).map(([group, groupItems]) => (
          <section key={group} className="panel" style={{ marginBottom: '1rem' }}>
            {group !== 'sin_grupo' && <h3 className="group-header">{group}</h3>}
            {groupItems.map((row) => (
              <article key={row.id} className={`inbox-card ${row.status === 'unread' ? 'unread' : ''}`}>
                <header>
                  <div>
                    <strong>{row.title}</strong>
                    {row.isImportant && <span className="badge badge-warning">Importante</span>}
                    <span className={`badge badge-${row.alertSeverity}`}>
                      {ALERT_SEVERITY_LABELS[row.alertSeverity] ?? row.alertSeverity}
                    </span>
                  </div>
                  <time>{new Date(row.createdAt).toLocaleString()}</time>
                </header>
                {row.body && <p>{row.body}</p>}
                {row.sourceEventType && (
                  <p className="text-muted">Evento: <code>{row.sourceEventType}</code></p>
                )}
                <div className="row-actions">
                  {row.status === 'unread' && (
                    <button type="button" className="btn btn-sm" onClick={() => handleRead(row)}>Leída</button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => handleImportant(row)}>
                    {row.isImportant ? 'Quitar importante' : 'Importante'}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => handleAttend(row)}>Atender</button>
                  <button type="button" className="btn btn-sm" onClick={() => handleArchive(row)}>Archivar</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>Eliminar</button>
                </div>
              </article>
            ))}
          </section>
        ))
      )}
    </>
  );
}
