import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getAiCenter, type AiCenter } from '../api/ai';
import { LoadingState } from '../components/ux/LoadingState';

export function AiCenterPage() {
  const [center, setCenter] = useState<AiCenter | null>(null);

  useEffect(() => { getAiCenter().then(setCenter); }, []);

  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de IA..." />;

  return (
    <>
      <Header
        title="Centro de IA — EAIDSP"
        subtitle="Plataforma empresarial de decisión asistida por IA"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Asistente', to: '/ia/chat' }}
            moreActions={[
              { label: 'Copilotos', to: '/ia/copilotos' },
              { label: 'Modelos', to: '/ia/modelos' },
              { label: 'Prompts', to: '/ia/prompts' },
              { label: 'Métricas', to: '/ia/metricas' },
              { label: 'Historial', to: '/ia/conversaciones' },
              { label: 'Automatizaciones', to: '/ia/automatizaciones' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Consultas 24h" value={center.dashboard.kpis.requests24h} tone="blue" />
          <MetricCard label="Consultas mes" value={center.dashboard.kpis.requestsMonth} />
          <MetricCard label="Copilotos" value={center.copilotCount} />
          <MetricCard label="Proveedores" value={center.providerCount} />
          <MetricCard label="Prompts" value={center.promptCount} />
          <MetricCard label="Latencia prom." value={`${center.dashboard.kpis.avgLatencyMs}ms`} />
          <MetricCard label="Éxito" value={`${center.dashboard.kpis.successRatePct}%`} tone="green" />
          <MetricCard label="Costo est. mes" value={`$${center.dashboard.kpis.estimatedCostMonth.toFixed(2)}`} />
        </PageSummary>

        <div className="split-layout">
          <PageSection title="Por servicio">
            <table className="data-table data-table-compact">
              <tbody>
                {center.dashboard.byService.map((s) => (
                  <tr key={s.service}><td>{s.service}</td><td>{s.count}</td></tr>
                ))}
              </tbody>
            </table>
          </PageSection>
          <PageSection title="Modelos más usados">
            <table className="data-table data-table-compact">
              <tbody>
                {center.dashboard.byModel.map((m) => (
                  <tr key={m.model}><td>{m.model}</td><td>{m.count}</td></tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        </div>
      </PageLayout>
    </>
  );
}
