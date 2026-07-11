import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  closeEimsPeriod,
  listEimsPeriods,
  recalculateEimsPeriod,
  reopenEimsPeriod,
} from '../api/eims';

type PeriodRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<PeriodRow>[] = [
  { key: 'periodKey', label: 'Período', getValue: (r) => String(r.periodKey ?? '') },
  { key: 'periodType', label: 'Tipo', getValue: (r) => String(r.periodType ?? '') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
  { key: 'inventoryValue', label: 'Valor', getValue: (r) => Number(r.inventoryValue ?? 0).toLocaleString() },
  { key: 'totalEntries', label: 'Entradas', getValue: (r) => String(r.totalEntries ?? 0) },
  { key: 'totalExits', label: 'Salidas', getValue: (r) => String(r.totalExits ?? 0) },
  { key: 'closedBy', label: 'Cerrado por', getValue: (r) => String(r.closedBy ?? '—') },
  {
    key: 'closedAt',
    label: 'Fecha',
    getValue: (r) => (r.closedAt ? new Date(String(r.closedAt)).toLocaleString() : '—'),
  },
];

export function EimsPeriodsPage() {
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [periodType, setPeriodType] = useState('daily');
  const [reason, setReason] = useState('Ajuste autorizado de cierre');
  const [error, setError] = useState('');

  const reload = () =>
    listEimsPeriods().then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'periodKey'))),
    );
  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const rowActions: RowAction<PeriodRow>[] = [
    {
      id: 'reopen',
      label: 'Reabrir',
      hidden: (r) => r.status !== 'closed',
      onAction: (r) => {
        reopenEimsPeriod(String(r.periodKey), reason).then(reload).catch((e) => setError(e.message));
      },
    },
    {
      id: 'recalc',
      label: 'Recalcular',
      onAction: (r) => {
        recalculateEimsPeriod(String(r.periodKey), reason).then(reload).catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Cierres de inventario"
        subtitle="Cierre diario, mensual, anual, reapertura y recálculo"
        actions={
          <PageActions>
            <Link to="/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Cerrar período">
        <div className="form-grid">
          <FieldGroup label="Tipo">
            <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="daily">Diario</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Motivo">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn btn-primary"
            onClick={() => closeEimsPeriod(periodType).then(reload).catch((e) => setError(e.message))}
          >
            Cerrar período
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Períodos">
        <SimpleRecordsTable
          gridId="eims-periods"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin períodos"
        />
      </PageSection>
    </PageLayout>
  );
}
