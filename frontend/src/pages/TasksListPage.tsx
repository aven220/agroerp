import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  cancelEsdjeJob,
  createEsdjeJob,
  listEsdjeJobs,
  pauseEsdjeJob,
  resumeEsdjeJob,
  runEsdjeJob,
  type EsdjeJob,
} from '../api/scheduler';

export function TasksListPage() {
  const [jobs, setJobs] = useState<EsdjeJob[]>([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ jobKey: '', name: '', handlerType: 'module.generic', jobType: 'scheduled' });

  const reload = () => listEsdjeJobs(status || undefined).then(setJobs);
  useEffect(() => { reload(); }, [status]);

  const create = async () => {
    if (!form.jobKey || !form.name) return;
    await createEsdjeJob({
      ...form,
      cronExpression: '0 */6 * * *',
      payload: {},
    });
    setForm({ jobKey: '', name: '', handlerType: 'module.generic', jobType: 'scheduled' });
    reload();
  };

  return (
    <>
      <Header
        title="Administrador de tareas"
        subtitle="Tareas automáticas programadas en el sistema"
        actions={
          <div className="row-actions">
            <Link to="/tareas" className="btn">Centro</Link>
            <Link to="/tareas/colas" className="btn">Colas</Link>
            <Link to="/tareas/calendario" className="btn">Calendario</Link>
          </div>
        }
      />
      <section className="panel">
        <div className="form-row">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="queued">En cola</option>
            <option value="running">Ejecutando</option>
            <option value="paused">Pausada</option>
            <option value="completed">Completada</option>
          </select>
        </div>
        <div className="form-row">
          <input placeholder="Código de tarea" value={form.jobKey} onChange={(e) => setForm({ ...form, jobKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.handlerType} onChange={(e) => setForm({ ...form, handlerType: e.target.value })}>
            <option value="module.generic">Genérico</option>
            <option value="sync.pull">Sync</option>
            <option value="notification.send">Notificación</option>
            <option value="workflow.trigger">Workflow</option>
            <option value="bre.evaluate">Reglas</option>
            <option value="ai.invoke">IA</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={create}>Crear tarea</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Handler</th><th>Estado</th><th>Próxima</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.jobKey}</td>
                <td>{j.name}</td>
                <td>{j.jobType}</td>
                <td>{j.handlerType}</td>
                <td>{j.status}</td>
                <td>{j.nextRunAt ? new Date(j.nextRunAt).toLocaleString() : '—'}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => runEsdjeJob(j.id).then(reload)}>Ejecutar</button>
                  {j.status === 'paused'
                    ? <button type="button" className="btn btn-sm" onClick={() => resumeEsdjeJob(j.id).then(reload)}>Reanudar</button>
                    : <button type="button" className="btn btn-sm" onClick={() => pauseEsdjeJob(j.id).then(reload)}>Pausar</button>}
                  <button type="button" className="btn btn-sm" onClick={() => cancelEsdjeJob(j.id).then(reload)}>Cancelar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
