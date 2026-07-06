import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { compareCoffeePeriods, getCoffeeAnalytics } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null);
  const [currentDays, setCurrentDays] = useState('30');
  const [previousDays, setPreviousDays] = useState('30');

  useEffect(() => {
    getCoffeeAnalytics().then(setAnalytics);
    compareCoffeePeriods(30, 30).then(setCompare);
  }, []);

  if (!analytics) return <LoadingState variant="page" message="Cargando analítica..." />;

  const trends = (analytics.trends ?? {}) as Record<string, Array<Record<string, unknown>>>;
  const frequent = (analytics.frequentProducers ?? []) as Array<Record<string, unknown>>;
  const inactive = (analytics.inactiveProducers ?? []) as Array<Record<string, unknown>>;
  const topCenters = (analytics.topCenters ?? []) as Array<Record<string, unknown>>;
  const qualityByZone = (analytics.qualityByZone ?? []) as Array<Record<string, unknown>>;
  const heatMap = (analytics.heatMap ?? []) as Array<Record<string, unknown>>;
  const delta = ((compare?.delta ?? {}) as Record<string, Record<string, number>>);

  return (
    <>
      <Header
        title="Analítica de compras"
        subtitle="Tendencias, comparativos y mapas de calor"
        actions={
          <>
            <Link to="/compras/ops" className="btn">Operations</Link>
            <Link to="/compras/ops/reportes" className="btn">Reportes</Link>
          </>
        }
      />

      <section className="panel">
        <h3>Comparador de periodos</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={currentDays} onChange={(e) => setCurrentDays(e.target.value)} />
          <input value={previousDays} onChange={(e) => setPreviousDays(e.target.value)} />
          <button
            className="btn"
            onClick={() => compareCoffeePeriods(Number(currentDays), Number(previousDays)).then(setCompare)}
          >
            Comparar
          </button>
        </div>
        <table className="data-table">
          <thead><tr><th>Métrica</th><th>Actual</th><th>Anterior</th><th>Delta %</th></tr></thead>
          <tbody>
            {Object.entries(delta).map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{Number(v.current ?? 0).toLocaleString()}</td>
                <td>{Number(v.previous ?? 0).toLocaleString()}</td>
                <td>{Number(v.deltaPct ?? 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Mapa de calor (día × hora)</h3>
        <div style={{ overflowX: 'auto' }}>
          {(heatMap ?? []).slice(-14).map((d) => {
            const buckets = (d.hourBuckets ?? {}) as Record<string, number>;
            return (
              <div key={String(d.day)} style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'center' }}>
                <small style={{ width: 90 }}>{String(d.day)}</small>
                {Array.from({ length: 24 }).map((_, h) => {
                  const count = buckets[String(h)] ?? 0;
                  return (
                    <div
                      key={h}
                      title={`${h}:00 = ${count}`}
                      style={{
                        width: 14,
                        height: 14,
                        background: count === 0 ? '#ffffff10' : `rgba(46,160,67,${Math.min(1, 0.2 + count * 0.2)})`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3>Productores frecuentes</h3>
        <ul>{frequent.map((p) => <li key={String(p.name)}>{String(p.name)} — {String(p.count)} compras</li>)}</ul>
      </section>

      <section className="panel">
        <h3>Productores inactivos</h3>
        <ul>{inactive.map((p) => <li key={String(p.id)}>{String(p.name)}</li>)}</ul>
      </section>

      <section className="panel">
        <h3>Centros con mayor volumen</h3>
        <ul>{topCenters.map((c) => <li key={String(c.centerId)}>{String(c.centerId)} — {Number(c.kg).toLocaleString()} kg</li>)}</ul>
      </section>

      <section className="panel">
        <h3>Calidad por zona / finca</h3>
        <table className="data-table">
          <thead><tr><th>Zona</th><th>Score prom.</th><th>Muestras</th></tr></thead>
          <tbody>
            {qualityByZone.map((z) => (
              <tr key={String(z.zone)}>
                <td>{String(z.zone)}</td>
                <td>{Number(z.avgScore ?? 0).toFixed(1)}</td>
                <td>{String(z.samples)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Variación de precios</h3>
        <div style={{ display: 'flex', gap: 2, alignItems: 'end', minHeight: 100, overflowX: 'auto' }}>
          {(trends.prices ?? []).slice(-30).map((p) => (
            <div key={String(p.day)} style={{ minWidth: 16 }} title={`${p.day}: ${p.avgPrice}`}>
              <div style={{ background: '#1f6feb88', height: Math.max(4, Number(p.avgPrice) / 500) }} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
