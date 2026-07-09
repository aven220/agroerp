import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ux/LoadingState';
import { useAuth } from '../context/AuthContext';
import {
  labelWorkflowStatus,
  labelWorkflowTransition,
} from '../lib/userLabels';
import { labelWorkflowStep } from '../lib/humanizeCopy';
import {
  executeWorkflowTransition,
  getWorkflowInbox,
  type WorkflowAssignment,
} from '../api/workflows';

export function WorkflowInboxPage() {
  const { hasPermission } = useAuth();
  const canExecute = hasPermission('workflow:execute');
  const [items, setItems] = useState<WorkflowAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [lastCompleted, setLastCompleted] = useState<{
    workflowName: string;
    remaining: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getWorkflowInbox());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la bandeja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTransition(assignment: WorkflowAssignment, transitionKey: string) {
    if (!assignment.instance?.id) return;
    const actionLabel = labelWorkflowTransition(transitionKey);
    if (!confirm(`¿Confirma la acción «${actionLabel}» en este proceso?`)) return;
    setActing(assignment.id);
    setActionError(null);
    try {
      await executeWorkflowTransition(assignment.instance.id, {
        transitionKey,
        comment: comments[assignment.id]?.trim() || undefined,
      });
      const workflowName = assignment.instance?.workflowDefinition?.name ?? 'Proceso';
      setComments((prev) => {
        const next = { ...prev };
        delete next[assignment.id];
        return next;
      });
      const refreshed = await getWorkflowInbox();
      setItems(refreshed);
      setLastCompleted({
        workflowName,
        remaining: refreshed.length,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo completar la acción');
    } finally {
      setActing(null);
    }
  }

  return (
    <>
      <Header
        title="Bandeja de tareas"
        subtitle="Revise y responda las aprobaciones y tareas que requieren su intervención"
        actions={
          <div className="row-actions">
            <Link to="/procesos" className="btn">Procesos</Link>
            <Link to="/procesos/instancias" className="btn">Instancias</Link>
            <button type="button" className="btn" onClick={load}>Actualizar</button>
          </div>
        }
      />

      <FlowProgress flowId="workflow" currentStepId={items.length > 0 ? 'action' : 'inbox'} />

      {lastCompleted ? (
        <div className="flow-completion-banner">
          <p>
            <strong>«{lastCompleted.workflowName}»</strong> actualizado correctamente.
            {lastCompleted.remaining > 0
              ? ` Tiene ${lastCompleted.remaining} tarea${lastCompleted.remaining === 1 ? '' : 's'} pendiente${lastCompleted.remaining === 1 ? '' : 's'}.`
              : ' No quedan tareas pendientes en su bandeja.'}
          </p>
          <div className="row-actions">
            {lastCompleted.remaining > 0 ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setLastCompleted(null)}>
                Siguiente tarea
              </button>
            ) : (
              <Link to="/procesos/instancias" className="btn btn-sm btn-primary">
                Ver instancias
              </Link>
            )}
            <button type="button" className="btn btn-sm" onClick={() => setLastCompleted(null)}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <FlowNextActions
          title="Acciones rápidas"
          actions={[
            {
              label: 'Ver detalle del proceso',
              description: items[0].instance?.id
                ? `Instancia de «${items[0].instance?.workflowDefinition?.name ?? 'proceso'}»`
                : 'Consulte el historial completo',
              to: items[0].instance?.id
                ? `/procesos/instancias?id=${items[0].instance.id}`
                : '/procesos/instancias',
              icon: '🔍',
            },
            {
              label: 'Ver todas las instancias',
              description: 'Seguimiento de procesos en curso',
              to: '/procesos/instancias',
              icon: '📋',
            },
          ]}
        />
      ) : null}

      <p className="muted page-help">
        Cada tarjeta representa una tarea pendiente. Agregue un comentario si el proceso lo requiere y confirme la acción sugerida.
      </p>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {actionError ? <div className="alert alert-error">{actionError}</div> : null}

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
          {items.map((task) => {
            const transitionLabel = task.transitionKey
              ? labelWorkflowTransition(task.transitionKey)
              : null;
            const instanceId = task.instance?.id;

            return (
              <article key={task.id} className="inbox-card panel">
                <header>
                  <strong>{task.instance?.workflowDefinition?.name ?? 'Proceso'}</strong>
                  <span className={`badge badge-${task.status}`}>
                    {labelWorkflowStatus(task.status)}
                  </span>
                </header>
                <p>Paso actual: <strong>{labelWorkflowStep(task.stateKey)}</strong></p>
                {transitionLabel ? <p>Acción sugerida: <strong>{transitionLabel}</strong></p> : null}
                {task.dueAt && (
                  <p className={new Date(task.dueAt) < new Date() ? 'text-danger' : ''}>
                    Vence: {new Date(task.dueAt).toLocaleString('es-CO')}
                  </p>
                )}
                <textarea
                  placeholder="Comentario (opcional — algunos procesos lo exigen)"
                  value={comments[task.id] ?? ''}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [task.id]: e.target.value }))
                  }
                  rows={2}
                />
                <div className="row-actions">
                  {task.transitionKey && canExecute ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={acting === task.id}
                      onClick={() => handleTransition(task, task.transitionKey!)}
                    >
                      {acting === task.id ? 'Procesando…' : transitionLabel ?? 'Ejecutar acción'}
                    </button>
                  ) : null}
                  {instanceId ? (
                    <Link to={`/procesos/instancias?id=${instanceId}`} className="btn btn-sm">
                      Ver detalle del proceso
                    </Link>
                  ) : (
                    <Link to="/procesos/instancias" className="btn btn-sm">Ver instancias</Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
