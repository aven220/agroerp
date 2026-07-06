import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  closeEimsPeriod,
  listEimsPeriods,
  recalculateEimsPeriod,
  reopenEimsPeriod,
} from '../api/eims';

export function EimsPeriodsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [periodType, setPeriodType] = useState('daily');
  const [reason, setReason] = useState('Ajuste autorizado de cierre');
  const [error, setError] = useState('');

  const reload = () => listEimsPeriods().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Cierres de inventario"
        subtitle="Cierre diario, mensual, anual, reapertura y recálculo"
        actions={
          <>
            <Link to="/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/inventario" className="btn">EIMS</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="daily">Diario</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1 }} />
          <button
            className="btn"
            onClick={() => closeEimsPeriod(periodType).then(reload).catch((e) => setError(e.message))}
          >
            Cerrar período
          </button>
        </div>
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Período</th><th>Tipo</th><th>Estado</th><th>Valor</th><th>Entradas</th><th>Salidas</th>
              <th>Cerrado por</th><th>Fecha</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.periodKey)}</td>
                <td>{String(r.periodType)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.inventoryValue ?? 0).toLocaleString()}</td>
                <td>{String(r.totalEntries ?? 0)}</td>
                <td>{String(r.totalExits ?? 0)}</td>
                <td>{String(r.closedBy ?? '—')}</td>
                <td>{r.closedAt ? new Date(String(r.closedAt)).toLocaleString() : '—'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {r.status === 'closed' ? (
                    <button
                      className="btn"
                      onClick={() =>
                        reopenEimsPeriod(String(r.periodKey), reason).then(reload).catch((e) => setError(e.message))
                      }
                    >
                      Reabrir
                    </button>
                  ) : null}
                  <button
                    className="btn"
                    onClick={() =>
                      recalculateEimsPeriod(String(r.periodKey), reason).then(reload).catch((e) => setError(e.message))
                    }
                  >
                    Recalcular
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
