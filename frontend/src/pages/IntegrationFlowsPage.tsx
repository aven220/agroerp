import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createEihFlow, listEihFlows, publishEihFlow, type EihFlow } from '../api/integration';

export function IntegrationFlowsPage() {
  const [flows, setFlows] = useState<EihFlow[]>([]);
  const reload = () => listEihFlows().then(setFlows);
  useEffect(() => { reload(); }, []);

  const handleCreate = async () => {
    const key = `flow-${Date.now()}`;
    await createEihFlow({
      flowKey: key,
      name: `Flujo ${key}`,
      syncMode: 'scheduled',
      sourceConnectorKey: flows.length ? undefined : undefined,
    });
    reload();
  };

  return (
    <>
      <Header
        title="Diseñador de flujos"
        subtitle="Orquestación y transformación de integraciones"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={handleCreate}>Nuevo flujo</button>
            <Link to="/integraciones" className="btn">Centro</Link>
          </div>
        }
      />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Estado</th><th>Modo sync</th><th>Pasos</th><th></th></tr></thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.id}>
                <td>{f.flowKey}</td>
                <td>{f.name}</td>
                <td>{f.status}</td>
                <td>{f.syncMode}</td>
                <td>{f.steps?.length ?? 0}</td>
                <td>
                  {f.status === 'draft' && (
                    <button type="button" className="btn btn-sm" onClick={() => publishEihFlow(f.flowKey).then(reload)}>
                      Publicar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
