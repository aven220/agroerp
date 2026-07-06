import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEsdjeCalendar, type EsdjeJob } from '../api/scheduler';

export function TasksCalendarPage() {
  const [items, setItems] = useState<EsdjeJob[]>([]);
  useEffect(() => { listEsdjeCalendar().then(setItems); }, []);

  return (
    <>
      <Header
        title="Calendario de tareas"
        subtitle="Programación, cron y próximas ejecuciones"
        actions={<Link to="/tareas" className="btn">Centro</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Tarea</th><th>Tipo</th><th>Cron</th><th>Zona</th><th>Próxima ejecución</th><th>Prioridad</th></tr>
          </thead>
          <tbody>
            {items.map((j) => (
              <tr key={j.id}>
                <td><strong>{j.name}</strong><br /><small>{j.jobKey}</small></td>
                <td>{j.jobType}</td>
                <td>{j.cronExpression ?? '—'}</td>
                <td>{j.timezone}</td>
                <td>{j.nextRunAt ? new Date(j.nextRunAt).toLocaleString() : j.runAt ? new Date(j.runAt).toLocaleString() : '—'}</td>
                <td>{j.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
