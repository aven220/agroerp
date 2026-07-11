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
import { listCoffeeParameters, upsertCoffeeParameter } from '../api/coffee';

export function CoffeeParametersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [parameterKey, setParameterKey] = useState('humidity_ranges');
  const [name, setName] = useState('Rangos de humedad');
  const [valueJson, setValueJson] = useState('{"min":10,"max":12.5}');

  const reload = () => listCoffeeParameters().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const data = rows.map((r) => withRowId(r, 'id', 'parameterKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Administrador de parámetros"
        subtitle="Bonos, castigos, rangos, límites"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      <PageSection title="Nuevo parámetro">
        <PageToolbar>
          <FieldGroup label="Clave">
            <input value={parameterKey} onChange={(e) => setParameterKey(e.target.value)} placeholder="Nombre del parámetro" />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          </FieldGroup>
        </PageToolbar>
        <FieldGroup label="Valor (JSON)">
          <textarea className="form-control" value={valueJson} onChange={(e) => setValueJson(e.target.value)} rows={4} />
        </FieldGroup>
        <FormActions>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => upsertCoffeeParameter({ parameterKey, name, value: JSON.parse(valueJson), reason: 'UI update' }).then(reload)}
          >
            Guardar parámetro
          </button>
        </FormActions>
      </PageSection>
      <PageSection title="Parámetros">
        <SimpleRecordsTable
          gridId="coffee-parameters"
          selectable={false}
          data={data}
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
