import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEimsSupplyProjection } from '../api/eims';

export function EimsProjectionPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [horizon, setHorizon] = useState('90');
  const [error, setError] = useState('');

  const reload = async () => {
    setData(await getEimsSupplyProjection(Number(horizon) || 90));
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, [horizon]);

  const lines = (data?.lines as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header
        title="Proyección de inventario"
        subtitle="Agotamiento, rotación y valor proyectado"
        actions={
          <>
            <input value={horizon} onChange={(e) => setHorizon(e.target.value)} style={{ width: 60 }} />
            <span>días</span>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {data ? (
        <div className="kpi-grid">
          <div className="kpi-card"><span className="kpi-label">Valor total</span><span className="kpi-value">{Number(data.totalValue ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Horizonte</span><span className="kpi-value">{String(data.horizonDays)} d</span></div>
        </div>
      ) : null}
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Artículo</th><th>Bodega</th><th>Disponible</th><th>Demanda/día</th><th>Agotamiento (d)</th><th>Rotación</th><th>Proy. fin</th><th>Valor</th></tr></thead>
          <tbody>
            {lines.map((r, idx) => (
              <tr key={`${String(r.itemKey)}-${idx}`}>
                <td>{String(r.itemName ?? r.itemKey)}</td>
                <td>{String(r.warehouseKey)}</td>
                <td>{String(r.availableQty)}</td>
                <td>{String(r.dailyDemand)}</td>
                <td>{String(r.stockoutInDays)}</td>
                <td>{String(r.rotationRate)}</td>
                <td>{String(r.projectedQtyEnd)}</td>
                <td>{Number(r.value ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
