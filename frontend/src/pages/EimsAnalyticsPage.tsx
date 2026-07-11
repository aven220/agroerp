import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
} from '../components/page';
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
    <PageLayout>
      <PageHeader
        title="Analítica de inventario"
        subtitle="Tendencias, rotación, costos y recomendaciones IA"
        actions={
          <PageActions>
            <input
              className="input-compact"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              aria-label="Días"
            />
            <button className="btn" onClick={() => reload().catch((e) => setError(e.message))}>
              Filtrar
            </button>
            <Link to="/inventario/ops" className="btn">Centro de operaciones</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="Rotación" value={String(kpis?.turnover ?? 0)} />
        <MetricCard label="Cobertura" value={String(kpis?.coverageDays ?? 0)} />
        <MetricCard label="Servicio" value={`${String(kpis?.serviceLevel ?? 0)}%`} />
        <MetricCard label="Exactitud" value={`${String(kpis?.inventoryAccuracy ?? 0)}%`} />
        <MetricCard label="Pérdidas" value={String(kpis?.losses ?? 0)} />
        <MetricCard label="Mermas" value={String(kpis?.shrinkage ?? 0)} />
        <MetricCard label="Ajustes" value={String(kpis?.adjustments ?? 0)} />
        <MetricCard label="Sin movimiento" value={String(kpis?.itemsWithoutMovement ?? 0)} />
      </PageSummary>

      <PageSection title="Tendencia de consumo">
        <ul>
          {trends.slice(-14).map((t) => (
            <li key={String(t.date)}>{String(t.date)}: {String(t.value)} ({String(t.changePct)}%)</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Alta rotación">
        <ul>{high.map((r) => <li key={String(r.itemKey)}>{String(r.itemKey)} · qty={String(r.qty)}</li>)}</ul>
      </PageSection>

      <PageSection title="Baja rotación / inmovilizado">
        <ul>
          {low.map((r) => <li key={`l-${String(r.itemKey)}`}>{String(r.itemKey)} · baja</li>)}
          {immobilized.map((r) => <li key={`i-${String(r.itemKey)}`}>{String(r.itemKey)} · inmovilizado</li>)}
        </ul>
      </PageSection>

      <PageSection title="Recomendaciones IA">
        <ul>
          {recommendations.map((r, idx) => (
            <li key={idx}>{String(r.action)} · {String(r.itemKey)} @ {String(r.warehouseKey)} — {String(r.reason)}</li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
