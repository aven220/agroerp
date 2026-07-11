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
import { blockExpiredEimsLots, listEimsExpiryPanel } from '../api/eims';

type ExpiryRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ExpiryRow>[] = [
  { key: 'lotKey', label: 'Lote', getValue: (r) => String(r.lotKey ?? '') },
  {
    key: 'itemKey',
    label: 'Artículo',
    getValue: (r) => String((r.item as Record<string, unknown>)?.itemKey ?? ''),
  },
  {
    key: 'warehouseKey',
    label: 'Bodega',
    getValue: (r) => String((r.warehouse as Record<string, unknown>)?.warehouseKey ?? ''),
  },
  { key: 'onHandQty', label: 'Disponible', getValue: (r) => String(r.onHandQty ?? '') },
  {
    key: 'productionDate',
    label: 'Producción',
    getValue: (r) => (r.productionDate ? String(r.productionDate).slice(0, 10) : '—'),
  },
  {
    key: 'receivedDate',
    label: 'Ingreso',
    getValue: (r) => (r.receivedDate ? String(r.receivedDate).slice(0, 10) : '—'),
  },
  {
    key: 'expiryDate',
    label: 'Vence',
    getValue: (r) => (r.expiryDate ? String(r.expiryDate).slice(0, 10) : '—'),
  },
  { key: 'shelfLifeDays', label: 'Vida útil', getValue: (r) => String(r.shelfLifeDays ?? '—') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
  {
    key: 'view360',
    label: '',
    render: (r) => (
      <Link to={`/inventario/lotes/${encodeURIComponent(String(r.lotKey))}`}>360°</Link>
    ),
    getValue: () => '',
  },
];

export function EimsExpiryPage() {
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [error, setError] = useState('');

  const reload = () =>
    listEimsExpiryPanel()
      .then((r) => setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'lotKey'))))
      .catch((e) => setError(e.message));

  useEffect(() => { reload(); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Panel de vencimientos"
        subtitle="Producción, ingreso, vida útil y bloqueo por vencimiento"
        actions={
          <PageActions>
            <button
              className="btn"
              onClick={() => blockExpiredEimsLots().then(reload).catch((e) => setError(e.message))}
            >
              Bloquear vencidos
            </button>
            <Link to="/inventario/lotes/alertas" className="btn">Alertas</Link>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Lotes por vencimiento">
        <SimpleRecordsTable
          gridId="eims-expiry"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin lotes por vencer"
        />
      </PageSection>
    </PageLayout>
  );
}
