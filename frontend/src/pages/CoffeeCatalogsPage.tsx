import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { listCoffeeCatalogKeys, listCoffeeCatalogs, upsertCoffeeCatalog } from '../api/coffee';

export function CoffeeCatalogsPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [catalogKey, setCatalogKey] = useState('coffee_type');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [entryKey, setEntryKey] = useState('');
  const [name, setName] = useState('');

  const reload = () => listCoffeeCatalogs(catalogKey, true).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    listCoffeeCatalogKeys().then(setKeys);
  }, []);
  useEffect(() => { reload(); }, [catalogKey]);

  const data = rows.map((r) => withRowId(r, 'id', 'entryKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Administrador de catálogos"
        subtitle="Tipos, variedades, defectos, pagos..."
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      <PageSection title="Catálogo">
        <PageToolbar>
          <FieldGroup label="Catálogo">
            <select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)}>
              {keys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Clave de entrada">
            <input placeholder="entryKey" value={entryKey} onChange={(e) => setEntryKey(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => upsertCoffeeCatalog({ catalogKey, entryKey, name, reason: 'UI update' }).then(() => { setEntryKey(''); setName(''); reload(); })}
          >
            Guardar
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-catalogs"
          selectable={false}
          data={data}
          columns={[
            { key: 'entryKey', label: 'Key', getValue: (r) => String(r.entryKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            { key: 'code', label: 'Código', getValue: (r) => String(r.code ?? '—') },
            { key: 'isActive', label: 'Activo', getValue: (r) => String(r.isActive) },
            { key: 'version', label: 'Versión', getValue: (r) => String(r.version) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
