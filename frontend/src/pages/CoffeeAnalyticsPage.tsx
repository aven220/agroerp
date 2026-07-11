import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
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

  if (!analytics) return <LoadingState variant="page" message="Cargando analítica…" />;

  const trends = (analytics.trends ?? {}) as Record<string, Array<Record<string, unknown>>>;
  const frequent = (analytics.frequentProducers ?? []) as Array<Record<string, unknown>>;
  const inactive = (analytics.inactiveProducers ?? []) as Array<Record<string, unknown>>;
  const topCenters = (analytics.topCenters ?? []) as Array<Record<string, unknown>>;
  const qualityByZone = (analytics.qualityByZone ?? []) as Array<Record<string, unknown>>;
  const heatMap = (analytics.heatMap ?? []) as Array<Record<string, unknown>>;
  const delta = ((compare?.delta ?? {}) as Record<string, Record<string, number>>);

  const deltaData = Object.entries(delta).map(([k, v]) =>
    withRowId({ ...v, metric: k } as Record<string, unknown>, 'metric'),
  );
  const zoneData = qualityByZone.map((z) => withRowId(z, 'id', 'zone'));

  return (
    <PageLayout>
      <PageHeader
        title="Analítica de compras"
        subtitle="Tendencias, comparativos y mapas de calor"
        actions={
          <PageActions>
            <Link to="/compras/ops" className="btn">Operations</Link>
            <Link to="/compras/ops/reportes" className="btn">Reportes</Link>
          </PageActions>
        }
      />

      <PageSection title="Comparador de periodos">
        <PageToolbar>
          <FieldGroup label="Días actuales">
            <input value={currentDays} onChange={(e) => setCurrentDays(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Días anteriores">
            <input value={previousDays} onChange={(e) => setPreviousDays(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button
            type="button"
            className="btn"
            onClick={() => compareCoffeePeriods(Number(currentDays), Number(previousDays)).then(setCompare)}
          >
            Comparar
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-analytics-delta"
          selectable={false}
          data={deltaData}
          columns={[
            { key: 'metric', label: 'Métrica', getValue: (r) => String(r.metric) },
            { key: 'current', label: 'Actual', getValue: (r) => Number(r.current ?? 0).toLocaleString() },
            { key: 'previous', label: 'Anterior', getValue: (r) => Number(r.previous ?? 0).toLocaleString() },
            { key: 'deltaPct', label: 'Delta %', getValue: (r) => `${Number(r.deltaPct ?? 0).toFixed(1)}%` },
          ]}
        />
      </PageSection>

      <PageSection title="Mapa de calor (día × hora)">
        <div className="heat-map">
          {(heatMap ?? []).slice(-14).map((d) => {
            const buckets = (d.hourBuckets ?? {}) as Record<string, number>;
            return (
              <div key={String(d.day)} className="heat-map-row">
                <small className="heat-map-label">{String(d.day)}</small>
                {Array.from({ length: 24 }).map((_, h) => {
                  const count = buckets[String(h)] ?? 0;
                  const level = count === 0 ? 0 : Math.min(4, Math.ceil(count));
                  return (
                    <div
                      key={h}
                      title={`${h}:00 = ${count}`}
                      className="heat-map-cell"
                      data-level={level || undefined}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </PageSection>

      <PageSection title="Productores frecuentes">
        <ul>{frequent.map((p) => <li key={String(p.name)}>{String(p.name)} — {String(p.count)} compras</li>)}</ul>
      </PageSection>

      <PageSection title="Productores inactivos">
        <ul>{inactive.map((p) => <li key={String(p.id)}>{String(p.name)}</li>)}</ul>
      </PageSection>

      <PageSection title="Centros con mayor volumen">
        <ul>{topCenters.map((c) => <li key={String(c.centerId)}>{String(c.centerId)} — {Number(c.kg).toLocaleString()} kg</li>)}</ul>
      </PageSection>

      <PageSection title="Calidad por zona / finca">
        <SimpleRecordsTable
          gridId="coffee-analytics-quality-zone"
          selectable={false}
          data={zoneData}
          columns={[
            { key: 'zone', label: 'Zona', getValue: (r) => String(r.zone) },
            { key: 'avgScore', label: 'Score prom.', getValue: (r) => Number(r.avgScore ?? 0).toFixed(1) },
            { key: 'samples', label: 'Muestras', getValue: (r) => String(r.samples) },
          ]}
        />
      </PageSection>

      <PageSection title="Variación de precios">
        <div className="spark-chart">
          {(trends.prices ?? []).slice(-30).map((p) => (
            <div key={String(p.day)} className="spark-chart-col-fixed" title={`${p.day}: ${p.avgPrice}`}>
              <div className="spark-bar" style={{ height: Math.max(4, Number(p.avgPrice) / 500) }} />
            </div>
          ))}
        </div>
      </PageSection>
    </PageLayout>
  );
}
