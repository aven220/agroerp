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
import { listEimsCountHistory } from '../api/eims';

type HistoryRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<HistoryRow>[] = [
  { key: 'countKey', label: 'Clave', getValue: (r) => String(r.countKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'countType', label: 'Tipo', getValue: (r) => String(r.countType ?? '') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
  {
    key: 'lines',
    label: 'Líneas',
    getValue: (r) => String(((r._count as Record<string, number>) ?? {}).lines ?? 0),
  },
  {
    key: 'adjustments',
    label: 'Ajustes',
    getValue: (r) => String(((r._count as Record<string, number>) ?? {}).adjustments ?? 0),
  },
  {
    key: 'createdAt',
    label: 'Creado',
    getValue: (r) => String(r.createdAt ?? '').slice(0, 19),
  },
  {
    key: 'open',
    label: '',
    render: (r) => (
      <Link to={`/inventario/conteos/${encodeURIComponent(String(r.countKey))}`}>Ver</Link>
    ),
    getValue: () => '',
  },
];

export function EimsCountHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsCountHistory()
      .then((r) => setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'countKey'))))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Historial de conteos"
        subtitle="Sesiones, estados y resultados"
        actions={
          <PageActions>
            <Link to="/inventario/conteos" className="btn">Centro</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Historial">
        <SimpleRecordsTable
          gridId="eims-count-history"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin historial"
        />
      </PageSection>
    </PageLayout>
  );
}
