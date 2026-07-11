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
  TableToolbar,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  compareEimsValuationMethods,
  getEimsCostHistory,
  getEimsFinancialReport,
  getEimsInventoryValue,
  listEimsItems,
  listEimsKardex,
  listEimsWarehouses,
} from '../api/eims';

type KardexRow = Record<string, unknown> & { id: string };
type CostRow = Record<string, unknown> & { id: string };

const kardexColumns: SimpleColumn<KardexRow>[] = [
  {
    key: 'postedAt',
    label: 'Fecha',
    getValue: (r) => (r.postedAt ? new Date(String(r.postedAt)).toLocaleString() : '—'),
  },
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
  { key: 'movementType', label: 'Movimiento', getValue: (r) => String(r.movementType ?? '') },
  { key: 'previousBalanceQty', label: 'Saldo ant.', getValue: (r) => String(r.previousBalanceQty ?? '') },
  { key: 'entryQty', label: 'Entrada', getValue: (r) => String(r.entryQty ?? '') },
  { key: 'exitQty', label: 'Salida', getValue: (r) => String(r.exitQty ?? '') },
  { key: 'balanceQty', label: 'Saldo', getValue: (r) => String(r.balanceQty ?? '') },
  { key: 'unitCost', label: 'Costo unit.', getValue: (r) => Number(r.unitCost ?? 0).toLocaleString() },
  { key: 'totalCost', label: 'Costo total', getValue: (r) => Number(r.totalCost ?? 0).toLocaleString() },
  { key: 'balanceCost', label: 'Saldo $', getValue: (r) => Number(r.balanceCost ?? 0).toLocaleString() },
  { key: 'valuationMethod', label: 'Método', getValue: (r) => String(r.valuationMethod ?? '') },
  { key: 'documentKey', label: 'Documento', getValue: (r) => String(r.documentKey ?? '—') },
  { key: 'postedBy', label: 'Usuario', getValue: (r) => String(r.postedBy ?? '—') },
];

const costColumns: SimpleColumn<CostRow>[] = [
  {
    key: 'itemKey',
    label: 'Artículo',
    getValue: (r) => String((r.item as Record<string, unknown>)?.itemKey ?? ''),
  },
  { key: 'eventType', label: 'Evento', getValue: (r) => String(r.eventType ?? '') },
  { key: 'valuationMethod', label: 'Método', getValue: (r) => String(r.valuationMethod ?? '') },
  { key: 'previousUnitCost', label: 'Unit. ant.', getValue: (r) => Number(r.previousUnitCost ?? 0).toLocaleString() },
  { key: 'newUnitCost', label: 'Unit. nuevo', getValue: (r) => Number(r.newUnitCost ?? 0).toLocaleString() },
  { key: 'newAverageCost', label: 'Prom. nuevo', getValue: (r) => Number(r.newAverageCost ?? 0).toLocaleString() },
  { key: 'transportCost', label: 'Transporte', getValue: (r) => Number(r.transportCost ?? 0).toLocaleString() },
  { key: 'storageCost', label: 'Almacenamiento', getValue: (r) => Number(r.storageCost ?? 0).toLocaleString() },
  { key: 'transformCost', label: 'Transformación', getValue: (r) => Number(r.transformCost ?? 0).toLocaleString() },
];

export function EimsKardexPage() {
  const [rows, setRows] = useState<KardexRow[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [value, setValue] = useState<Record<string, unknown> | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [itemKey, setItemKey] = useState('');
  const [warehouseKey, setWarehouseKey] = useState('');
  const [lotKey, setLotKey] = useState('');
  const [error, setError] = useState('');

  const reload = async () => {
    const [k, c, v, r, i, w] = await Promise.all([
      listEimsKardex({
        itemKey: itemKey || undefined,
        warehouseKey: warehouseKey || undefined,
        lotKey: lotKey || undefined,
      }),
      getEimsCostHistory(itemKey || undefined),
      getEimsInventoryValue(),
      getEimsFinancialReport(),
      listEimsItems(),
      listEimsWarehouses(),
    ]);
    setRows(
      (k as Array<Record<string, unknown>>).map((row, idx) =>
        withRowId({ ...row, _idx: idx }, 'id', 'movementKey', '_idx'),
      ),
    );
    setCosts(
      (c as Array<Record<string, unknown>>).map((row, idx) =>
        withRowId({ ...row, _idx: idx }, 'id', '_idx'),
      ),
    );
    setValue(v);
    setReport(r);
    setItems(i as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Centro de Kardex y valoración"
        subtitle="Saldo permanente, costos y comparación de métodos"
        actions={
          <PageActions>
            <Link to="/inventario/cierres" className="btn">Cierres</Link>
            <Link to="/inventario/movimientos" className="btn">Movimientos</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      {value ? (
        <PageSummary>
          <MetricCard label="Valor inventario" value={Number(value.total ?? 0).toLocaleString()} tone="green" />
          <MetricCard label="Artículos valorados" value={Object.keys((value.byItem as object) ?? {}).length} />
          <MetricCard label="Bodegas" value={Object.keys((value.byWarehouse as object) ?? {}).length} tone="blue" />
          <MetricCard label="Eventos de costo" value={costs.length} />
        </PageSummary>
      ) : null}

      <PageSection title="Consulta">
        <TableToolbar>
          <select value={itemKey} onChange={(e) => setItemKey(e.target.value)}>
            <option value="">Artículo...</option>
            {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
          </select>
          <select value={warehouseKey} onChange={(e) => setWarehouseKey(e.target.value)}>
            <option value="">Bodega...</option>
            {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
          </select>
          <input placeholder="Código de lote" value={lotKey} onChange={(e) => setLotKey(e.target.value)} />
        </TableToolbar>
        <FormActions sticky={false}>
          <button className="btn" onClick={() => reload()}>Consultar Kardex</button>
          <button
            className="btn"
            onClick={() =>
              compareEimsValuationMethods(
                itemKey || String(items[0]?.itemKey ?? ''),
                warehouseKey || String(warehouses[0]?.warehouseKey ?? ''),
              )
                .then(setCompare)
                .catch((e) => setError(e.message))
            }
          >
            Comparar métodos
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Kardex permanente">
        <SimpleRecordsTable
          gridId="eims-kardex"
          columns={kardexColumns}
          data={rows}
          selectable={false}
          emptyMessage="Sin movimientos"
          emptyDescription="Ajuste los filtros y consulte el kardex."
        />
      </PageSection>

      {compare ? (
        <PageSection title="Comparación de métodos de valoración">
          <pre className="code-block">{JSON.stringify(compare, null, 2)}</pre>
        </PageSection>
      ) : null}

      <PageSection title="Historial de costos">
        <SimpleRecordsTable
          gridId="eims-cost-history"
          columns={costColumns}
          data={costs}
          selectable={false}
          emptyMessage="Sin eventos de costo"
          emptyDescription="Los eventos de costo aparecerán tras movimientos valorados."
        />
      </PageSection>

      {report ? (
        <PageSection title="Reporte financiero">
          <p>Valor total: <strong>{Number(report.inventoryValue ?? 0).toLocaleString()}</strong></p>
          <pre className="code-block">{JSON.stringify({ byWarehouse: report.byWarehouse, byItem: report.byItem }, null, 2)}</pre>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
