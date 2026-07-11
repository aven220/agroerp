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
  acceptEimsSupplySuggestion,
  generateEimsSupplySuggestions,
  listEimsSupplySuggestions,
  rejectEimsSupplySuggestion,
} from '../api/eims';

type SuggestionRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<SuggestionRow>[] = [
  { key: 'suggestionType', label: 'Tipo', getValue: (r) => String(r.suggestionType ?? '') },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => String(r.itemKey ?? '') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '') },
  { key: 'fromWarehouseKey', label: 'Desde', getValue: (r) => String(r.fromWarehouseKey ?? '—') },
  { key: 'suggestedQty', label: 'Cantidad', getValue: (r) => String(r.suggestedQty ?? '') },
  { key: 'totalCost', label: 'Costo', getValue: (r) => Number(r.totalCost ?? 0).toLocaleString() },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
];

export function EimsSuggestionsPage() {
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    setRows(
      ((await listEimsSupplySuggestions()) as Array<Record<string, unknown>>).map((row) =>
        withRowId(row, 'id', 'suggestionKey'),
      ),
    );
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const rowActions: RowAction<SuggestionRow>[] = [
    {
      id: 'accept',
      label: 'Aceptar',
      hidden: (r) => r.status !== 'proposed',
      onAction: (r) => {
        acceptEimsSupplySuggestion(String(r.suggestionKey)).then(reload).catch((e) => setError(e.message));
      },
    },
    {
      id: 'reject',
      label: 'Rechazar',
      hidden: (r) => r.status !== 'proposed',
      onAction: (r) => {
        rejectEimsSupplySuggestion(String(r.suggestionKey), 'Rechazada por usuario')
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Sugerencias de compra y traslado"
        subtitle="Reabastecimiento automático por reglas y demanda"
        actions={
          <PageActions>
            <button className="btn" onClick={() => generateEimsSupplySuggestions().then(reload).catch((e) => setError(e.message))}>
              Regenerar
            </button>
            <Link to="/inventario/abastecimiento" className="btn">Centro</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Sugerencias">
        <SimpleRecordsTable
          gridId="eims-suggestions"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin sugerencias"
        />
      </PageSection>
    </PageLayout>
  );
}
