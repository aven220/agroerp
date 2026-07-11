import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, SimpleRecordsTable, withRowId, EmptyPanel } from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import {
  activateNotificationRule,
  createNotificationRule,
  deactivateNotificationRule,
  listNotificationRules,
  type NotificationRule,
} from '../api/eneac';
import { humanizeCopy } from '../lib/humanizeCopy';

const COMMON_EVENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'GeofenceViolation', label: 'Alerta de geocerca' },
  { value: 'GeofenceEntered', label: 'Entrada a geocerca' },
  { value: 'GeofenceExited', label: 'Salida de geocerca' },
  { value: 'WorkflowStarted', label: 'Proceso iniciado' },
  { value: 'WorkflowCompleted', label: 'Proceso completado' },
  { value: 'WorkflowAssignmentCreated', label: 'Nueva asignación de trámite' },
  { value: 'ProducerCreated', label: 'Productor creado' },
  { value: 'FarmCreated', label: 'Finca creada' },
  { value: 'FieldLotRegistered', label: 'Lote registrado' },
  { value: 'FormSubmitted', label: 'Formulario enviado' },
  { value: 'AccessDenied', label: 'Acceso denegado' },
  { value: 'AuthLoggedIn', label: 'Inicio de sesión' },
];

const SEVERITY_LABELS: Record<string, string> = {
  info: 'Información',
  warning: 'Advertencia',
  critical: 'Crítica',
  emergency: 'Emergencia',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  draft: 'Borrador',
};

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

  useEffect(() => {
    load();
  }, [load]);

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

  const rows = useMemo(
    () =>
      rules.map((row) =>
        withRowId(
          {
            id: row.id,
            name: row.name,
            ruleKey: row.ruleKey,
            events: row.eventTypes
              .map((e) => COMMON_EVENT_TYPES.find((x) => x.value === e)?.label ?? humanizeCopy(e))
              .join(', ') || 'Todos',
            severity: SEVERITY_LABELS[row.alertSeverity] ?? row.alertSeverity,
            status: STATUS_LABELS[row.status] ?? humanizeCopy(row.status),
            statusRaw: row.status,
          },
          'id',
        ),
      ),
    [rules],
  );

  return (
    <>
      <Header
        title="Reglas de aviso"
        subtitle="Defina cuándo y a quién notificar"
        showExperience={false}
        actions={
          <div className="row-actions">
            <Link to="/notificaciones" className="btn">
              Bandeja
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cerrar formulario' : 'Nueva regla'}
            </button>
          </div>
        }
      />

      <PageLayout>
        {showForm ? (
          <PageSection title="Nueva regla">
            <div className="form-row">
              <input
                placeholder="Código de regla"
                value={form.ruleKey}
                onChange={(e) => setForm({ ...form, ruleKey: e.target.value })}
                aria-label="Código de regla"
              />
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-label="Nombre"
              />
              <select
                value={form.alertSeverity}
                onChange={(e) => setForm({ ...form, alertSeverity: e.target.value })}
                aria-label="Severidad"
              >
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={form.eventTypes[0]}
                onChange={(e) => setForm({ ...form, eventTypes: [e.target.value] })}
                aria-label="Evento"
              >
                {COMMON_EVENT_TYPES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={handleCreate}>
                Crear
              </button>
            </div>
          </PageSection>
        ) : null}

        {loading ? (
          <LoadingState variant="table" message="Cargando reglas…" />
        ) : rows.length === 0 ? (
          <EmptyPanel
            title="Aún no hay reglas"
            description="Cree una regla para definir avisos automáticos de operación, procesos o seguridad."
            action={{ label: 'Nueva regla', onClick: () => setShowForm(true) }}
          />
        ) : (
          <PageSection title="Reglas configuradas">
            <SimpleRecordsTable
              gridId="notification-rules"
              data={rows}
              emptyMessage="Aún no hay reglas"
              columns={[
                { key: 'name', label: 'Regla', getValue: (r) => String(r.name) },
                { key: 'ruleKey', label: 'Código', getValue: (r) => String(r.ruleKey) },
                { key: 'events', label: 'Eventos', getValue: (r) => String(r.events) },
                { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity) },
                { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
              ]}
              rowActions={[
                {
                  id: 'toggle',
                  label: 'Activar / desactivar',
                  onAction: (r) => {
                    const id = String(r.id);
                    if (r.statusRaw !== 'active') activateNotificationRule(id).then(load);
                    else deactivateNotificationRule(id).then(load);
                  },
                },
              ]}
            />
          </PageSection>
        )}
      </PageLayout>
    </>
  );
}
