import { useMemo, useState } from 'react';
import { FormStudioRenderer } from './FormStudioRenderer';
import { FormStudioPreview, type PreviewDevice } from './FormStudioPreview';
import type { FormFieldDefinition } from '../api/forms';
import { resolvePreviewFields } from './client-conditional';

interface Props {
  fields: FormFieldDefinition[];
  layout?: import('../api/forms').FormLayoutNode[];
  formName: string;
  onClose?: () => void;
}

type SimRole = 'admin' | 'technician' | 'field' | 'viewer';
type SimMode = 'online' | 'offline';

const SIM_ROLES: Array<{ id: SimRole; label: string }> = [
  { id: 'admin', label: 'Administrador' },
  { id: 'technician', label: 'Técnico de campo' },
  { id: 'field', label: 'Operario' },
  { id: 'viewer', label: 'Solo lectura' },
];

export function FormSimulator({ fields, layout, formName, onClose }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [device, setDevice] = useState<PreviewDevice>('phone-portrait');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [simMode, setSimMode] = useState<SimMode>('online');
  const [simRole, setSimRole] = useState<SimRole>('technician');
  const [simGps, setSimGps] = useState(true);
  const [simCatalogs, setSimCatalogs] = useState(true);
  const [simWorkflow, setSimWorkflow] = useState(false);
  const [fillSample, setFillSample] = useState(false);

  const visibleFieldCount = useMemo(
    () => resolvePreviewFields(fields, data).filter((f) => f.visible).length,
    [fields, data],
  );

  function validate(): Array<{ field: string; message: string }> {
    const visible = resolvePreviewFields(fields, data).filter((f) => f.visible);
    const errs: Array<{ field: string; message: string }> = [];
    for (const f of visible) {
      if (f.effectiveRequired) {
        const v = data[f.key];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) {
          errs.push({
            field: f.label,
            message: `Complete «${f.label}» antes de enviar.`,
          });
        }
      }
    }
    if (simMode === 'offline' && simGps) {
      const hasGpsField = fields.some((f) => f.type === 'gps' || f.metadata?.requiresGps);
      if (hasGpsField && !data._sim_gps) {
        errs.push({
          field: 'Ubicación',
          message: 'En modo sin conexión, active la ubicación simulada o diligencie el campo GPS.',
        });
      }
    }
    return errs;
  }

  function handleFillSample() {
    const sample: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'text' || f.type === 'textarea') sample[f.key] = `Ejemplo — ${f.label}`;
      else if (f.type === 'number' || f.type === 'currency') sample[f.key] = 42;
      else if (f.type === 'date') sample[f.key] = new Date().toISOString().slice(0, 10);
      else if (f.type === 'select' || f.type === 'radio') {
        const opt = f.options?.[0]?.value;
        if (opt) sample[f.key] = opt;
      }
      else if (f.type === 'checkbox' || f.type === 'toggle') sample[f.key] = true;
    }
    if (simGps) sample._sim_gps = '4.7110, -74.0721';
    setData(sample);
    setFillSample(true);
    setErrors([]);
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (errs.length === 0) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="fs-simulator fs-simulator-done panel">
        <div className="fs-sim-success-icon" aria-hidden>✓</div>
        <h3>Simulación completada</h3>
        <p className="muted">
          «{formName}» se envió correctamente en modo prueba. Ningún dato fue guardado en producción.
        </p>
        {simWorkflow ? (
          <p className="fs-sim-workflow-note">
            Con aprobaciones activas, el envío pasaría a la bandeja del siguiente responsable.
          </p>
        ) : null}
        <div className="fs-sim-summary">
          <div><strong>Campos diligenciados</strong><span>{Object.keys(data).length}</span></div>
          <div><strong>Modo</strong><span>{simMode === 'offline' ? 'Sin conexión' : 'En línea'}</span></div>
          <div><strong>Rol simulado</strong><span>{SIM_ROLES.find((r) => r.id === simRole)?.label}</span></div>
        </div>
        <div className="row-actions">
          <button type="button" className="fs-action-btn" onClick={() => { setSubmitted(false); setData({}); setErrors([]); setFillSample(false); }}>
            Reiniciar prueba
          </button>
          {onClose ? (
            <button type="button" className="fs-action-btn fs-action-primary" onClick={onClose}>Cerrar</button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fs-simulator">
      <aside className="fs-sim-panel" aria-label="Opciones de simulación">
        <h3 className="fs-sim-panel-title">Entorno de prueba</h3>
        <p className="muted fs-sim-panel-desc">
          Configure el escenario antes de diligenciar. Todo es local — no afecta datos reales.
        </p>

        <label className="fs-sim-option">
          <span>Conectividad</span>
          <select value={simMode} onChange={(e) => setSimMode(e.target.value as SimMode)}>
            <option value="online">En línea</option>
            <option value="offline">Sin conexión</option>
          </select>
        </label>

        <label className="fs-sim-option">
          <span>Usuario simulado</span>
          <select value={simRole} onChange={(e) => setSimRole(e.target.value as SimRole)}>
            {SIM_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>

        <fieldset className="fs-sim-checks">
          <legend>Opciones</legend>
          <label><input type="checkbox" checked={simGps} onChange={(e) => setSimGps(e.target.checked)} /> Simular ubicación GPS</label>
          <label><input type="checkbox" checked={simCatalogs} onChange={(e) => setSimCatalogs(e.target.checked)} /> Cargar catálogos de prueba</label>
          <label><input type="checkbox" checked={simWorkflow} onChange={(e) => setSimWorkflow(e.target.checked)} /> Simular aprobaciones</label>
        </fieldset>

        <div className="fs-sim-actions">
          <button type="button" className="fs-action-btn" onClick={handleFillSample}>
            Datos de ejemplo
          </button>
          <button type="button" className="fs-action-btn" onClick={() => { setData({}); setErrors([]); setFillSample(false); }}>
            Limpiar
          </button>
        </div>

        <div className="fs-sim-stats muted">
          <span>{visibleFieldCount} campos visibles</span>
          {simMode === 'offline' ? <span className="fs-sim-offline-badge">Sin conexión</span> : null}
        </div>
      </aside>

      <div className="fs-sim-main">
        <header className="fs-sim-header">
          <div>
            <h3>Probar: {formName}</h3>
            <p className="muted">Diligencie como lo haría un usuario en campo.</p>
          </div>
          <button type="button" className="fs-action-btn fs-action-primary" onClick={handleSubmit}>
            Enviar prueba
          </button>
        </header>

        {errors.length > 0 ? (
          <div className="fs-sim-errors" role="alert">
            <strong>Revise los siguientes puntos:</strong>
            <ul>
              {errors.map((e) => (
                <li key={`${e.field}-${e.message}`}>
                  <span className="fs-sim-error-field">{e.field}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {simMode === 'offline' ? (
          <div className="fs-sim-offline-banner" role="status">
            Modo sin conexión activo — los datos se guardarían localmente hasta sincronizar.
          </div>
        ) : null}

        <FormStudioPreview device={device} onDeviceChange={setDevice}>
          <FormStudioRenderer
            fields={fields}
            layout={layout}
            data={data}
            onChange={(key, val) => setData((d) => ({ ...d, [key]: val }))}
            onButtonAction={(action) => {
              if (action === 'reset') { setData({}); setErrors([]); }
              if (action === 'submit') handleSubmit();
            }}
          />
        </FormStudioPreview>
      </div>
    </div>
  );
}
