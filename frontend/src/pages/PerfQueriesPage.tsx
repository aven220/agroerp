import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { VirtualList } from '../components/performance/VirtualList';
import {
  analyzeEpopIndexes,
  applyEpopIndex,
  listEpopIndexes,
  listEpopSlowQueries,
  type EpopPaginated,
} from '../api/performance';

export function PerfQueriesPage() {
  const [queries, setQueries] = useState<EpopPaginated<Record<string, unknown>> | null>(null);
  const [indexes, setIndexes] = useState<Array<Record<string, unknown>>>([]);
  const [page, setPage] = useState(1);

  const reload = () => {
    listEpopSlowQueries(page, 50).then(setQueries);
    listEpopIndexes().then((rows) => setIndexes(rows as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, [page]);

  return (
    <>
      <Header
        title="Consultas e índices"
        subtitle="Slow queries, paginación inteligente y recomendaciones"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => analyzeEpopIndexes().then(reload)}>Analizar</button>
            <Link to="/rendimiento" className="btn">Centro</Link>
          </div>
        }
      />
      <section className="panel">
        <h3>Slow queries (página {queries?.page ?? page} / {queries?.totalPages ?? 1})</h3>
        <VirtualList
          items={queries?.items ?? []}
          itemHeight={48}
          height={320}
          renderItem={(q) => (
            <div className="virtual-row">
              <strong>{String(q.durationMs)}ms</strong> — {String(q.moduleKey ?? 'n/a')} — {String(q.sqlText).slice(0, 120)}
            </div>
          )}
        />
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-sm" disabled={!queries?.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <button type="button" className="btn btn-sm" disabled={!queries?.hasNext} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      </section>
      <section className="panel">
        <h3>Recomendaciones de índices</h3>
        <table className="data-table">
          <thead><tr><th>Tabla</th><th>Columnas</th><th>Estado</th><th>Ganancia est.</th><th></th></tr></thead>
          <tbody>
            {indexes.map((idx) => (
              <tr key={String(idx.recommendationKey)}>
                <td>{String(idx.tableName)}</td>
                <td>{Array.isArray(idx.columns) ? idx.columns.join(', ') : ''}</td>
                <td>{String(idx.status)}</td>
                <td>{idx.estimatedGainMs != null ? `${Number(idx.estimatedGainMs).toFixed(0)}ms` : '—'}</td>
                <td>
                  {idx.status === 'suggested' && (
                    <button type="button" className="btn btn-sm" onClick={() => applyEpopIndex(String(idx.recommendationKey)).then(reload)}>
                      Aplicar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
