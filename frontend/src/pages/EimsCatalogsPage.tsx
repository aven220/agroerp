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
import { listEimsCatalogKeys, listEimsCatalogs, upsertEimsCatalog } from '../api/eims';

type CatalogRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<CatalogRow>[] = [
  { key: 'entryKey', label: 'Clave', getValue: (r) => String(r.entryKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'code', label: 'Código', getValue: (r) => String(r.code ?? '—') },
  { key: 'parentKey', label: 'Padre', getValue: (r) => String(r.parentKey ?? '—') },
  { key: 'isActive', label: 'Activo', getValue: (r) => (r.isActive ? 'Sí' : 'No') },
];

export function EimsCatalogsPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [catalogKey, setCatalogKey] = useState('item_type');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [form, setForm] = useState({ entryKey: '', name: '', code: '' });

  const reload = () =>
    listEimsCatalogs(catalogKey, true).then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'entryKey'))),
    );
  useEffect(() => {
    listEimsCatalogKeys().then(setKeys);
  }, []);
  useEffect(() => { reload(); }, [catalogKey]);

  return (
    <PageLayout>
      <PageHeader
        title="Catálogos de inventario"
        subtitle="Tipos, categorías, UOM, motivos y más"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />

      <PageSection title="Entrada de catálogo">
        <div className="form-grid">
          <FieldGroup label="Catálogo">
            <select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)}>
              {keys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Código de catálogo">
            <input placeholder="Código de catálogo" value={form.entryKey} onChange={(e) => setForm({ ...form, entryKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Código">
            <input placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => upsertEimsCatalog({ catalogKey, ...form }).then(reload)}>Guardar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Entradas">
        <SimpleRecordsTable
          gridId="eims-catalogs"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin entradas"
        />
      </PageSection>
    </PageLayout>
  );
}
