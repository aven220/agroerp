import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { listEimsParameters, upsertEimsParameter } from '../api/eims';

type ParameterRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ParameterRow>[] = [
  { key: 'parameterKey', label: 'Clave', getValue: (r) => String(r.parameterKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'value', label: 'Valor', getValue: (r) => JSON.stringify(r.value ?? {}) },
  { key: 'version', label: 'Versión', getValue: (r) => String(r.version ?? '') },
];

export function EimsParametersPage() {
  const [rows, setRows] = useState<ParameterRow[]>([]);

  const reload = () =>
    listEimsParameters().then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'parameterKey'))),
    );
  useEffect(() => { reload(); }, []);

  const toggle = async (row: ParameterRow, enabled: boolean) => {
    const value = { ...(row.value as Record<string, unknown>), enabled };
    await upsertEimsParameter({
      parameterKey: row.parameterKey,
      name: row.name,
      value,
    });
    await reload();
  };

  const toggleActions: RowAction<ParameterRow>[] = [
    {
      id: 'disable',
      label: 'Desactivar',
      hidden: (r) => {
        const value = (r.value ?? {}) as Record<string, unknown>;
        return !('enabled' in value) || !Boolean(value.enabled);
      },
      onAction: (r) => { void toggle(r, false); },
    },
    {
      id: 'enable',
      label: 'Activar',
      hidden: (r) => {
        const value = (r.value ?? {}) as Record<string, unknown>;
        return !('enabled' in value) || Boolean(value.enabled);
      },
      onAction: (r) => { void toggle(r, true); },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Parámetros de inventario"
        subtitle="Lote, serie, negativo, FIFO/LIFO y valoración"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />

      <PageSection title="Parámetros">
        <SimpleRecordsTable
          gridId="eims-parameters"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={toggleActions}
          emptyMessage="Sin parámetros"
        />
      </PageSection>
    </PageLayout>
  );
}
