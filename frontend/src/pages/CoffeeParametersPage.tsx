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
  deactivateCoffeeParameter,
  listCoffeeParameters,
  upsertCoffeeParameter,
} from '../api/coffee';
import { useAuth } from '../context/AuthContext';
import type { RowAction } from '../lib/data-grid/types';

type ParamRow = Record<string, unknown> & { id: string };

export function CoffeeParametersPage() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission('coffee:config:manage') || hasPermission('coffee:admin');
  const [rows, setRows] = useState<ParamRow[]>([]);
  const [parameterKey, setParameterKey] = useState('humidity_ranges');
  const [name, setName] = useState('Rangos de humedad');
  const [valueJson, setValueJson] = useState('{"min":10,"max":12.5}');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const reload = () =>
    listCoffeeParameters().then((r) =>
      setRows((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'parameterKey'))),
    );

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, []);

  function loadRow(row: ParamRow) {
    setParameterKey(String(row.parameterKey ?? ''));
    setName(String(row.name ?? ''));
    setValueJson(JSON.stringify(row.value ?? {}, null, 2));
    setEditingId(String(row.id));
    setError('');
    setSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    if (!canManage) {
      setError('No tiene permiso para modificar parámetros (coffee:config:manage).');
      return;
    }
    setError('');
    try {
      const value = JSON.parse(valueJson) as unknown;
      await upsertCoffeeParameter({
        parameterKey,
        name,
        value,
        reason: editingId ? 'Actualización desde UI' : 'Alta desde UI',
      });
      setSaved(true);
      setEditingId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar (revise el JSON)');
    }
  }

  async function deactivate(row: ParamRow) {
    if (!canManage) return;
    if (!window.confirm(`¿Desactivar el parámetro «${String(row.name)}»?`)) return;
    setError('');
    try {
      await deactivateCoffeeParameter(String(row.id));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar');
    }
  }

  const rowActions: RowAction<ParamRow>[] = canManage
    ? [
        { id: 'edit', label: 'Editar', onAction: loadRow },
        { id: 'deactivate', label: 'Desactivar', onAction: deactivate },
      ]
    : [];

  return (
    <PageLayout>
      <PageHeader
        title="Administrador de parámetros"
        subtitle="Bonos, castigos, rangos y límites — crear, editar y desactivar"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {saved ? <div className="alert alert-success">Parámetro guardado.</div> : null}

      <PageSection title={editingId ? 'Editar parámetro' : 'Nuevo parámetro'}>
        {!canManage ? (
          <p className="muted">Solo lectura: active coffee:config:manage en el rol para modificar.</p>
        ) : null}
        <PageToolbar>
          <FieldGroup label="Clave">
            <input
              value={parameterKey}
              onChange={(e) => setParameterKey(e.target.value)}
              placeholder="Nombre del parámetro"
              disabled={Boolean(editingId)}
            />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          </FieldGroup>
        </PageToolbar>
        <FieldGroup label="Valor (JSON)">
          <textarea
            className="form-control"
            value={valueJson}
            onChange={(e) => setValueJson(e.target.value)}
            rows={4}
          />
        </FieldGroup>
        <FormActions>
          {editingId ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingId(null);
                setParameterKey('humidity_ranges');
                setName('Rangos de humedad');
                setValueJson('{"min":10,"max":12.5}');
              }}
            >
              Cancelar
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" disabled={!canManage} onClick={() => void save()}>
            {editingId ? 'Guardar cambios' : 'Guardar parámetro'}
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Parámetros">
        <SimpleRecordsTable
          gridId="coffee-parameters"
          selectable={false}
          data={rows}
          rowActions={rowActions}
          onRowClick={canManage ? loadRow : undefined}
          columns={[
            { key: 'parameterKey', label: 'Key', getValue: (r) => String(r.parameterKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            {
              key: 'scope',
              label: 'Scope',
              getValue: (r) => `${String(r.scopeType)}:${String(r.scopeRef || 'org')}`,
            },
            { key: 'version', label: 'Versión', getValue: (r) => String(r.version) },
            {
              key: 'value',
              label: 'Valor',
              render: (r) => <code>{JSON.stringify(r.value)}</code>,
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
