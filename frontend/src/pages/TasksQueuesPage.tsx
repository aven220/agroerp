import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createEsdjeQueue, listEsdjeQueues, type EsdjeQueue } from '../api/scheduler';

export function TasksQueuesPage() {
  const [queues, setQueues] = useState<EsdjeQueue[]>([]);
  const [form, setForm] = useState({ queueKey: '', name: '', moduleKey: 'core', priority: 'normal' });

  const reload = () => listEsdjeQueues().then(setQueues);
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!form.queueKey || !form.name) return;
    await createEsdjeQueue(form);
    setForm({ queueKey: '', name: '', moduleKey: 'core', priority: 'normal' });
    reload();
  };

  return (
    <>
      <Header
        title="Administrador de colas"
        subtitle="Prioridad, módulo y concurrencia"
        actions={<Link to="/tareas" className="btn">Centro</Link>}
      />
      <section className="panel">
        <div className="form-row">
          <input placeholder="Clave cola" value={form.queueKey} onChange={(e) => setForm({ ...form, queueKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Módulo" value={form.moduleKey} onChange={(e) => setForm({ ...form, moduleKey: e.target.value })} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baja</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={create}>Crear cola</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Clave</th><th>Nombre</th><th>Módulo</th><th>Prioridad</th><th>Tareas</th><th>Concurrencia</th></tr>
          </thead>
          <tbody>
            {queues.map((q) => (
              <tr key={q.id}>
                <td>{q.queueKey}</td>
                <td>{q.name}</td>
                <td>{q.moduleKey}</td>
                <td>{q.priority}</td>
                <td>{q._count?.jobs ?? 0}</td>
                <td>{q.maxConcurrency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
