import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowProgress } from '../components/flow/FlowProgress';
import { LoadingState } from '../components/ux/LoadingState';
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

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function WorkflowInstancesPage() {
  const [searchParams] = useSearchParams();
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
                  <th>Estado actual</th>
                  <th>Status</th>
                  <th>Inicio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className={selected?.id === row.id ? 'selected-row' : ''}>
                    <td>
                      <strong>{row.workflowDefinition?.name ?? row.id.slice(0, 8)}</strong>
                      <div className="text-muted">{row.workflowDefinition?.workflowKey}</div>
                    </td>
                    <td><code>{row.currentState}</code></td>
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
            <p>Estado: <code>{selected.currentState}</code></p>
            <p>Status: {STATUS_LABELS[selected.status] ?? selected.status}</p>
            {selected.assignments && selected.assignments.length > 0 && (
              <div>
                <h4>Asignaciones pendientes</h4>
                <ul>
                  {selected.assignments.map((a) => (
                    <li key={a.id}>{a.stateKey} — {a.status}</li>
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
