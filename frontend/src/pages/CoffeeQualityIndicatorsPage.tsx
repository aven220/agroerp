import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { getQualityIndicators, listCoffeeQuality } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeQualityIndicatorsPage() {
  const [indicators, setIndicators] = useState<Record<string, unknown> | null>(null);
  const [recent, setRecent] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getQualityIndicators().then(setIndicators);
    listCoffeeQuality().then((r) => setRecent((r as Array<Record<string, unknown>>).slice(0, 20)));
  }, []);

  if (!indicators) return <LoadingState variant="page" message="Cargando indicadores…" />;

  const data = recent.map((r, i) =>
    withRowId({ ...r, id: String(r.id ?? `quality-${i}`) } as Record<string, unknown>, 'id'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Indicadores de calidad"
        subtitle="Aceptación, rechazo, laboratorio y score"
        actions={
          <PageActions>
            <Link to="/compras/calidad" className="btn">Panel calidad</Link>
          </PageActions>
        }
      />
      <PageSummary>
        <MetricCard label="Pendientes" value={String(indicators.pending)} />
        <MetricCard label="Aceptados" value={String(indicators.accepted)} />
        <MetricCard label="Condicionados" value={String(indicators.conditioned)} />
        <MetricCard label="Rechazados" value={String(indicators.rejected)} />
        <MetricCard label="Laboratorio" value={String(indicators.lab)} />
        <MetricCard label="Alertas abiertas" value={String(indicators.openAlerts)} />
        <MetricCard label="Score promedio" value={Number(indicators.avgScore ?? 0).toFixed(1)} />
        <MetricCard label="Tasa aceptación" value={`${(Number(indicators.acceptanceRate ?? 0) * 100).toFixed(1)}%`} />
      </PageSummary>
      <PageSection title="Últimas evaluaciones">
        <SimpleRecordsTable
          gridId="coffee-quality-indicators"
          selectable={false}
          data={data}
          columns={[
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            {
              key: 'producerName',
              label: 'Productor',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.producerName ?? ''),
            },
            { key: 'qualityScore', label: 'Score', getValue: (r) => String(r.qualityScore ?? '—') },
            { key: 'decision', label: 'Decisión', getValue: (r) => String(r.decision ?? '') },
            { key: 'grade', label: 'Grado', getValue: (r) => String(r.grade ?? '') },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
