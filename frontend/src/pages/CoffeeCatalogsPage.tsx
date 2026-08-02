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
import {
  deactivateCoffeeCatalog,
  listCoffeeCatalogKeys,
  listCoffeeCatalogs,
  upsertCoffeeCatalog,
} from '../api/coffee';
import { useAuth } from '../context/AuthContext';
import type { RowAction } from '../lib/data-grid/types';

type CatalogRow = Record<string, unknown> & { id: string };

export function CoffeeCatalogsPage() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission('coffee:catalog:manage') ||
    hasPermission('coffee:config:manage') ||
    hasPermission('coffee:admin');
  const [keys, setKeys] = useState<string[]>([]);
  const [catalogKey, setCatalogKey] = useState('coffee_type');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [entryKey, setEntryKey] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const reload = () =>
    listCoffeeCatalogs(catalogKey, true).then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'entryKey'))),
    );

  useEffect(() => {
    listCoffeeCatalogKeys().then(setKeys).catch(() => undefined);
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, [catalogKey]);

  function loadRow(row: CatalogRow) {
    setEntryKey(String(row.entryKey ?? ''));
    setName(String(row.name ?? ''));
    setEditing(true);
    setError('');
  }

  async function save() {
    if (!canManage) {
      setError('No tiene permiso para modificar catálogos (coffee:catalog:manage).');
      return;
    }
    setError('');
    try {
      await upsertCoffeeCatalog({
        catalogKey,
        entryKey,
        name,
        reason: editing ? 'Actualización desde UI' : 'Alta desde UI',
      });
      setEntryKey('');
      setName('');
      setEditing(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  async function deactivate(row: CatalogRow) {
    if (!canManage) return;
    if (!window.confirm(`¿Desactivar «${String(row.name)}» del catálogo?`)) return;
    try {
      await deactivateCoffeeCatalog(catalogKey, String(row.entryKey));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar');
    }
  }

  const rowActions: RowAction<CatalogRow>[] = canManage
    ? [
        { id: 'edit', label: 'Editar', onAction: loadRow },
        { id: 'deactivate', label: 'Desactivar', onAction: deactivate },
      ]
    : [];

  return (
    <PageLayout>
      <PageHeader
        title="Administrador de catálogos"
        subtitle="Tipos, variedades, defectos, pagos — crear, editar y desactivar"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <PageSection title="Catálogo">
        {!canManage ? (
          <p className="muted">Solo lectura: active coffee:catalog:manage en el rol para modificar.</p>
        ) : null}
        <PageToolbar>
          <FieldGroup label="Catálogo">
            <select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)}>
              {keys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Clave de entrada">
            <input
              placeholder="entryKey"
              value={entryKey}
              disabled={editing}
              onChange={(e) => setEntryKey(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          {editing ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(false);
                setEntryKey('');
                setName('');
              }}
            >
              Cancelar
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" disabled={!canManage} onClick={() => void save()}>
            {editing ? 'Guardar cambios' : 'Guardar'}
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-catalogs"
          selectable={false}
          data={rows}
          rowActions={rowActions}
          onRowClick={canManage ? loadRow : undefined}
          columns={[
            { key: 'entryKey', label: 'Key', getValue: (r) => String(r.entryKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            { key: 'code', label: 'Código', getValue: (r) => String(r.code ?? '—') },
            { key: 'isActive', label: 'Activo', getValue: (r) => (r.isActive ? 'Sí' : 'No') },
            { key: 'version', label: 'Versión', getValue: (r) => String(r.version) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
