import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  createEimsScenario,
  listEimsScenarios,
  simulateEimsScenario,
} from '../api/eims';

export function EimsScenarioSimulatorPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Escenario base');
  const [demandMultiplier, setDemandMultiplier] = useState('1');
  const [error, setError] = useState('');

  const reload = async () => {
    setRows((await listEimsScenarios()) as Array<Record<string, unknown>>);
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
    <>
      <Header
        title="Simulador de escenarios"
        subtitle="Demanda, agotamientos y necesidad de compra"
        actions={<Link to="/inventario/planificador" className="btn">Planificador</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <div className="form-grid">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre escenario" />
          <input value={demandMultiplier} onChange={(e) => setDemandMultiplier(e.target.value)} placeholder="Multiplicador demanda" />
          <button className="btn btn-primary" onClick={() => createAndSimulate().catch((e) => setError(e.message))}>
            Crear y simular
          </button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Escenario</th><th>Estado</th><th>Horizonte</th><th>Agotamientos</th><th>Compra proyectada</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const results = (r.results as Record<string, unknown>) ?? {};
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.name)}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(r.horizonDays)} d</td>
                  <td>{String(results.stockouts ?? '—')}</td>
                  <td>{Number(results.purchaseNeed ?? 0).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
