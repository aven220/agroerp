import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, PageSummary, MetricCard, EmptyPanel } from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { getCoffeeCenter, getOpsAlerts, getExecutiveDashboard } from '../api/coffee';
import { getWorkflowDashboard } from '../api/workflows';
import { humanizeCopy } from '../lib/humanizeCopy';

/**
 * PM-28 — Centro de Gerencia: solo KPIs, tendencias, riesgos y alertas.
 * Sin botones operativos (nueva recepción, productor, liquidación, etc.).
 */
export function ManagementCenterPage() {
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [exec, setExec] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [wf, setWf] = useState<Awaited<ReturnType<typeof getWorkflowDashboard>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getCoffeeCenter().catch((e: Error) => {
        setError(e.message);
        return null;
      }),
      getExecutiveDashboard().catch(() => null),
      getOpsAlerts(false).catch(() => []),
      getWorkflowDashboard().catch(() => null),
    ]).then(([center, executive, opsAlerts, workflow]) => {
      if (center) setDash(center);
      if (executive) setExec(executive as Record<string, unknown>);
      if (Array.isArray(opsAlerts)) setAlerts(opsAlerts as Array<Record<string, unknown>>);
      else if (opsAlerts && typeof opsAlerts === 'object' && Array.isArray((opsAlerts as { alerts?: unknown[] }).alerts)) {
        setAlerts((opsAlerts as { alerts: Array<Record<string, unknown>> }).alerts);
      }
      if (workflow) setWf(workflow);
    });
  }, []);

  const risks = useMemo(() => {
    const items: Array<{ title: string; detail: string; level: 'alto' | 'medio' | 'bajo' }> = [];
    if ((dash?.queueLength ?? 0) > 5) {
      items.push({
        title: 'Cola operativa elevada',
        detail: `${dash!.queueLength} tickets en espera pueden afectar el ciclo del día.`,
        level: 'alto',
      });
    }
    if ((wf?.summary.overdueProcesses ?? 0) > 0) {
      items.push({
        title: 'Trámites fuera de plazo',
        detail: `${wf!.summary.overdueProcesses} procesos vencidos requieren seguimiento gerencial.`,
        level: 'alto',
      });
    }
    const qualityGap = Math.max(0, (dash?.weighedToday ?? 0) - (dash?.qualityToday ?? 0));
    if (qualityGap > 0) {
      items.push({
        title: 'Brecha de calidad',
        detail: `${qualityGap} pesajes aún sin evaluación de calidad.`,
        level: 'medio',
      });
    }
    const settleGap = Math.max(0, (dash?.qualityToday ?? 0) - (dash?.settlementsToday ?? 0));
    if (settleGap > 0) {
      items.push({
        title: 'Liquidaciones rezagadas',
        detail: `${settleGap} evaluaciones de calidad sin liquidación.`,
        level: 'medio',
      });
    }
    if (alerts.length > 3) {
      items.push({
        title: 'Concentración de alertas',
        detail: `${alerts.length} alertas abiertas en el período.`,
        level: 'medio',
      });
    }
    return items;
  }, [dash, wf, alerts]);

  if (!dash && !error && !exec) {
    return <LoadingState variant="page" message="Cargando resumen ejecutivo…" />;
  }

  const centerAlerts = (dash?.alerts ?? []) as Array<Record<string, unknown>>;
  const allAlerts = [...alerts, ...centerAlerts].slice(0, 10);

  const conversion =
    dash && dash.ticketsToday > 0
      ? Math.round(((dash.settlementsToday ?? 0) / dash.ticketsToday) * 100)
      : null;

  return (
    <>
      <Header
        title="Resumen ejecutivo"
        subtitle="Centro de Gerencia"
        description="Indicadores, tendencias, riesgos y alertas. Sin acciones operativas."
        showExperience={false}
      />
      <PageLayout>
        {error ? <section className="panel error-panel">{error}</section> : null}

        <PageSection title="KPIs del día">
          <PageSummary>
            <MetricCard label="Tickets" value={dash?.ticketsToday ?? '—'} tone="coffee" />
            <MetricCard label="Kg comprados" value={dash ? dash.kgToday.toFixed(0) : '—'} />
            <MetricCard
              label="Monto"
              value={dash ? `$${dash.amountToday.toLocaleString()}` : '—'}
              tone="teal"
            />
            <MetricCard label="Liquidaciones" value={dash?.settlementsToday ?? '—'} />
            <MetricCard
              label="Conversión a liquidación"
              value={conversion != null ? `${conversion}%` : '—'}
              hint="Liquidaciones / tickets del día"
            />
            <MetricCard label="En cola" value={dash?.queueLength ?? '—'} hint="Carga operativa" />
          </PageSummary>
        </PageSection>

        <PageSection title="Tendencias operativas">
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
                label="Ciclo total"
                value={`${String((dash.operations as Record<string, unknown>).avgTotalProcessMinutes ?? 0)} min`}
              />
            </PageSummary>
          ) : (
            <EmptyPanel
              title="Sin tendencia del día"
              description="Los tiempos promedio del ciclo de compra aparecerán cuando haya operación registrada."
              hint="No requiere acción gerencial inmediata."
            />
          )}
        </PageSection>

        <PageSection title="Comparativos del día">
          <PageSummary>
            <MetricCard label="Pesajes" value={dash?.weighedToday ?? '—'} />
            <MetricCard label="Calidad" value={dash?.qualityToday ?? '—'} tone="green" />
            <MetricCard label="Inventario" value={dash?.inventoryToday ?? '—'} />
            <MetricCard
              label="Procesos activos"
              value={wf?.summary.activeProcesses ?? '—'}
            />
            <MetricCard
              label="Procesos vencidos"
              value={wf?.summary.overdueProcesses ?? '—'}
            />
            <MetricCard
              label="Completados (30d)"
              value={wf?.summary.completedLast30Days ?? '—'}
            />
          </PageSummary>
        </PageSection>

        {exec ? (
          <PageSection title="Indicadores estratégicos">
            <div className="emc-kv-grid">
              {Object.entries(exec)
                .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
                .slice(0, 12)
                .map(([key, value]) => (
                  <div key={key} className="emc-kv">
                    <span className="emc-kv-label">{humanizeCopy(formatKey(key))}</span>
                    <strong className="emc-kv-value">{humanizeCopy(String(value))}</strong>
                  </div>
                ))}
            </div>
          </PageSection>
        ) : null}

        <PageSection title="Riesgos">
          {risks.length === 0 ? (
            <EmptyPanel
              title="Sin riesgos destacados"
              description="Los indicadores del día no muestran desviaciones que requieran atención gerencial."
            />
          ) : (
            <ul className="emc-alerts emc-risks">
              {risks.map((r) => (
                <li key={r.title}>
                  <span className={`emc-alert-sev risk-${r.level}`}>[{r.level}]</span>{' '}
                  <strong>{r.title}</strong>
                  <span className="muted"> — {r.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title="Alertas">
          {allAlerts.length === 0 ? (
            <EmptyPanel
              title="Sin alertas abiertas"
              description="No hay alertas que requieran seguimiento ejecutivo en este momento."
            />
          ) : (
            <ul className="emc-alerts">
              {allAlerts.map((a, i) => (
                <li key={i}>
                  <span className="emc-alert-sev">
                    [{humanizeCopy(String(a.severity ?? a.level ?? 'info'))}]
                  </span>{' '}
                  <strong>{String(a.title ?? a.type ?? 'Alerta')}</strong>
                  {a.message ? <span className="muted"> — {String(a.message)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title="Acciones estratégicas">
          <ul className="eoc-list emc-strategic">
            <li>
              <Link to="/compras/ops/ejecutivo">Revisar tablero ejecutivo de compras</Link>
            </li>
            <li>
              <Link to="/bi">Consultar reportes e indicadores</Link>
            </li>
            <li>
              <Link to="/inventario/ops">Seguimiento de inventario</Link>
            </li>
            <li>
              <Link to="/compras/calidad/indicadores">Indicadores de calidad</Link>
            </li>
          </ul>
          <p className="muted emc-strategic-note">
            Este centro no incluye registro operativo (recepciones, productores o liquidaciones). Use el Centro de
            Operación para el trabajo del día.
          </p>
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
