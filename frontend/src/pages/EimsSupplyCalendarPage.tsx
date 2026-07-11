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
import { listEimsSupplyCalendar } from '../api/eims';

type CalendarRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<CalendarRow>[] = [
  {
    key: 'scheduledAt',
    label: 'Fecha',
    getValue: (r) => String(r.scheduledAt ?? '').slice(0, 16).replace('T', ' '),
  },
  { key: 'title', label: 'Título', getValue: (r) => String(r.title ?? '') },
  { key: 'eventType', label: 'Tipo', getValue: (r) => String(r.eventType ?? '') },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '—') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '—') },
  { key: 'quantity', label: 'Cantidad', getValue: (r) => String(r.quantity ?? '—') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
];

export function EimsSupplyCalendarPage() {
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsSupplyCalendar()
      .then((r) => setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id'))))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Calendario de abastecimiento"
        subtitle="Compras, traslados y reposiciones programadas"
        actions={
          <PageActions>
            <Link to="/inventario/abastecimiento" className="btn">Centro</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Eventos">
        <SimpleRecordsTable
          gridId="eims-supply-calendar"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin eventos"
        />
      </PageSection>
    </PageLayout>
  );
}
