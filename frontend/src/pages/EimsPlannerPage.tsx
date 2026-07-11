import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  generateEimsForecasts,
  getEimsPlanner,
  listEimsForecasts,
  refreshEimsAiInsights,
} from '../api/eims';

type ForecastRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ForecastRow>[] = [
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '—') },
  {
    key: 'period',
    label: 'Período',
    getValue: (r) => `${String(r.periodStart ?? '').slice(0, 10)} — ${String(r.periodEnd ?? '').slice(0, 10)}`,
  },
  { key: 'forecastQty', label: 'Cantidad', getValue: (r) => String(r.forecastQty ?? '') },
  { key: 'rotationRate', label: 'Rotación', getValue: (r) => String(r.rotationRate ?? '—') },
  { key: 'aiScore', label: 'IA score', getValue: (r) => String(r.aiScore ?? '—') },
];

export function EimsPlannerPage() {
  const [planner, setPlanner] = useState<Record<string, unknown> | null>(null);
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [p, f] = await Promise.all([getEimsPlanner(), listEimsForecasts()]);
    setPlanner(p);
    setForecasts(
      (f as Array<Record<string, unknown>>)
        .slice(0, 50)
        .map((row) => withRowId(row, 'id', 'itemKey')),
    );
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const insights = (planner?.insights as Array<Record<string, unknown>>) ?? [];
  const scenarios = (planner?.scenarios as Array<Record<string, unknown>>) ?? [];

  return (
    <PageLayout>
      <PageHeader
        title="Planificador de inventario"
        subtitle="Pronósticos de consumo, compras y rotación"
        actions={
          <PageActions>
            <button className="btn" onClick={() => generateEimsForecasts().then(reload).catch((e) => setError(e.message))}>
              Generar pronósticos
            </button>
            <button className="btn" onClick={() => refreshEimsAiInsights().then(reload).catch((e) => setError(e.message))}>
              Actualizar IA
            </button>
            <Link to="/inventario/simulador" className="btn">Simulador</Link>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Pronósticos de demanda">
        <SimpleRecordsTable
          gridId="eims-forecasts"
          columns={columns}
          data={forecasts}
          selectable={false}
          emptyMessage="Sin pronósticos"
        />
      </PageSection>

      <PageSection title="Escenarios recientes">
        <ul>{scenarios.map((s) => <li key={String(s.id)}>{String(s.name)} — {String(s.status)}</li>)}</ul>
      </PageSection>

      <PageSection title="Insights IA">
        <ul>{insights.map((i) => <li key={String(i.id)}><strong>{String(i.insightType)}</strong> {String(i.title)}</li>)}</ul>
      </PageSection>
    </PageLayout>
  );
}
