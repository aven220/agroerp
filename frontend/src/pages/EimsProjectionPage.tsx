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
import { getEimsSupplyProjection } from '../api/eims';

type ProjectionRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ProjectionRow>[] = [
  { key: 'itemName', label: 'Artículo', getValue: (r) => String(r.itemName ?? r.itemKey ?? '') },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => String(r.warehouseKey ?? '') },
  { key: 'availableQty', label: 'Disponible', getValue: (r) => String(r.availableQty ?? '') },
  { key: 'dailyDemand', label: 'Demanda/día', getValue: (r) => String(r.dailyDemand ?? '') },
  { key: 'stockoutInDays', label: 'Agotamiento (d)', getValue: (r) => String(r.stockoutInDays ?? '') },
  { key: 'rotationRate', label: 'Rotación', getValue: (r) => String(r.rotationRate ?? '') },
  { key: 'projectedQtyEnd', label: 'Proy. fin', getValue: (r) => String(r.projectedQtyEnd ?? '') },
  {
    key: 'value',
    label: 'Valor',
    getValue: (r) => Number(r.value ?? 0).toLocaleString(),
  },
];

export function EimsProjectionPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [horizon, setHorizon] = useState('90');
  const [error, setError] = useState('');

  const reload = async () => {
    setData(await getEimsSupplyProjection(Number(horizon) || 90));
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, [horizon]);

  const lines = ((data?.lines as Array<Record<string, unknown>>) ?? []).map((row, idx) =>
    withRowId({ ...row, _idx: idx }, 'itemKey', '_idx'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Proyección de inventario"
        subtitle="Agotamiento, rotación y valor proyectado"
        actions={
          <PageActions>
            <input
              className="input-compact"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              aria-label="Horizonte en días"
            />
            <span>días</span>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      {data ? (
        <PageSummary>
          <MetricCard label="Valor total" value={Number(data.totalValue ?? 0).toLocaleString()} />
          <MetricCard label="Horizonte" value={`${String(data.horizonDays)} d`} />
        </PageSummary>
      ) : null}

      <PageSection title="Líneas de proyección">
        <SimpleRecordsTable
          gridId="eims-projection"
          columns={columns}
          data={lines}
          selectable={false}
          emptyMessage="Sin proyección"
        />
      </PageSection>
    </PageLayout>
  );
}
