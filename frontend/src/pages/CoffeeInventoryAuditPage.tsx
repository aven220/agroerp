import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getTraceabilityAudit } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeInventoryAuditPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getTraceabilityAudit().then(setData);
  }, []);

  if (!data) return <LoadingState variant="page" message="Cargando auditoría..." />;
  const summary = (data.summary ?? {}) as Record<string, number>;
  const recentLots = (data.recentLots ?? []) as Array<Record<string, unknown>>;
  const recentMovements = (data.recentMovements ?? []) as Array<Record<string, unknown>>;
  const audits = (data.audits ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header
        title="Centro de auditoría inventario/trazabilidad"
        subtitle="Eventos, usuarios, bodegas y correcciones"
        actions={<Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>}
      />
      <section className="panel grid-4">
        <div><strong>Lotes</strong><div>{summary.lots ?? 0}</div></div>
        <div><strong>Movimientos</strong><div>{summary.movements ?? 0}</div></div>
        <div><strong>Kardex</strong><div>{summary.kardex ?? 0}</div></div>
        <div><strong>Trazas</strong><div>{summary.traces ?? 0}</div></div>
      </section>
      <section className="panel">
        <h3>Lotes recientes</h3>
        <ul>
          {recentLots.map((l) => (
            <li key={String(l.id)}>{String(l.lotKey)} — {String(l.warehouse)} — {String(l.status)}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Movimientos recientes</h3>
        <ul>
          {recentMovements.map((m) => {
            const lot = m.lot as Record<string, unknown> | undefined;
            return (
              <li key={String(m.id)}>
                {String(m.movementType)} {String(m.quantityKg)} kg · {String(lot?.lotKey ?? '')} ·{' '}
                {m.postedAt ? new Date(String(m.postedAt)).toLocaleString() : ''}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel">
        <h3>Auditoría</h3>
        <table className="data-table">
          <thead>
            <tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Usuario</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {audits.map((a, i) => (
              <tr key={i}>
                <td>{String(a.entityType)}</td>
                <td>{String(a.entityKey)}</td>
                <td>{String(a.action)}</td>
                <td>{String(a.userId ?? '—')}</td>
                <td>{a.createdAt ? new Date(String(a.createdAt)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
