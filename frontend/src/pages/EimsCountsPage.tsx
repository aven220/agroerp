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
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  getEimsCountsCenter,
  listEimsCounts,
  listEimsItems,
  listEimsWarehouses,
  planEimsCount,
  startEimsCount,
} from '../api/eims';

type CountRow = Record<string, unknown> & { id: string };

export function EimsCountsPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<CountRow[]>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: 'Conteo físico',
    countType: 'warehouse',
    warehouseKey: '',
    itemKey: '',
    toleranceQtyPct: '0',
    approvalLevels: '1',
    requireSecondCount: true,
    assigneeId: '',
    assigneeName: '',
  });

  const reload = async () => {
    const [c, list, w, i] = await Promise.all([
      getEimsCountsCenter(),
      listEimsCounts(),
      listEimsWarehouses(),
      listEimsItems(),
    ]);
    setCenter(c);
    setRows((list as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'countKey')));
    setWarehouses(w as Array<Record<string, unknown>>);
    setItems(i as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const plan = async () => {
    await planEimsCount({
      name: form.name,
      countType: form.countType,
      warehouseKeys: form.warehouseKey ? [form.warehouseKey] : undefined,
      itemKeys: form.itemKey ? [form.itemKey] : undefined,
      toleranceQtyPct: Number(form.toleranceQtyPct) || 0,
      approvalLevels: Number(form.approvalLevels) || 1,
      requireSecondCount: form.requireSecondCount,
      scheduledStart: new Date().toISOString(),
      assignees: form.assigneeId
        ? [{ userId: form.assigneeId, userName: form.assigneeName || 'Responsable', roleKey: 'counter' }]
        : undefined,
    });
    await reload();
  };

  const columns: SimpleColumn<CountRow>[] = [
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
      key: 'captures',
      label: 'Capturas',
      getValue: (r) => String(((r._count as Record<string, number>) ?? {}).captures ?? 0),
    },
    {
      key: 'variances',
      label: 'Variaciones',
      getValue: (r) => String(((r._count as Record<string, number>) ?? {}).variances ?? 0),
    },
    {
      key: 'open',
      label: '',
      render: (r) => (
        <Link to={`/inventario/conteos/${encodeURIComponent(String(r.countKey))}`}>Abrir</Link>
      ),
      getValue: () => '',
    },
  ];

  const rowActions: RowAction<CountRow>[] = [
    {
      id: 'start',
      label: 'Iniciar',
      hidden: (r) => !['draft', 'scheduled'].includes(String(r.status)),
      onAction: (r) => {
        startEimsCount(String(r.countKey)).then(reload).catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Centro de conteos físicos"
        subtitle="Planificación, ejecución, conciliación y actas"
        actions={
          <PageActions>
            <Link to="/inventario/conteos/historial" className="btn">Historial</Link>
            <Link to="/inventario/conteos/actas" className="btn">Actas</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      {center ? (
        <PageSummary>
          <MetricCard label="Sesiones" value={String(center.sessionsCount ?? 0)} tone="green" />
          <MetricCard label="Abiertos" value={String(center.openCount ?? 0)} />
          <MetricCard label="Pend. aprobación" value={String(center.pendingApprovalCount ?? 0)} />
          <MetricCard label="Cerrados" value={String(center.closedCount ?? 0)} tone="blue" />
          <MetricCard label="Variaciones" value={String(center.openVariances ?? 0)} />
          <MetricCard label="Ajustes pend." value={String(center.pendingAdjustments ?? 0)} />
        </PageSummary>
      ) : null}

      <PageSection title="Programar conteo">
        <div className="form-grid">
          <FieldGroup label="Nombre">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Tipo">
            <select value={form.countType} onChange={(e) => setForm({ ...form, countType: e.target.value })}>
              <option value="general">general</option>
              <option value="cyclic">cyclic</option>
              <option value="partial">partial</option>
              <option value="warehouse">warehouse</option>
              <option value="location">location</option>
              <option value="category">category</option>
              <option value="lot">lot</option>
              <option value="item">item</option>
              <option value="extraordinary">extraordinary</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Bodega">
            <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
              <option value="">Bodega</option>
              {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Artículo">
            <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
              <option value="">Artículo</option>
              {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Tolerancia %">
            <input placeholder="Tolerancia %" value={form.toleranceQtyPct} onChange={(e) => setForm({ ...form, toleranceQtyPct: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Niveles aprobación">
            <input placeholder="Niveles aprobación" value={form.approvalLevels} onChange={(e) => setForm({ ...form, approvalLevels: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="User ID responsable">
            <input placeholder="User ID responsable" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nombre responsable">
            <input placeholder="Nombre responsable" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="2º conteo">
            <label>
              <input type="checkbox" checked={form.requireSecondCount} onChange={(e) => setForm({ ...form, requireSecondCount: e.target.checked })} />
              2º conteo
            </label>
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => plan().catch((e) => setError(e.message))}>Programar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Sesiones de conteo">
        <SimpleRecordsTable
          gridId="eims-counts"
          columns={columns}
          data={rows}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin conteos"
        />
      </PageSection>
    </PageLayout>
  );
}
