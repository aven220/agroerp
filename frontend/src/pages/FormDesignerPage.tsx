import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormFieldControl } from '../components/forms/FormFieldControl';
import {
  DEFAULT_FIELD_OPTIONS,
  fieldTypeUsesOptions,
  FieldOptionsEditor,
} from '../components/forms/FieldOptionsEditor';
import { ConditionalRuleEditor } from '../components/forms/ConditionalRuleEditor';
import {
  FORM_FIELD_TYPES,
  createForm,
  getForm,
  renderForm,
  updateForm,
  type FormDefinitionSchema,
  type FormFieldDefinition,
} from '../api/forms';

const PALETTE = FORM_FIELD_TYPES.map((t) => ({
  type: t,
  label: t.replace(/_/g, ' '),
}));

export function FormDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const [formKey, setFormKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [previewFields, setPreviewFields] = useState<Array<FormFieldDefinition & { visible?: boolean; effectiveRequired?: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string>('draft');
  const [tab, setTab] = useState<'design' | 'preview' | 'rules'>('design');

  useEffect(() => {
    if (!id) return;
    getForm(id).then((f) => {
      setFormKey(f.formKey);
      setName(f.name);
      setDescription(f.description ?? '');
      setFields(f.schema.fields ?? []);
      setFormStatus(f.status);
    });
  }, [id]);

  function addField(type: string) {
    const key = `field_${fields.length + 1}`;
    const label = `Campo ${fields.length + 1}`;
    const base: FormFieldDefinition = { key, type, label };
    const withOptions = fieldTypeUsesOptions(type)
      ? { ...base, options: [...DEFAULT_FIELD_OPTIONS!] }
      : base;
    setFields((prev) => [...prev, withOptions]);
    setSelectedIdx(fields.length);
  }

  function updateField(idx: number, patch: Partial<FormFieldDefinition>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  }

  function moveField(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
    setSelectedIdx(next);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const schema: FormDefinitionSchema = {
      version: 1,
      fields,
      settings: { offlineCapable: true, allowDraft: true },
    };
    try {
      if (isNew) {
        const created = await createForm({ formKey, name, description, schema });
        navigate(`/formularios/${created.id}/disenar`);
      } else if (id) {
        await updateForm(id, { name, description, schema });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      setSaveError(
        formStatus !== 'draft'
          ? `${msg}. Solo se pueden editar formularios en borrador — cree una nueva versión desde la lista.`
          : msg,
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshPreview() {
    let visibilityByKey = new Map<string, { visible: boolean; effectiveRequired: boolean }>();
    if (id) {
      try {
        const rendered = await renderForm(id, previewData);
        visibilityByKey = new Map(
          rendered.fields.map((f) => [
            f.key,
            { visible: f.visible !== false, effectiveRequired: !!f.effectiveRequired },
          ]),
        );
      } catch {
        /* usar solo lienzo local */
      }
    }
    setPreviewFields(
      fields.map((f) => {
        const vis = visibilityByKey.get(f.key);
        return {
          ...f,
          visible: vis?.visible ?? true,
          effectiveRequired: vis?.effectiveRequired ?? f.required,
        };
      }),
    );
  }

  useEffect(() => {
    if (tab === 'preview') refreshPreview();
  }, [tab, previewData, fields, id]);

  const selected = selectedIdx != null ? fields[selectedIdx] : null;

  return (
    <>
      <Header
        title={isNew ? 'Nuevo formulario' : `Diseñador — ${name}`}
        subtitle="Arrastre controles · reglas · vista previa"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => navigate('/formularios')}>Volver</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      />

      {formStatus !== 'draft' && !isNew && (
        <div className="alert alert-warning">
          Este formulario está <strong>{formStatus}</strong>. Los cambios no se pueden guardar aquí;
          cree una nueva versión en la lista de formularios, edítela y publíquela para usarla en la app.
        </div>
      )}
      {saveError && <div className="alert alert-danger">{saveError}</div>}

      <nav className="tab-nav">
        {(['design', 'preview', 'rules'] as const).map((t) => (
          <button key={t} type="button" className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'design' ? 'Diseño' : t === 'preview' ? 'Vista previa' : 'Reglas'}
          </button>
        ))}
      </nav>

      {tab === 'design' && (
        <div className="designer-layout">
          <aside className="designer-palette panel">
            <h3>Controles</h3>
            <div className="palette-grid">
              {PALETTE.map((p) => (
                <button key={p.type} type="button" className="btn btn-sm palette-item" onClick={() => addField(p.type)}>
                  {p.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="designer-canvas panel">
            {isNew && (
              <div className="form-row">
                <input placeholder="form_key" value={formKey} onChange={(e) => setFormKey(e.target.value)} />
                <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <textarea
              placeholder="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <h3>Campos ({fields.length})</h3>
            {fields.map((f, idx) => (
              <div
                key={f.key}
                className={`designer-field ${selectedIdx === idx ? 'selected' : ''}`}
                onClick={() => setSelectedIdx(idx)}
              >
                <strong>{f.label}</strong> <span className="muted">({f.type})</span>
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); moveField(idx, -1); }}>↑</button>
                  <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); moveField(idx, 1); }}>↓</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); removeField(idx); }}>×</button>
                </div>
              </div>
            ))}
          </section>

          <aside className="designer-inspector panel">
            <h3>Propiedades</h3>
            {selected ? (
              <div className="form-panel">
                <div className="form-group">
                  <label>Clave</label>
                  <input value={selected.key} onChange={(e) => updateField(selectedIdx!, { key: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Etiqueta</label>
                  <input value={selected.label} onChange={(e) => updateField(selectedIdx!, { label: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={selected.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const patch: Partial<FormFieldDefinition> = { type };
                      if (fieldTypeUsesOptions(type) && !selected.options?.length) {
                        patch.options = [...DEFAULT_FIELD_OPTIONS!];
                      }
                      updateField(selectedIdx!, patch);
                    }}
                  >
                    {PALETTE.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group form-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(selected.required)}
                      onChange={(e) => updateField(selectedIdx!, { required: e.target.checked })}
                    />
                    Obligatorio
                  </label>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={selected.description ?? ''}
                    onChange={(e) => updateField(selectedIdx!, { description: e.target.value })}
                  />
                </div>
                {selected.type === 'button' && (
                  <>
                    <div className="form-group">
                      <label>Acción del botón</label>
                      <select
                        value={String(selected.metadata?.action ?? 'submit')}
                        onChange={(e) =>
                          updateField(selectedIdx!, {
                            metadata: { ...selected.metadata, action: e.target.value },
                          })
                        }
                      >
                        <option value="submit">Enviar</option>
                        <option value="draft">Guardar borrador</option>
                        <option value="reset">Restablecer</option>
                        <option value="link">Abrir enlace</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estilo</label>
                      <select
                        value={String(selected.metadata?.variant ?? 'primary')}
                        onChange={(e) =>
                          updateField(selectedIdx!, {
                            metadata: { ...selected.metadata, variant: e.target.value },
                          })
                        }
                      >
                        <option value="primary">Primario</option>
                        <option value="secondary">Secundario</option>
                        <option value="ghost">Ghost</option>
                      </select>
                    </div>
                    {selected.metadata?.action === 'link' && (
                      <div className="form-group">
                        <label>URL (enlace)</label>
                        <input
                          value={String(selected.metadata?.url ?? '')}
                          onChange={(e) =>
                            updateField(selectedIdx!, {
                              metadata: { ...selected.metadata, url: e.target.value },
                            })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                {selected.type === 'hyperlink' && (
                  <div className="form-group">
                    <label>URL</label>
                    <input
                      value={String(selected.metadata?.url ?? selected.description ?? '')}
                      onChange={(e) =>
                        updateField(selectedIdx!, {
                          metadata: { ...selected.metadata, url: e.target.value },
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                {fieldTypeUsesOptions(selected.type) && (
                  <FieldOptionsEditor
                    options={selected.options}
                    onChange={(options) => updateField(selectedIdx!, { options })}
                  />
                )}
                <ConditionalRuleEditor
                  label="Mostrar solo si (visibleWhen)"
                  ruleKey="visibleWhen"
                  field={selected}
                  allFields={fields}
                  onChange={(patch) => updateField(selectedIdx!, patch)}
                />
                <ConditionalRuleEditor
                  label="Obligatorio solo si (requiredWhen)"
                  ruleKey="requiredWhen"
                  field={selected}
                  allFields={fields}
                  onChange={(patch) => updateField(selectedIdx!, patch)}
                />
              </div>
            ) : (
              <p className="muted">Seleccione un campo</p>
            )}
          </aside>
        </div>
      )}

      {tab === 'preview' && (
        <div className="panel form-panel">
          {(previewFields.length ? previewFields : fields.map((f) => ({ ...f, visible: true })))
            .filter((f) => f.visible !== false)
            .map((f) => (
            <FormFieldControl
              key={f.key}
              field={f}
              value={previewData[f.key]}
              onChange={(key, val) => setPreviewData((d) => ({ ...d, [key]: val }))}
              onButtonAction={(action, field) => {
                if (action === 'reset') {
                  setPreviewData({});
                  return;
                }
                if (action === 'link') {
                  const url = field.metadata?.url ?? field.description;
                  if (url) window.open(String(url), '_blank', 'noopener,noreferrer');
                  return;
                }
                window.alert(`Vista previa: acción "${action}" — ${field.label}`);
              }}
            />
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <div className="panel">
          <p>Constructor de reglas condicionales — configure <code>visibleWhen</code> y <code>requiredWhen</code> en el inspector JSON del campo.</p>
          <pre className="code-block">{JSON.stringify(fields, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
