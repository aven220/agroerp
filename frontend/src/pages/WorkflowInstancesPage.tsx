import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FlowProgress } from '../components/flow/FlowProgress';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  TableToolbar,
  FormActions,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { useAuth } from '../context/AuthContext';
import { useGuidedWorkspaceOptional } from '../context/GuidedWorkspaceContext';
import { updateWorkEntityLabel } from '../lib/workEntityHistory';
import {
  cancelWorkflowInstance,
  getWorkflowHistory,
  getWorkflowInstance,
  listWorkflowInstances,
  resumeWorkflowInstance,
  suspendWorkflowInstance,
  type WorkflowHistoryEntry,
  type WorkflowInstance,
} from '../api/workflows';
import { useOnEntityUpdated, notifyEntityUpdated } from '../lib/entitySync';
import { labelWorkflowStep } from '../lib/humanizeCopy';
import { labelWorkflowStatus } from '../lib/userLabels';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function WorkflowInstancesPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const gw = useGuidedWorkspaceOptional();
  const [items, setItems] = useState<WorkflowInstance[]>([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<WorkflowInstance | null>(null);
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listWorkflowInstances({ status: status || undefined }));
    } catch (e: unknown) {
      setItems([]);
      setError(e instanceof Error ? e.message : 'Error al cargar instancias');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  useOnEntityUpdated(load, 'workflow');

  useEffect(() => {
    const instanceId = searchParams.get('id');
    if (instanceId) {
      openDetail(instanceId).catch((e: unknown) => {
        setDetailError(e instanceof Error ? e.message : 'No se pudo abrir la instancia');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abrir detalle desde URL EFX
  }, [searchParams]);

  async function openDetail(id: string) {
    setDetailError(null);
    const [inst, hist] = await Promise.all([
      getWorkflowInstance(id),
      getWorkflowHistory(id),
    ]);
    setSelected(inst);
    setHistory(hist);
    const label = inst.workflowDefinition?.name ?? inst.workflowKey ?? `Solicitud ${id.slice(0, 8)}`;
    updateWorkEntityLabel(user?.id, 'process', id, label);
    gw?.trackOpenProcess({
      id: inst.id,
      label,
      to: `/procesos/instancias?id=${inst.id}`,
    });
  }

  async function handleSuspend(id: string) {
    try {
      await suspendWorkflowInstance(id);
      notifyEntityUpdated('workflow', id);
      await load();
      if (selected?.id === id) await openDetail(id);
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo suspender');
    }
  }

  async function handleResume(id: string) {
    try {
      await resumeWorkflowInstance(id);
      notifyEntityUpdated('workflow', id);
      await load();
      if (selected?.id === id) await openDetail(id);
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo reanudar');
    }
  }

  async function handleCancel(id: string) {
    const reason = prompt('Motivo de cancelación:');
    if (!reason) return;
    try {
      await cancelWorkflowInstance(id, reason);
      notifyEntityUpdated('workflow', id);
      await load();
      setSelected(null);
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo cancelar');
    }
  }

  const columns: SimpleColumn<WorkflowInstance>[] = [
    {
      key: 'name',
      label: 'Proceso',
      render: (r) => <strong>{r.workflowDefinition?.name ?? 'Solicitud'}</strong>,
      getValue: (r) => r.workflowDefinition?.name ?? 'Solicitud',
    },
    {
      key: 'currentState',
      label: 'Paso actual',
      getValue: (r) => labelWorkflowStep(r.currentState),
    },
    {
      key: 'status',
      label: 'Situación',
      render: (r) => (
        <span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
      ),
      getValue: (r) => STATUS_LABELS[r.status] ?? r.status,
    },
    {
      key: 'startedAt',
      label: 'Inicio',
      getValue: (r) => new Date(r.startedAt).toLocaleString(),
    },
  ];

  const rowActions: RowAction<WorkflowInstance>[] = [
    {
      id: 'view',
      label: 'Ver',
      onAction: (r) => { openDetail(r.id); },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Instancias de proceso"
        subtitle="Seguimiento y control de ejecución"
        actions={
          <PageActions>
            <Link to="/procesos" className="btn">Catálogo</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/dashboard" className="btn">Dashboard</Link>
          </PageActions>
        }
      />

      {detailError ? <PageState variant="error" message={detailError} /> : null}
      {error ? <PageState variant="error" message={error} onRetry={load} /> : null}

      <FlowProgress flowId="workflow" currentStepId="detail" />

      <PageSection title="Instancias">
        <TableToolbar>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </TableToolbar>

        <div className="split-layout">
          <SimpleRecordsTable
            gridId="workflow-instances"
            columns={columns}
            data={items}
            loading={loading}
            selectable={false}
            rowActions={rowActions}
            onRowClick={(r) => openDetail(r.id)}
            emptyMessage="Sin instancias"
            emptyDescription="No hay instancias de proceso con los filtros actuales."
          />

          {selected && (
            <PageSection title={selected.workflowDefinition?.name ?? 'Detalle'}>
              <p>Estado actual: <strong>{labelWorkflowStep(selected.currentState)}</strong></p>
              <p>Situación: {STATUS_LABELS[selected.status] ?? selected.status}</p>

              <FlowNextActions
                title="Continuar el proceso"
                subtitle={
                  selected.status === 'completed'
                    ? 'Esta solicitud finalizó. Revise el historial o atienda la siguiente tarea.'
                    : 'Gestione esta instancia o vuelva a la bandeja de tareas.'
                }
                actions={[
                  ...(selected.status === 'active'
                    ? [
                        {
                          label: 'Ir a bandeja',
                          description: 'Atienda tareas pendientes de aprobación',
                          to: '/procesos/bandeja',
                          primary: true,
                          icon: '📥',
                        },
                      ]
                    : []),
                  ...(selected.status === 'completed'
                    ? [
                        {
                          label: 'Siguiente tarea',
                          description: 'Vuelva a la bandeja de aprobaciones',
                          to: '/procesos/bandeja',
                          primary: true,
                          icon: '→',
                        },
                      ]
                    : []),
                  {
                    label: 'Ver catálogo de procesos',
                    description: 'Consulte definiciones y versiones',
                    to: '/procesos',
                    icon: '📋',
                  },
                ]}
                className="flow-next-actions-inline"
              />

              {selected.assignments && selected.assignments.length > 0 && (
                <div>
                  <h4>Asignaciones pendientes</h4>
                  <ul>
                    {selected.assignments.map((a) => (
                      <li key={a.id}>{labelWorkflowStep(a.stateKey)} — {labelWorkflowStatus(a.status)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <FormActions sticky={false}>
                {selected.status === 'active' && (
                  <button type="button" className="btn btn-sm" onClick={() => handleSuspend(selected.id)}>Pausar</button>
                )}
                {selected.status === 'suspended' && (
                  <button type="button" className="btn btn-sm" onClick={() => handleResume(selected.id)}>Reanudar</button>
                )}
                {selected.status === 'active' && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleCancel(selected.id)}>Cancelar</button>
                )}
              </FormActions>
              <h4>Historial</h4>
              <div className="timeline">
                {history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <time>{new Date(h.occurredAt).toLocaleString()}</time>
                    <strong>{h.eventType}</strong>
                    {h.fromState && h.toState && (
                      <span> {h.fromState} → {h.toState}</span>
                    )}
                    {h.comment && <p>{h.comment}</p>}
                  </div>
                ))}
              </div>
            </PageSection>
          )}
        </div>
      </PageSection>
    </PageLayout>
  );
}
