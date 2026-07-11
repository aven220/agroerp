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
import { listEimsCountActs } from '../api/eims';

type ActRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ActRow>[] = [
  { key: 'actKey', label: 'Acta', getValue: (r) => String(r.actKey ?? '') },
  {
    key: 'countKey',
    label: 'Conteo',
    render: (r) => {
      const session = (r.session as Record<string, unknown>) ?? {};
      const key = String(session.countKey ?? '');
      return key ? (
        <Link to={`/inventario/conteos/${encodeURIComponent(key)}`}>{key}</Link>
      ) : (
        '—'
      );
    },
    getValue: (r) => String(((r.session as Record<string, unknown>) ?? {}).countKey ?? ''),
  },
  { key: 'linesCounted', label: 'Líneas', getValue: (r) => String(r.linesCounted ?? '') },
  { key: 'variancesFound', label: 'Variaciones', getValue: (r) => String(r.variancesFound ?? '') },
  { key: 'adjustmentsPosted', label: 'Ajustes', getValue: (r) => String(r.adjustmentsPosted ?? '') },
  { key: 'totalVarianceCost', label: 'Costo var.', getValue: (r) => String(r.totalVarianceCost ?? '') },
  { key: 'documentKey', label: 'Documento', getValue: (r) => String(r.documentKey ?? '—') },
  {
    key: 'closedAt',
    label: 'Cierre',
    getValue: (r) => String(r.closedAt ?? '').slice(0, 19),
  },
];

export function EimsCountActsPage() {
  const [rows, setRows] = useState<ActRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsCountActs()
      .then((r) => setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'actKey'))))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Actas de cierre de conteo"
        subtitle="Documentos de cierre y resumen de conciliaciones"
        actions={
          <PageActions>
            <Link to="/inventario/conteos" className="btn">Centro</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Actas">
        <SimpleRecordsTable
          gridId="eims-count-acts"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin actas"
        />
      </PageSection>
    </PageLayout>
  );
}
