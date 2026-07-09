import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowProgress } from '../components/flow/FlowProgress';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { LoadingState } from '../components/ux/LoadingState';
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listWorkflowInstances({ status: status || undefined }));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const instanceId = searchParams.get('id');
    if (instanceId) {
      openDetail(instanceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abrir detalle desde URL EFX
  }, [searchParams]);

  async function openDetail(id: string) {
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
    await suspendWorkflowInstance(id);
    load();
    if (selected?.id === id) openDetail(id);
  }

  async function handleResume(id: string) {
    await resumeWorkflowInstance(id);
    load();
    if (selected?.id === id) openDetail(id);
  }

  async function handleCancel(id: string) {
    const reason = prompt('Motivo de cancelación:');
    if (!reason) return;
    await cancelWorkflowInstance(id, reason);
    load();
    setSelected(null);
  }

  return (
    <>
      <Header
        title="Instancias de proceso"
        subtitle="Seguimiento y control de ejecución"
        actions={
          <div className="row-actions">
            <Link to="/procesos" className="btn">Catálogo</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/dashboard" className="btn">Dashboard</Link>
          </div>
        }
      />

      <FlowProgress flowId="workflow" currentStepId="detail" />

      <div className="filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="split-layout">
        <div className="data-table-wrap">
          {loading ? (
            <LoadingState variant="page" message="Cargando..." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Proceso</th>
                  <th>Paso actual</th>
                  <th>Situación</th>
                  <th>Inicio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className={selected?.id === row.id ? 'selected-row' : ''}>
                    <td>
                      <strong>{row.workflowDefinition?.name ?? 'Solicitud'}</strong>
                    </td>
                    <td>{labelWorkflowStep(row.currentState)}</td>
                    <td><span className={`badge badge-${row.status}`}>{STATUS_LABELS[row.status] ?? row.status}</span></td>
                    <td>{new Date(row.startedAt).toLocaleString()}</td>
                    <td>
                      <button type="button" className="btn btn-sm" onClick={() => openDetail(row.id)}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <aside className="panel detail-panel">
            <h3>{selected.workflowDefinition?.name}</h3>
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
            <div className="row-actions">
              {selected.status === 'active' && (
                <button type="button" className="btn btn-sm" onClick={() => handleSuspend(selected.id)}>Pausar</button>
              )}
              {selected.status === 'suspended' && (
                <button type="button" className="btn btn-sm" onClick={() => handleResume(selected.id)}>Reanudar</button>
              )}
              {selected.status === 'active' && (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => handleCancel(selected.id)}>Cancelar</button>
              )}
            </div>
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
          </aside>
        )}
      </div>
    </>
  );
}
