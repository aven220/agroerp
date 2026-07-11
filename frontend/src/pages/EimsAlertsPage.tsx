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
  acknowledgeEimsAlert,
  listEimsExpiryAlerts,
  refreshEimsExpiryAlerts,
} from '../api/eims';

type AlertRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<AlertRow>[] = [
  { key: 'alertKey', label: 'Alerta', getValue: (r) => String(r.alertKey ?? '') },
  {
    key: 'lotKey',
    label: 'Lote',
    render: (r) => (
      <Link to={`/inventario/lotes/${encodeURIComponent(String(r.lotKey))}`}>
        {String(r.lotKey)}
      </Link>
    ),
    getValue: (r) => String(r.lotKey ?? ''),
  },
  { key: 'daysToExpiry', label: 'Días', getValue: (r) => String(r.daysToExpiry ?? '') },
  { key: 'expiryDate', label: 'Vence', getValue: (r) => String(r.expiryDate ?? '').slice(0, 10) },
  { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity ?? '') },
];

export function EimsAlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [error, setError] = useState('');

  const reload = () =>
    listEimsExpiryAlerts(false)
      .then((r) => setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'alertKey'))))
      .catch((e) => setError(e.message));

  useEffect(() => { reload(); }, []);

  const rowActions: RowAction<AlertRow>[] = [
    {
      id: 'ack',
      label: 'Acusar',
      onAction: (r) => {
        acknowledgeEimsAlert(String(r.alertKey))
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Panel de alertas de vencimiento"
        subtitle="Alertas configurables y acuse de recibo"
        actions={
          <PageActions>
            <button
              className="btn"
              onClick={() => refreshEimsExpiryAlerts().then(reload).catch((e) => setError(e.message))}
            >
              Regenerar alertas
            </button>
            <Link to="/inventario/lotes/vencimientos" className="btn">Vencimientos</Link>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Alertas">
        <SimpleRecordsTable
          gridId="eims-alerts"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin alertas"
        />
      </PageSection>
    </PageLayout>
  );
}
