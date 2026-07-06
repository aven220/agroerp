import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listPluginAudit, listPluginUpdates } from '../api/plugins';

export function PluginsUpdatesPage() {
  const [updates, setUpdates] = useState<unknown[]>([]);
  const [audit, setAudit] = useState<unknown[]>([]);
  useEffect(() => {
    listPluginUpdates().then(setUpdates);
    listPluginAudit().then(setAudit);
  }, []);

  return (
    <>
      <Header
        title="Centro de actualizaciones"
        subtitle="Jobs, rollback y auditoría"
        actions={<Link to="/plugins" className="btn">Centro</Link>}
      />
      <section className="panel">
        <h3>Jobs de actualización</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Desde</th><th>Hacia</th><th>Estado</th><th>Programado</th></tr></thead>
          <tbody>
            {updates.map((u) => {
              const row = u as { id: string; fromVersion: string; toVersion: string; status: string; scheduledAt?: string };
              return (
                <tr key={row.id}>
                  <td>{row.fromVersion}</td>
                  <td>{row.toVersion}</td>
                  <td>{row.status}</td>
                  <td>{row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Auditoría de plugins</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Plugin</th><th>Acción</th><th>Fecha</th></tr></thead>
          <tbody>
            {audit.map((a) => {
              const row = a as { id: string; pluginKey: string; action: string; createdAt: string };
              return (
                <tr key={row.id}>
                  <td>{row.pluginKey}</td>
                  <td>{row.action}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
