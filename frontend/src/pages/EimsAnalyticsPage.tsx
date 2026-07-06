import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEimsOpsAnalytics, getEimsOpsAi, getEimsOpsKpis } from '../api/eims';

export function EimsAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [days, setDays] = useState('30');
  const [error, setError] = useState('');

  const reload = async () => {
    const [a, k, i] = await Promise.all([
      getEimsOpsAnalytics({ days: Number(days) || 30 }),
      getEimsOpsKpis(),
      getEimsOpsAi(),
    ]);
    setAnalytics(a);
    setKpis(k);
    setAi(i);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const trends = (analytics?.historicalTrends as Array<Record<string, unknown>>) ?? [];
  const high = (analytics?.highRotation as Array<Record<string, unknown>>) ?? [];
  const low = (analytics?.lowRotation as Array<Record<string, unknown>>) ?? [];
  const immobilized = (analytics?.immobilized as Array<Record<string, unknown>>) ?? [];
  const recommendations = ((ai?.recommendations as Array<Record<string, unknown>>) ?? []);

  return (
    <>
      <Header
        title="Analítica de inventario"
        subtitle="Tendencias, rotación, costos y recomendaciones IA"
        actions={
          <>
            <input value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 80 }} />
            <button className="btn" onClick={() => reload().catch((e) => setError(e.message))}>Filtrar</button>
            <Link to="/inventario/ops" className="btn">Ops Center</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Rotación</span><span className="kpi-value">{String(kpis?.turnover ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cobertura</span><span className="kpi-value">{String(kpis?.coverageDays ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Servicio</span><span className="kpi-value">{String(kpis?.serviceLevel ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Exactitud</span><span className="kpi-value">{String(kpis?.inventoryAccuracy ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Pérdidas</span><span className="kpi-value">{String(kpis?.losses ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Mermas</span><span className="kpi-value">{String(kpis?.shrinkage ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ajustes</span><span className="kpi-value">{String(kpis?.adjustments ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Sin movimiento</span><span className="kpi-value">{String(kpis?.itemsWithoutMovement ?? 0)}</span></div>
      </div>
      <section className="panel">
        <h3>Tendencia de consumo</h3>
        <ul>
          {trends.slice(-14).map((t) => (
            <li key={String(t.date)}>{String(t.date)}: {String(t.value)} ({String(t.changePct)}%)</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Alta rotación</h3>
        <ul>{high.map((r) => <li key={String(r.itemKey)}>{String(r.itemKey)} · qty={String(r.qty)}</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Baja rotación / inmovilizado</h3>
        <ul>
          {low.map((r) => <li key={`l-${String(r.itemKey)}`}>{String(r.itemKey)} · baja</li>)}
          {immobilized.map((r) => <li key={`i-${String(r.itemKey)}`}>{String(r.itemKey)} · inmovilizado</li>)}
        </ul>
      </section>
      <section className="panel">
        <h3>Recomendaciones IA</h3>
        <ul>
          {recommendations.map((r, idx) => (
            <li key={idx}>{String(r.action)} · {String(r.itemKey)} @ {String(r.warehouseKey)} — {String(r.reason)}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
