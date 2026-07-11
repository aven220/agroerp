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
import type { RowAction } from '../lib/data-grid/types';
import {
  acknowledgeEimsPlanningAlert,
  listEimsAiInsights,
  listEimsPlanningAlerts,
  refreshEimsPlanningAlerts,
} from '../api/eims';

type AlertRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<AlertRow>[] = [
  { key: 'alertType', label: 'Tipo', getValue: (r) => String(r.alertType ?? '') },
  { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity ?? '') },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '—') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '—') },
  { key: 'message', label: 'Mensaje', getValue: (r) => String(r.message ?? '') },
];

export function EimsPlanningAlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [insights, setInsights] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [a, i] = await Promise.all([
      listEimsPlanningAlerts(false),
      listEimsAiInsights(),
    ]);
    setRows((a as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'alertKey')));
    setInsights(i as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const rowActions: RowAction<AlertRow>[] = [
    {
      id: 'ack',
      label: 'Acusar',
      onAction: (r) => {
        acknowledgeEimsPlanningAlert(String(r.alertKey))
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Panel de alertas de planificación"
        subtitle="Stock bajo, sobrestock, inmovilizado, vencimientos y reservas"
        actions={
          <PageActions>
            <button
              className="btn"
              onClick={() => refreshEimsPlanningAlerts().then(reload).catch((e) => setError(e.message))}
            >
              Regenerar
            </button>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Alertas">
        <SimpleRecordsTable
          gridId="eims-planning-alerts"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin alertas"
        />
      </PageSection>

      <PageSection title="Insights IA">
        <ul>
          {insights.slice(0, 40).map((i) => (
            <li key={String(i.id)}>
              <strong>{String(i.insightType)}</strong> · {String(i.title)} — {String(i.summary)} (score={String(i.score)})
            </li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
