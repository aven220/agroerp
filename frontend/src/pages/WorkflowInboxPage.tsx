import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ux/LoadingState';
import {
  executeWorkflowTransition,
  getWorkflowInbox,
  type WorkflowAssignment,
} from '../api/workflows';

export function WorkflowInboxPage() {
  const [items, setItems] = useState<WorkflowAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getWorkflowInbox());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTransition(assignment: WorkflowAssignment, transitionKey: string) {
    if (!assignment.instance?.id) return;
    setActing(assignment.id);
    try {
      await executeWorkflowTransition(assignment.instance.id, {
        transitionKey,
        comment: comment || undefined,
      });
      setComment('');
      load();
    } finally {
      setActing(null);
    }
  }

  return (
    <>
      <Header
        title="Bandeja de tareas"
        subtitle="Aprobaciones y tareas humanas pendientes"
        actions={
          <div className="row-actions">
            <Link to="/procesos" className="btn">Procesos</Link>
            <Link to="/procesos/instancias" className="btn">Instancias</Link>
            <button type="button" className="btn" onClick={load}>Actualizar</button>
          </div>
        }
      />

      {loading ? (
        <LoadingState variant="table" message="Cargando bandeja..." />
      ) : items.length === 0 ? (
        <EmptyState
          illustration="inbox"
          title="No hay tareas pendientes"
          description="Cuando un proceso requiera su aprobación, aparecerá aquí."
          hint="Revise procesos activos o consulte instancias en curso."
          action={{ label: 'Ver procesos', to: '/procesos' }}
          secondaryAction={{ label: 'Ver instancias', to: '/procesos/instancias' }}
        />
      ) : (
        <div className="inbox-list">
          {items.map((task) => (
            <article key={task.id} className="inbox-card panel">
              <header>
                <strong>{task.instance?.workflowDefinition?.name ?? 'Proceso'}</strong>
                <span className={`badge badge-${task.status}`}>{task.status}</span>
              </header>
              <p>Estado: <code>{task.stateKey}</code></p>
              {task.transitionKey && <p>Transición: <code>{task.transitionKey}</code></p>}
              {task.dueAt && (
                <p className={new Date(task.dueAt) < new Date() ? 'text-danger' : ''}>
                  Vence: {new Date(task.dueAt).toLocaleString()}
                </p>
              )}
              <textarea
                placeholder="Comentario (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <div className="row-actions">
                {task.transitionKey && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={acting === task.id}
                    onClick={() => handleTransition(task, task.transitionKey!)}
                  >
                    {acting === task.id ? 'Ejecutando...' : `Ejecutar: ${task.transitionKey}`}
                  </button>
                )}
                <Link to={`/procesos/instancias`} className="btn btn-sm">Ver instancia</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
