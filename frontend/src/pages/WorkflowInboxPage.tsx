import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
} from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
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
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

export function WorkflowInboxPage() {
  const { hasPermission } = useAuth();
  const canExecute = hasPermission('workflow:execute');
  const canApprove = hasPermission('workflow:approve');
  const canAct = canExecute || canApprove;
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWorkflowInbox()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar la bandeja');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useOnEntityUpdated(load, 'workflow');

  async function handleTransition(assignment: WorkflowAssignment, transitionKey: string) {
    if (!assignment.instance?.id) return;
    const transition = assignment.availableTransitions?.find((t) => t.key === transitionKey);
    if (transition?.requirements?.comment && !comments[assignment.id]?.trim()) {
      setActionError('Este paso requiere un comentario antes de continuar.');
      return;
    }
    const actionLabel = labelWorkflowTransition(transitionKey);
    if (!confirm(`¿Confirma la acción «${actionLabel}» en este proceso?`)) return;
    setActing(assignment.id);
    setActionError(null);
    try {
      await executeWorkflowTransition(assignment.instance.id, {
        transitionKey,
        comment: comments[assignment.id]?.trim() || undefined,
      });
      const instance = assignment.instance;
      notifyEntityUpdated('workflow', instance.id);
      const ctx = (instance.context ?? {}) as Record<string, unknown>;
      if (instance.resourceType === 'producer' && instance.resourceId) {
        notifyEntityUpdated('producer', instance.resourceId);
      } else if (instance.resourceType === 'farm' && instance.resourceId) {
        notifyEntityUpdated('farm', instance.resourceId);
      } else if (instance.resourceType === 'field_lot' && instance.resourceId) {
        notifyEntityUpdated('lot', instance.resourceId);
      } else if (ctx.producerId) {
        notifyEntityUpdated('producer', String(ctx.producerId));
      } else if (ctx.farmId) {
        notifyEntityUpdated('farm', String(ctx.farmId));
      } else if (ctx.lotId) {
        notifyEntityUpdated('lot', String(ctx.lotId));
      }
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
      <PageHeader
        title="Bandeja de tareas"
        subtitle="Revise y responda las aprobaciones y tareas que requieren su intervención"
        actions={
          <PageActions>
            <Link to="/procesos" className="btn">Procesos</Link>
            <Link to="/procesos/instancias" className="btn">Solicitudes</Link>
            <button type="button" className="btn" onClick={load}>Actualizar</button>
          </PageActions>
        }
      />
      <PageLayout>
      <FlowProgress flowId="workflow" currentStepId={items.length > 0 ? 'action' : 'inbox'} />

      {lastCompleted ? (
        <div className="flow-completion-banner">
          <p>
            <strong>«{lastCompleted.workflowName}»</strong> actualizado correctamente.
            {lastCompleted.remaining > 0
              ? ` Tiene ${lastCompleted.remaining} tarea${lastCompleted.remaining === 1 ? '' : 's'} pendiente${lastCompleted.remaining === 1 ? '' : 's'}.`
              : ' No quedan tareas pendientes en su bandeja.'}
          </p>
          <PageActions>
            {lastCompleted.remaining > 0 ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setLastCompleted(null)}>
                Siguiente tarea
              </button>
            ) : (
              <Link to="/procesos/instancias" className="btn btn-sm btn-primary">
                Ver solicitudes
              </Link>
            )}
            <button type="button" className="btn btn-sm" onClick={() => setLastCompleted(null)}>
              Cerrar
            </button>
          </PageActions>
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

      {error ? <PageState variant="error" message={error} onRetry={load} /> : null}
      {actionError ? <PageState variant="error" message={actionError} loadingVariant="inline" /> : null}

      {loading ? (
        <PageState variant="loading" loadingVariant="table" message="Cargando bandeja..." />
      ) : items.length === 0 ? (
        <PageState
          variant="empty"
          title="No hay tareas pendientes"
          message="Cuando un proceso requiera su aprobación, aparecerá aquí."
          hint="Revise procesos activos o consulte instancias en curso."
          action={{ label: 'Ver procesos', to: '/procesos' }}
        />
      ) : (
        <div className="inbox-list">
          {items.map((task) => {
            const transitions = task.availableTransitions?.length
              ? task.availableTransitions
              : task.transitionKey
                ? [{ key: task.transitionKey, name: labelWorkflowTransition(task.transitionKey) }]
                : [];
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
                {transitions.length > 0 ? (
                  <p>Acciones disponibles: <strong>{transitions.map((t) => t.name).join(' · ')}</strong></p>
                ) : null}
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
                <PageActions>
                  {canAct
                    ? transitions.map((transition) => (
                        <button
                          key={transition.key}
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={acting === task.id}
                          onClick={() => handleTransition(task, transition.key)}
                        >
                          {acting === task.id ? 'Procesando…' : transition.name}
                        </button>
                      ))
                    : null}
                  {instanceId ? (
                    <Link to={`/procesos/instancias?id=${instanceId}`} className="btn btn-sm">
                      Ver detalle del proceso
                    </Link>
                  ) : (
                    <Link to="/procesos/instancias" className="btn btn-sm">Ver instancias</Link>
                  )}
                </PageActions>
              </article>
            );
          })}
        </div>
      )}
    </PageLayout>
    </>
  );
}
