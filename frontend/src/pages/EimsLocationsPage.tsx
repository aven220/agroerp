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
import { listEimsLocations, listEimsWarehouses, upsertEimsLocation } from '../api/eims';

type LocationRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<LocationRow>[] = [
  { key: 'locationKey', label: 'Clave', getValue: (r) => String(r.locationKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'locationType', label: 'Tipo', getValue: (r) => String(r.locationType ?? '') },
  { key: 'aisle', label: 'Pasillo', getValue: (r) => String(r.aisle ?? '—') },
  { key: 'shelf', label: 'Estante', getValue: (r) => String(r.shelf ?? '—') },
  { key: 'level', label: 'Nivel', getValue: (r) => String(r.level ?? '—') },
  { key: 'position', label: 'Posición', getValue: (r) => String(r.position ?? '—') },
  { key: 'qrCode', label: 'QR', getValue: (r) => String(r.qrCode ?? '—') },
];

export function EimsLocationsPage() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    warehouseKey: 'WH-MAIN',
    name: '',
    locationType: 'position',
    aisle: '',
    shelf: '',
    level: '',
    position: '',
  });

  const reload = () =>
    listEimsLocations(form.warehouseKey || undefined).then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'locationKey'))),
    );
  useEffect(() => {
    listEimsWarehouses().then((r) => setWarehouses(r as Array<Record<string, unknown>>));
    reload();
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Ubicaciones"
        subtitle="Pasillos, estanterías, niveles y posiciones"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />

      <PageSection title="Registrar ubicación">
        <div className="form-grid">
          <FieldGroup label="Bodega">
            <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
              {warehouses.map((w) => (
                <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Tipo">
            <select value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value })}>
              <option value="internal">Interna</option>
              <option value="aisle">Pasillo</option>
              <option value="shelf">Estantería</option>
              <option value="level">Nivel</option>
              <option value="position">Posición</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Pasillo">
            <input placeholder="Pasillo" value={form.aisle} onChange={(e) => setForm({ ...form, aisle: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Estantería">
            <input placeholder="Estantería" value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nivel">
            <input placeholder="Nivel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Posición">
            <input placeholder="Posición" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => upsertEimsLocation(form).then(reload)}>Guardar ubicación</button>
          <button className="btn" onClick={reload}>Consultar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Ubicaciones registradas">
        <SimpleRecordsTable
          gridId="eims-locations"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin ubicaciones"
        />
      </PageSection>
    </PageLayout>
  );
}
