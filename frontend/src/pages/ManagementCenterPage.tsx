import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, PageSummary, MetricCard, EmptyPanel } from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { getCoffeeCenter, getOpsAlerts, getExecutiveDashboard } from '../api/coffee';

/**
 * PM-25 — Enterprise Management Center
 * Solo indicadores y alertas. Sin botones operativos.
 */
export function ManagementCenterPage() {
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [exec, setExec] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getCoffeeCenter().catch((e: Error) => {
        setError(e.message);
        return null;
      }),
      getExecutiveDashboard().catch(() => null),
      getOpsAlerts(false).catch(() => []),
    ]).then(([center, executive, opsAlerts]) => {
      if (center) setDash(center);
      if (executive) setExec(executive as Record<string, unknown>);
      if (Array.isArray(opsAlerts)) setAlerts(opsAlerts as Array<Record<string, unknown>>);
      else if (opsAlerts && typeof opsAlerts === 'object' && Array.isArray((opsAlerts as { alerts?: unknown[] }).alerts)) {
        setAlerts((opsAlerts as { alerts: Array<Record<string, unknown>> }).alerts);
      }
    });
  }, []);

  if (!dash && !error && !exec) {
    return <LoadingState variant="page" message="Cargando resumen ejecutivo…" />;
  }

  const centerAlerts = (dash?.alerts ?? []) as Array<Record<string, unknown>>;
  const allAlerts = [...alerts, ...centerAlerts].slice(0, 8);

  return (
    <>
      <Header
        title="Resumen ejecutivo"
        subtitle="Centro de Gerencia"
        description="Indicadores clave del día. Sin acciones operativas."
        showExperience={false}
      />
      <PageLayout>
        {error ? <section className="panel error-panel">{error}</section> : null}

        <PageSection title="Compras del día">
          <PageSummary>
            <MetricCard label="Tickets" value={dash?.ticketsToday ?? '—'} tone="coffee" />
            <MetricCard label="Kg comprados" value={dash ? dash.kgToday.toFixed(0) : '—'} />
            <MetricCard
              label="Monto"
              value={dash ? `$${dash.amountToday.toLocaleString()}` : '—'}
              tone="teal"
            />
            <MetricCard label="Liquidaciones" value={dash?.settlementsToday ?? '—'} />
          </PageSummary>
        </PageSection>

        <PageSection title="Inventario y calidad">
          <PageSummary>
            <MetricCard label="Entradas a inventario" value={dash?.inventoryToday ?? '—'} tone="green" />
            <MetricCard label="Evaluaciones de calidad" value={dash?.qualityToday ?? '—'} />
            <MetricCard label="Pesajes" value={dash?.weighedToday ?? '—'} />
            <MetricCard label="En cola" value={dash?.queueLength ?? '—'} hint="Tickets pendientes" />
          </PageSummary>
        </PageSection>

        {exec ? (
          <PageSection title="Indicadores clave">
            <div className="emc-kv-grid">
              {Object.entries(exec)
                .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
                .slice(0, 12)
                .map(([key, value]) => (
                  <div key={key} className="emc-kv">
                    <span className="emc-kv-label">{formatKey(key)}</span>
                    <strong className="emc-kv-value">{String(value)}</strong>
                  </div>
                ))}
            </div>
          </PageSection>
        ) : null}

        <PageSection title="Alertas">
          {allAlerts.length === 0 ? (
            <EmptyPanel title="Sin alertas" description="No hay alertas abiertas en este momento." />
          ) : (
            <ul className="emc-alerts">
              {allAlerts.map((a, i) => (
                <li key={i}>
                  <span className="emc-alert-sev">[{String(a.severity ?? a.level ?? 'info')}]</span>{' '}
                  <strong>{String(a.title ?? a.type ?? 'Alerta')}</strong>
                  {a.message ? <span className="muted"> — {String(a.message)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title="Producción / operación">
          {dash?.operations ? (
            <PageSummary>
              <MetricCard
                label="Atención prom."
                value={`${String((dash.operations as Record<string, unknown>).avgAttentionMinutes ?? 0)} min`}
              />
              <MetricCard
                label="Pesaje prom."
                value={`${String((dash.operations as Record<string, unknown>).avgWeighingMinutes ?? 0)} min`}
              />
              <MetricCard
                label="Calidad prom."
                value={`${String((dash.operations as Record<string, unknown>).avgQualityMinutes ?? 0)} min`}
              />
              <MetricCard
                label="Proceso total"
                value={`${String((dash.operations as Record<string, unknown>).avgTotalProcessMinutes ?? 0)} min`}
              />
            </PageSummary>
          ) : (
            <EmptyPanel
              title="Sin métricas de ciclo"
              description="Las métricas de tiempo promedio aparecerán cuando haya operación del día."
            />
          )}
        </PageSection>
      </PageLayout>
    </>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
