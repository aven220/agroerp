import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  PROCESS_CATEGORIES,
  STATE_TYPE_LABELS,
  createEmptyWorkflowSchema,
  createWorkflowDefinition,
  createWorkflowVersion,
  getWorkflowDefinition,
  updateWorkflowVersion,
  type WorkflowDefinitionSchema,
  type WorkflowStateDefinition,
  type WorkflowTransitionDefinition,
} from '../api/workflows';

const STATE_TYPES = ['initial', 'intermediate', 'final', 'cancelled'] as const;
const GATEWAY_TYPES = ['none', 'exclusive', 'parallel', 'inclusive'] as const;

const GATEWAY_TYPE_LABELS: Record<string, string> = {
  none: 'Sin bifurcación',
  exclusive: 'Decisión (una ruta)',
  parallel: 'Rutas en paralelo',
  inclusive: 'Decisión (varias rutas)',
};

export function WorkflowDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [workflowKey, setWorkflowKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('aprobaciones');
  const [schema, setSchema] = useState<WorkflowDefinitionSchema>(createEmptyWorkflowSchema());
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [tab, setTab] = useState<'states' | 'transitions' | 'flow' | 'rules'>('flow');
  const [saving, setSaving] = useState(false);
  const [versionId, setVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getWorkflowDefinition(id).then((def) => {
      setWorkflowKey(def.workflowKey);
      setName(def.name);
      setDescription(def.description ?? '');
      const latest = def.versions[0];
      if (latest) {
        setVersionId(latest.id);
        setSchema(latest.definition);
        const cat = latest.definition.settings?.processCategory;
        if (cat) setCategory(cat);
      }
    });
  }, [id]);

  function updateState(key: string, patch: Partial<WorkflowStateDefinition>) {
    setSchema((prev) => ({
      ...prev,
      states: prev.states.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  }

  function addState() {
    const key = `state_${schema.states.length + 1}`;
    setSchema((prev) => ({
      ...prev,
      states: [...prev.states, { key, name: `Estado ${prev.states.length + 1}`, type: 'intermediate' }],
    }));
    setSelectedState(key);
  }

  function removeState(key: string) {
    setSchema((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s.key !== key),
      transitions: prev.transitions.filter((t) => t.from !== key && t.to !== key),
    }));
    setSelectedState(null);
  }

  function addTransition() {
    const key = `transition_${schema.transitions.length + 1}`;
    const from = schema.states[0]?.key ?? 'draft';
    const to = schema.states[1]?.key ?? from;
    setSchema((prev) => ({
      ...prev,
      transitions: [
        ...prev.transitions,
        { key, name: `Transición ${prev.transitions.length + 1}`, from, to, permissions: ['workflow:execute'] },
      ],
    }));
    setSelectedTransition(key);
  }

  function updateTransition(key: string, patch: Partial<WorkflowTransitionDefinition>) {
    setSchema((prev) => ({
      ...prev,
      transitions: prev.transitions.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    }));
  }

  function removeTransition(key: string) {
    setSchema((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((t) => t.key !== key),
    }));
    setSelectedTransition(null);
  }

  async function handleSave() {
    setSaving(true);
    const fullSchema: WorkflowDefinitionSchema = {
      ...schema,
      settings: { ...schema.settings, processCategory: category },
    };
    try {
      if (isNew) {
        const created = await createWorkflowDefinition({
          workflowKey,
          name,
          description,
          definition: fullSchema,
        });
        navigate(`/procesos/${created.id}/disenar`);
      } else if (id && versionId) {
        await updateWorkflowVersion(versionId, { definition: fullSchema, changelog: 'Actualización diseñador' });
      } else if (id) {
        await createWorkflowVersion(id, { definition: fullSchema, changelog: 'Nueva versión' });
      }
    } finally {
      setSaving(false);
    }
  }

  const stateObj = selectedState ? schema.states.find((s) => s.key === selectedState) : null;
  const transitionObj = selectedTransition
    ? schema.transitions.find((t) => t.key === selectedTransition)
    : null;

  return (
    <>
      <Header
        title={isNew ? 'Nuevo proceso' : `Diseñar — ${name}`}
        subtitle="Defina etapas, aprobaciones y reglas del flujo de trabajo"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => navigate('/procesos')}>Volver</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      />

      <nav className="tab-nav">
        {(['flow', 'states', 'transitions', 'rules'] as const).map((t) => (
          <button key={t} type="button" className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'flow' ? 'Diagrama' : t === 'states' ? 'Estados' : t === 'transitions' ? 'Transiciones' : 'Reglas'}
          </button>
        ))}
      </nav>

      {isNew && (
        <div className="panel form-row">
          <input placeholder="Código interno (opcional, se genera si se deja vacío)" value={workflowKey} onChange={(e) => setWorkflowKey(e.target.value)} aria-label="Código interno del proceso" />
          <input placeholder="Nombre del proceso" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {PROCESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {tab === 'flow' && (
        <div className="bpm-flow-canvas panel">
          <div className="bpm-flow-grid">
            {schema.states.map((state, idx) => {
              const outgoing = schema.transitions.filter((t) => t.from === state.key || t.from === '*');
              return (
                <div
                  key={state.key}
                  className={`bpm-node bpm-node-${state.type} ${selectedState === state.key ? 'selected' : ''}`}
                  style={{ gridColumn: (idx % 4) + 1, gridRow: Math.floor(idx / 4) + 1 }}
                  onClick={() => { setSelectedState(state.key); setSelectedTransition(null); }}
                >
                  <div className="bpm-node-type">{STATE_TYPE_LABELS[state.type]}</div>
                  <strong>{state.name}</strong>
                  {state.gatewayType && state.gatewayType !== 'none' && (
                    <span className="bpm-gateway">{GATEWAY_TYPE_LABELS[state.gatewayType] ?? state.gatewayType}</span>
                  )}
                  {state.slaHours && <span className="bpm-sla">SLA {state.slaHours}h</span>}
                  {outgoing.length > 0 && (
                    <div className="bpm-outgoing">
                      {outgoing.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className="bpm-edge"
                          onClick={(e) => { e.stopPropagation(); setSelectedTransition(t.key); setSelectedState(null); }}
                        >
                          → {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'states' && (
        <div className="designer-layout">
          <section className="designer-canvas panel">
            <div className="row-actions" style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={addState}>+ Estado</button>
            </div>
            {schema.states.map((s) => (
              <div
                key={s.key}
                className={`designer-field ${selectedState === s.key ? 'selected' : ''}`}
                onClick={() => setSelectedState(s.key)}
              >
                <strong>{s.name}</strong> — {STATE_TYPE_LABELS[s.type]}
              </div>
            ))}
          </section>
          <aside className="designer-inspector panel">
            {stateObj ? (
              <>
                <h3>Estado: {stateObj.name}</h3>
                <label>Nombre visible<input value={stateObj.name} onChange={(e) => updateState(stateObj.key, { name: e.target.value })} /></label>
                <details>
                  <summary>Código interno (avanzado)</summary>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>Código<input value={stateObj.key} onChange={(e) => updateState(stateObj.key, { key: e.target.value })} /></label>
                </details>
                <label>Tipo de etapa
                  <select value={stateObj.type} onChange={(e) => updateState(stateObj.key, { type: e.target.value as WorkflowStateDefinition['type'] })}>
                    {STATE_TYPES.map((t) => <option key={t} value={t}>{STATE_TYPE_LABELS[t]}</option>)}
                  </select>
                </label>
                <label>Tipo de decisión
                  <select value={stateObj.gatewayType ?? 'none'} onChange={(e) => updateState(stateObj.key, { gatewayType: e.target.value as WorkflowStateDefinition['gatewayType'] })}>
                    {GATEWAY_TYPES.map((g) => <option key={g} value={g}>{GATEWAY_TYPE_LABELS[g] ?? g}</option>)}
                  </select>
                </label>
                <label>Plazo máximo (horas)<input type="number" value={stateObj.slaHours ?? ''} onChange={(e) => updateState(stateObj.key, { slaHours: Number(e.target.value) || undefined })} /></label>
                <label>Subproceso vinculado<input value={stateObj.subprocessKey ?? ''} onChange={(e) => updateState(stateObj.key, { subprocessKey: e.target.value || undefined })} placeholder="Opcional" /></label>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeState(stateObj.key)}>Eliminar</button>
              </>
            ) : (
              <p className="text-muted">Seleccione un estado</p>
            )}
          </aside>
        </div>
      )}

      {tab === 'transitions' && (
        <div className="designer-layout">
          <section className="designer-canvas panel">
            <div className="row-actions" style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={addTransition}>+ Transición</button>
            </div>
            {schema.transitions.map((t) => (
              <div
                key={t.key}
                className={`designer-field ${selectedTransition === t.key ? 'selected' : ''}`}
                onClick={() => setSelectedTransition(t.key)}
              >
                <strong>{t.name}</strong> ({schema.states.find((s) => s.key === t.from)?.name ?? t.from} → {schema.states.find((s) => s.key === t.to)?.name ?? t.to})
              </div>
            ))}
          </section>
          <aside className="designer-inspector panel">
            {transitionObj ? (
              <>
                <h3>Transición: {transitionObj.name}</h3>
                <label>Nombre visible<input value={transitionObj.name} onChange={(e) => updateTransition(transitionObj.key, { name: e.target.value })} /></label>
                <details>
                  <summary>Código interno (avanzado)</summary>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>Código<input value={transitionObj.key} onChange={(e) => updateTransition(transitionObj.key, { key: e.target.value })} /></label>
                </details>
                <label>Desde
                  <select value={transitionObj.from} onChange={(e) => updateTransition(transitionObj.key, { from: e.target.value })}>
                    <option value="*">* (cualquiera)</option>
                    {schema.states.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                  </select>
                </label>
                <label>Hacia
                  <select value={transitionObj.to} onChange={(e) => updateTransition(transitionObj.key, { to: e.target.value })}>
                    {schema.states.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                  </select>
                </label>
                <label>Quién puede ejecutar (roles, separados por coma)<input value={transitionObj.permissions?.join(', ') ?? ''} onChange={(e) => updateTransition(transitionObj.key, { permissions: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })} placeholder="Opcional" /></label>
                <label>Plazo de tarea (horas)<input type="number" value={transitionObj.dueInHours ?? ''} onChange={(e) => updateTransition(transitionObj.key, { dueInHours: Number(e.target.value) || undefined })} /></label>
                <label><input type="checkbox" checked={transitionObj.requirements?.comment ?? false} onChange={(e) => updateTransition(transitionObj.key, { requirements: { ...transitionObj.requirements, comment: e.target.checked } })} /> Requiere comentario</label>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeTransition(transitionObj.key)}>Eliminar</button>
              </>
            ) : (
              <p className="text-muted">Seleccione una transición</p>
            )}
          </aside>
        </div>
      )}

      {tab === 'rules' && (
        <div className="panel">
          <p>Reglas avanzadas del proceso. Para configuraciones complejas, use importación desde archivo o contacte al administrador.</p>
          <pre className="code-block">{JSON.stringify(schema.rules ?? [], null, 2)}</pre>
          <p className="text-muted">Las reglas permiten condiciones por rol, datos del formulario o eventos del negocio.</p>
        </div>
      )}
    </>
  );
}
