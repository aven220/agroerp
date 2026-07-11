import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import { listEimsWarehouses, upsertEimsWarehouse } from '../api/eims';

type WarehouseRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<WarehouseRow>[] = [
  { key: 'warehouseKey', label: 'Clave', getValue: (r) => String(r.warehouseKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'warehouseType', label: 'Tipo', getValue: (r) => String(r.warehouseType ?? '') },
  { key: 'municipality', label: 'Municipio', getValue: (r) => String(r.municipality ?? '—') },
  { key: 'responsibleName', label: 'Responsable', getValue: (r) => String(r.responsibleName ?? '—') },
  { key: 'isActive', label: 'Activa', getValue: (r) => (r.isActive ? 'Sí' : 'No') },
];

export function EimsWarehousesPage() {
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [form, setForm] = useState({
    warehouseKey: '',
    name: '',
    warehouseType: 'warehouse',
    municipality: '',
    responsibleName: '',
  });

  const reload = () =>
    listEimsWarehouses(true).then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'warehouseKey'))),
    );
  useEffect(() => { reload(); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Bodegas y centros"
        subtitle="Bodegas, acopios, silos, patios y cuartos fríos"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />

      <PageSection title="Registrar bodega">
        <div className="form-grid">
          <FieldGroup label="Código de bodega">
            <input placeholder="Código de bodega" value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Tipo">
            <select value={form.warehouseType} onChange={(e) => setForm({ ...form, warehouseType: e.target.value })}>
              <option value="warehouse">Bodega</option>
              <option value="distribution_center">Centro de distribución</option>
              <option value="collection_center">Centro de acopio</option>
              <option value="store">Almacén</option>
              <option value="silo">Silo</option>
              <option value="yard">Patio</option>
              <option value="cold_room">Cuarto frío</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Municipio">
            <input placeholder="Municipio" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Responsable">
            <input placeholder="Responsable" value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => upsertEimsWarehouse(form).then(reload)}>Guardar bodega</button>
        </FormActions>
      </PageSection>

      <PageSection title="Bodegas registradas">
        <SimpleRecordsTable
          gridId="eims-warehouses"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin bodegas"
        />
      </PageSection>
    </PageLayout>
  );
}
