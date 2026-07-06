import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEsdjeWorkers, type EsdjeWorker } from '../api/scheduler';

export function TasksWorkersPage() {
  const [workers, setWorkers] = useState<EsdjeWorker[]>([]);
  useEffect(() => { listEsdjeWorkers().then(setWorkers); }, []);

  return (
    <>
      <Header
        title="Panel de workers"
        subtitle="Pool distribuido y balanceo de carga"
        actions={<Link to="/tareas" className="btn">Centro</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Worker</th><th>Nodo</th><th>Host</th><th>Estado</th><th>Carga</th><th>Módulos</th><th>Último heartbeat</th></tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td>{w.workerKey}</td>
                <td>{w.nodeId}</td>
                <td>{w.hostname ?? '—'}</td>
                <td>{w.status}</td>
                <td>{w.currentLoad}/{w.capacity}</td>
                <td>{w.modules.join(', ')}</td>
                <td>{new Date(w.lastHeartbeat).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
