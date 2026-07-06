import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  acceptEimsSupplySuggestion,
  generateEimsSupplySuggestions,
  listEimsSupplySuggestions,
  rejectEimsSupplySuggestion,
} from '../api/eims';

export function EimsSuggestionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    setRows((await listEimsSupplySuggestions()) as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Sugerencias de compra y traslado"
        subtitle="Reabastecimiento automático por reglas y demanda"
        actions={
          <>
            <button className="btn" onClick={() => generateEimsSupplySuggestions().then(reload).catch((e) => setError(e.message))}>
              Regenerar
            </button>
            <Link to="/inventario/abastecimiento" className="btn">Centro</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Artículo</th><th>Bodega</th><th>Desde</th><th>Cantidad</th><th>Costo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.suggestionType)}</td>
                <td>{String(r.itemKey)}</td>
                <td>{String(r.warehouseKey)}</td>
                <td>{String(r.fromWarehouseKey ?? '—')}</td>
                <td>{String(r.suggestedQty)}</td>
                <td>{Number(r.totalCost ?? 0).toLocaleString()}</td>
                <td>{String(r.status)}</td>
                <td>
                  {r.status === 'proposed' ? (
                    <>
                      <button className="btn" onClick={() => acceptEimsSupplySuggestion(String(r.suggestionKey)).then(reload).catch((e) => setError(e.message))}>Aceptar</button>
                      <button className="btn" onClick={() => rejectEimsSupplySuggestion(String(r.suggestionKey), 'Rechazada por usuario').then(reload).catch((e) => setError(e.message))}>Rechazar</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
