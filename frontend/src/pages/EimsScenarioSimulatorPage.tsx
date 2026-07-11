import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import {
  createEimsScenario,
  listEimsScenarios,
  simulateEimsScenario,
} from '../api/eims';

type ScenarioRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ScenarioRow>[] = [
  { key: 'name', label: 'Escenario', getValue: (r) => String(r.name ?? '') },
  { key: 'status', label: 'Estado', getValue: (r) => String(r.status ?? '') },
  {
    key: 'horizonDays',
    label: 'Horizonte',
    getValue: (r) => `${String(r.horizonDays ?? '')} d`,
  },
  {
    key: 'stockouts',
    label: 'Agotamientos',
    getValue: (r) => String(((r.results as Record<string, unknown>) ?? {}).stockouts ?? '—'),
  },
  {
    key: 'purchaseNeed',
    label: 'Compra proyectada',
    getValue: (r) =>
      Number(((r.results as Record<string, unknown>) ?? {}).purchaseNeed ?? 0).toLocaleString(),
  },
];

export function EimsScenarioSimulatorPage() {
  const [rows, setRows] = useState<ScenarioRow[]>([]);
  const [name, setName] = useState('Escenario base');
  const [demandMultiplier, setDemandMultiplier] = useState('1');
  const [error, setError] = useState('');

  const reload = async () => {
    setRows(
      ((await listEimsScenarios()) as Array<Record<string, unknown>>).map((row) =>
        withRowId(row, 'id', 'scenarioKey'),
      ),
    );
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const createAndSimulate = async () => {
    const created = (await createEimsScenario({
      name,
      horizonDays: 90,
      parameters: { demandMultiplier: Number(demandMultiplier) || 1 },
    })) as Record<string, unknown>;
    await simulateEimsScenario(String(created.scenarioKey));
    await reload();
  };

  return (
    <PageLayout>
      <PageHeader
        title="Simulador de escenarios"
        subtitle="Demanda, agotamientos y necesidad de compra"
        actions={
          <PageActions>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Nuevo escenario">
        <div className="form-grid">
          <FieldGroup label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre escenario" />
          </FieldGroup>
          <FieldGroup label="Multiplicador demanda">
            <input
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(e.target.value)}
              placeholder="Multiplicador demanda"
            />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn btn-primary"
            onClick={() => createAndSimulate().catch((e) => setError(e.message))}
          >
            Crear y simular
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Escenarios">
        <SimpleRecordsTable
          gridId="eims-scenarios"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin escenarios"
        />
      </PageSection>
    </PageLayout>
  );
}
