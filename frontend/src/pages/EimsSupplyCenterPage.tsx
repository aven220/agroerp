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
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  generateEimsSupplySuggestions,
  getEimsSupplyCenter,
  listEimsSupplySuggestions,
  refreshEimsPlanningAlerts,
} from '../api/eims';

type SuggestionRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<SuggestionRow>[] = [
  { key: 'suggestionType', label: 'Tipo', getValue: (r) => String(r.suggestionType ?? '') },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '') },
  { key: 'suggestedQty', label: 'Cantidad', getValue: (r) => String(r.suggestedQty ?? '') },
  { key: 'reason', label: 'Razón', getValue: (r) => String(r.reason ?? '—') },
];

export function EimsSupplyCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [c, s] = await Promise.all([getEimsSupplyCenter(), listEimsSupplySuggestions('proposed')]);
    setCenter(c);
    setSuggestions(
      (s as Array<Record<string, unknown>>)
        .slice(0, 20)
        .map((row) => withRowId(row, 'id')),
    );
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Centro de abastecimiento"
        subtitle="Reservas, niveles, sugerencias y alertas de planificación"
        actions={
          <PageActions>
            <button
              className="btn"
              onClick={() => generateEimsSupplySuggestions().then(reload).catch((e) => setError(e.message))}
            >
              Generar sugerencias
            </button>
            <button
              className="btn"
              onClick={() => refreshEimsPlanningAlerts().then(reload).catch((e) => setError(e.message))}
            >
              Evaluar alertas
            </button>
            <Link to="/inventario/reservas" className="btn">Reservas</Link>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      {center ? (
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Reservas activas" value={String(center.activeReservations ?? 0)} tone="green" />
          <MetricCard label="Sugerencias abiertas" value={String(center.openSuggestions ?? 0)} />
          <MetricCard label="Alertas" value={String(center.openAlerts ?? 0)} />
          <MetricCard label="Reglas activas" value={String(center.activeRules ?? 0)} />
          <MetricCard label="Perfiles de nivel" value={String(center.levelProfiles ?? 0)} />
          <MetricCard label="Eventos calendario" value={String(center.upcomingCalendarEvents ?? 0)} />
        </PageSummary>
      ) : null}

      <PageSection title="Sugerencias recientes">
        <SimpleRecordsTable
          gridId="eims-supply-suggestions"
          columns={columns}
          data={suggestions}
          selectable={false}
          emptyMessage="Sin sugerencias"
        />
      </PageSection>
    </PageLayout>
  );
}
