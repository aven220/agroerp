import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  activateNotificationRule,
  createNotificationRule,
  deactivateNotificationRule,
  listNotificationRules,
  type NotificationRule,
} from '../api/eneac';

const COMMON_EVENT_TYPES = [
  'GeofenceViolation', 'GeofenceEntered', 'GeofenceExited',
  'WorkflowStarted', 'WorkflowCompleted', 'WorkflowAssignmentCreated',
  'ProducerCreated', 'FarmCreated', 'FieldLotRegistered',
  'FormSubmitted', 'AccessDenied', 'AuthLoggedIn',
];

export function NotificationRulesPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ruleKey: '',
    name: '',
    eventTypes: ['GeofenceViolation'] as string[],
    alertSeverity: 'warning',
    channels: [{ channel: 'internal' }],
    recipients: [{ type: 'role', ref: 'manager' }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await listNotificationRules());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    await createNotificationRule({
      ruleKey: form.ruleKey,
      name: form.name,
      eventTypes: form.eventTypes,
      alertSeverity: form.alertSeverity,
      channels: form.channels,
      recipients: form.recipients,
      suppression: { windowSeconds: 300 },
    });
    setShowForm(false);
    load();
  }

  return (
    <>
      <Header
        title="Administrador de reglas"
        subtitle="ENEAC — Motor de reglas configurable"
        actions={
          <div className="row-actions">
            <Link to="/notificaciones" className="btn">Bandeja</Link>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              + Nueva regla
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="panel form-row">
          <input placeholder="rule_key" value={form.ruleKey} onChange={(e) => setForm({ ...form, ruleKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.alertSeverity} onChange={(e) => setForm({ ...form, alertSeverity: e.target.value })}>
            <option value="info">Info</option>
            <option value="warning">Advertencia</option>
            <option value="critical">Crítica</option>
            <option value="emergency">Emergencia</option>
          </select>
          <select
            value={form.eventTypes[0]}
            onChange={(e) => setForm({ ...form, eventTypes: [e.target.value] })}
          >
            {COMMON_EVENT_TYPES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>Crear</button>
        </div>
      )}

      {loading ? (
        <LoadingState variant="table" message="Cargando reglas..." />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Regla</th>
              <th>Eventos</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <div className="text-muted">{row.ruleKey}</div>
                </td>
                <td>{row.eventTypes.join(', ') || '*'}</td>
                <td>{row.alertSeverity}</td>
                <td><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                <td>
                  <div className="row-actions">
                    {row.status !== 'active' ? (
                      <button type="button" className="btn btn-sm" onClick={() => activateNotificationRule(row.id).then(load)}>Activar</button>
                    ) : (
                      <button type="button" className="btn btn-sm" onClick={() => deactivateNotificationRule(row.id).then(load)}>Desactivar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
