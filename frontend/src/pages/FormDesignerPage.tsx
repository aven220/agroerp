import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';
import { useToast } from '../context/ToastContext';
import { ComponentLibraryPanel } from '../form-studio/ComponentLibraryPanel';
import { FormSimulator } from '../form-studio/FormSimulator';
import { FormStudioPreview, type PreviewDevice } from '../form-studio/FormStudioPreview';
import { FormStudioRenderer } from '../form-studio/FormStudioRenderer';
import {
  captureValueFromForm,
  captureValueToPayload,
  type CaptureConfigurationValue,
} from '../form-studio/CaptureConfigurationPanel';
import { TemplateLibraryModal } from '../form-studio/TemplateLibraryModal';
import type { FormStudioTemplate } from '../form-studio/form-templates-library';
import { findComponentByType } from '../form-studio/form-field-catalog';
import {
  createForm,
  getForm,
  getFormVersionHistory,
  newFormVersion,
  publishForm,
  renderForm,
  saveAsTemplate,
  submitFormForReview,
  updateForm,
  type FormDefinitionSchema,
  type FormFieldDefinition,
  type FormVersionHistoryItem,
  type FormRenderPayload,
} from '../api/forms';
import type { FormCaptureMetadata } from '../api/forms';
import { FORM_STATUS_LABELS, getNextLifecycleHint } from '../form-studio/form-lifecycle';
import { FORM_STUDIO_TEMPLATES } from '../form-studio/form-templates-library';
import { LayoutBuilder } from '../form-studio/layout/LayoutBuilder';
import type { FormLayoutNode } from '../form-studio/layout/layout-types';
import { InspectorPanel } from '../form-studio/inspector';
import type { ErpMappingInspectorContext, WorkflowInspectorContext } from '../form-studio/inspector';
import type { InspectorSelection } from '../form-studio/inspector';
import {
  dataMappingFromForm,
  type DataMappingValue,
} from '../form-studio/DataMappingPanel';
import { UcemPreviewBanner } from '../form-studio/UcemPreviewBanner';
import { buildClientUcemPreview } from '../form-studio/ucem/data-provider-utils';
import type { FormWorkflowDefinition } from '../form-studio/workflow/workflow.types';
import {
  defaultWorkflow,
  workflowFromMetadata,
  workflowToMetadata,
} from '../form-studio/workflow/workflow.utils';

type StudioTab = 'design' | 'layout' | 'preview' | 'simulator' | 'components' | 'rules' | 'versions';
type DesignInspectorTarget = 'form' | 'field';

export function FormDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const isNew = !id;
  const openTemplatesOnLoad = searchParams.get('plantilla') === '1';
  const presetTplKey = searchParams.get('tpl');
  const presetFormKey = searchParams.get('key');
  const [formKey, setFormKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [sections, setSections] = useState<FormDefinitionSchema['sections']>([]);
  const [layout, setLayout] = useState<FormLayoutNode[]>([]);
  const [dataMapping, setDataMapping] = useState<DataMappingValue>(() =>
    dataMappingFromForm([], {}),
  );
  const [layoutMode, setLayoutMode] = useState<'flat' | 'tabs' | 'accordion'>('flat');
  const [captureConfig, setCaptureConfig] = useState<CaptureConfigurationValue>(() => captureValueFromForm());
  const [workflowConfig, setWorkflowConfig] = useState<FormWorkflowDefinition>(() => defaultWorkflow());
  const [previewRender, setPreviewRender] = useState<FormRenderPayload | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<FormCaptureMetadata | Record<string, unknown>>({});
  const [previewCatalogKeys, setPreviewCatalogKeys] = useState<string[]>([]);
  const [previewUcem, setPreviewUcem] = useState<import('../api/forms').FormUcemPreview | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [designInspectorTarget, setDesignInspectorTarget] = useState<DesignInspectorTarget>('form');
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [serverFields, setServerFields] = useState<Array<FormFieldDefinition & { visible?: boolean; effectiveRequired?: boolean }>>([]);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string>('draft');
  const [tab, setTab] = useState<StudioTab>('design');
  const [showTemplates, setShowTemplates] = useState(isNew || openTemplatesOnLoad);
  const [versions, setVersions] = useState<FormVersionHistoryItem[]>([]);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getForm(id).then((f) => {
      setFormKey(f.formKey);
      setName(f.name);
      setDescription(f.description ?? '');
      setFields(f.schema.fields ?? []);
      setSections(f.schema.sections ?? []);
      setLayout((f.schema.layout as FormLayoutNode[] | undefined) ?? []);
      setDataMapping(
        dataMappingFromForm(
          f.schema.fields ?? [],
          f.metadata as FormCaptureMetadata,
          f.schema.universalCatalogs,
        ),
      );
      setLayoutMode(f.schema.settings?.layoutMode ?? 'flat');
      setCaptureConfig(captureValueFromForm(f.schema, f.metadata as FormCaptureMetadata));
      setWorkflowConfig(workflowFromMetadata(f.metadata as Record<string, unknown>));
      setFormStatus(f.status);
    });
    getFormVersionHistory(id).then(setVersions).catch(() => setVersions([]));
  }, [id]);

  function applyTemplate(t: FormStudioTemplate) {
    setName(t.name);
    setDescription(t.description);
    setFormKey(t.templateKey.replace(/^tpl-/, ''));
    setFields(t.schema.fields ?? []);
    setSections(t.schema.sections ?? []);
    setLayout(t.schema.layout ?? []);
    setDataMapping(
      dataMappingFromForm(
        t.schema.fields ?? [],
        { entityMapping: t.captureMetadata?.entityMapping },
        t.schema.universalCatalogs,
      ),
    );
    setLayoutMode(t.schema.settings?.layoutMode ?? 'flat');
    setCaptureConfig(
      captureValueFromForm(t.schema, {
        processingType: t.captureMetadata?.processingType,
        entityMapping: t.captureMetadata?.entityMapping,
        requiredCatalogKeys: t.requiredCatalogKeys,
        catalogRequirements: t.requiredCatalogKeys?.map((catalogKey) => ({
          catalogKey,
          source: 'builtin',
          offline: true,
        })),
      }),
    );
    setWorkflowConfig(
      workflowFromMetadata(
        (t.captureMetadata as { workflow?: FormWorkflowDefinition } | undefined) ?? undefined,
      ),
    );
    setTemplateLoaded(true);
    setDirty(true);
    setShowTemplates(false);
    toast.info('Plantilla cargada. Presione «Guardar borrador» para crear el formulario en Mis Formularios.', 'Plantilla aplicada');
  }

  useEffect(() => {
    if (!isNew || !presetTplKey) return;
    const t = FORM_STUDIO_TEMPLATES.find((x) => x.templateKey === presetTplKey);
    if (!t) return;
    applyTemplate(t);
    if (presetFormKey) setFormKey(presetFormKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir desde biblioteca
  }, [isNew, presetTplKey]);

  function markDirty() {
    setDirty(true);
  }

  function addField(field: FormFieldDefinition) {
    const key = field.key.includes('_') ? `${field.key}_${fields.length}` : `field_${fields.length + 1}`;
    setFields((prev) => [...prev, { ...field, key }]);
    setSelectedIdx(fields.length);
    markDirty();
  }

  function updateField(idx: number, patch: Partial<FormFieldDefinition>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    markDirty();
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
    markDirty();
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
    markDirty();
  }

  function buildSchema(): FormDefinitionSchema {
    const { schemaSettings } = captureValueToPayload(captureConfig);
    return {
      version: 1,
      fields,
      sections: sections?.length ? sections : undefined,
      layout: layout.length ? layout : undefined,
      universalCatalogs: dataMapping.universalCatalogs.length
        ? dataMapping.universalCatalogs
        : undefined,
      settings: { ...schemaSettings, layoutMode },
    };
  }

  function buildSavePayload() {
    const { metadata, requiredCatalogKeys } = captureValueToPayload(captureConfig);
    const workflow = workflowToMetadata(workflowConfig);
    return {
      name,
      description,
      schema: buildSchema(),
      metadata: {
        ...metadata,
        entityMapping: dataMapping.entityMapping.mappings.length
          ? dataMapping.entityMapping
          : undefined,
        workflow,
      },
      requiredCatalogKeys,
    };
  }

  async function handleSave() {
    if (!formKey.trim() || !name.trim()) {
      setSaveError('Indique clave y nombre antes de guardar.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        const created = await createForm({ formKey, ...buildSavePayload() });
        setDirty(false);
        setTemplateLoaded(false);
        setLastSavedAt(new Date().toISOString());
        setSavedFormId(created.id);
        setSavedVersion(created.version);
        toast.success(
          `Borrador v${created.version} guardado. Aparece en Mis Formularios. Publíquelo para habilitar Android.`,
          'Guardado',
        );
        navigate(`/formularios/${created.id}/disenar`, { replace: true });
      } else if (id) {
        const updated = await updateForm(id, buildSavePayload());
        setDirty(false);
        setLastSavedAt(new Date().toISOString());
        setSavedFormId(updated.id);
        setSavedVersion(updated.version);
        toast.success('Borrador actualizado.', 'Guardado');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      setSaveError(
        formStatus !== 'draft'
          ? `${msg}. Cree una nueva versión desde Mis Formularios o la pestaña Versiones.`
          : msg,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishFromDesigner() {
    const targetId = id ?? savedFormId;
    if (!targetId) {
      toast.warning('Guarde el borrador antes de publicar.');
      return;
    }
    if (dirty) {
      toast.warning('Guarde los cambios pendientes antes de publicar.');
      return;
    }
    if (!confirm(`¿Publicar "${name}"?\n\nQuedará disponible en Web y en el próximo sync de Android.`)) return;
    await publishForm(targetId);
    setFormStatus('published');
    toast.success('Publicado. Verifique en Mis Formularios → Verificar sync.', 'Publicado');
  }

  async function handleSaveAsTemplate() {
    const templateKey = prompt('Clave de plantilla (template_key):', `${formKey}-tpl`);
    if (!templateKey) return;
    await saveAsTemplate({
      templateKey,
      name: name || templateKey,
      description,
      schema: buildSchema(),
      tags: ['studio', 'custom'],
    });
    alert('Plantilla guardada en la biblioteca.');
  }

  async function handleNewVersion() {
    if (!formKey) return;
    const created = await newFormVersion(formKey);
    navigate(`/formularios/${created.id}/disenar`);
  }

  async function handleSubmitReview() {
    if (!id) return;
    await submitFormForReview(id);
    setFormStatus('in_review');
    alert('Formulario enviado a revisión.');
  }

  async function refreshPreview() {
    if (id) {
      try {
        const rendered = await renderForm(id, previewData);
        const payload = rendered.render ?? {
          schemaVersion: rendered.schemaVersion ?? 1,
          settings: rendered.settings,
          fields: rendered.fields,
          resolvedData: rendered.resolvedData ?? {},
        };
        setPreviewRender(payload);
        setServerFields(payload.fields);
        setPreviewMetadata(rendered.metadata ?? {});
        setPreviewCatalogKeys(rendered.requiredCatalogKeys ?? []);
        setPreviewUcem(rendered.ucem ?? null);
        return;
      } catch {
        /* cliente local */
      }
    }
    setServerFields([]);
    setPreviewRender(null);
    setPreviewMetadata({});
    setPreviewCatalogKeys([]);
    setPreviewUcem(null);
  }

  useEffect(() => {
    if (tab === 'preview') refreshPreview();
  }, [tab, previewData, fields, id]);

  const selected = selectedIdx != null ? fields[selectedIdx] : null;
  const learning = selected ? findComponentByType(selected.type) : null;

  const captureDisabled = formStatus !== 'draft' && !isNew;

  const buildErpMappingContext = (
    scope: ErpMappingInspectorContext['scope'],
    field?: FormFieldDefinition,
    fieldIndex?: number,
  ): ErpMappingInspectorContext => ({
    scope,
    fields,
    field,
    fieldIndex,
    value: dataMapping,
    processingType: captureConfig.metadata.processingType,
    disabled: captureDisabled,
    onChange: (next: DataMappingValue) => {
      setDataMapping(next);
      markDirty();
    },
    onFieldsChange: (next: FormFieldDefinition[]) => {
      setFields(next);
      markDirty();
    },
  });

  const buildWorkflowContext = (): WorkflowInspectorContext => ({
    value: workflowConfig,
    disabled: captureDisabled,
    onChange: (next: FormWorkflowDefinition) => {
      setWorkflowConfig(next);
      markDirty();
    },
  });

  const designInspectorSelections: InspectorSelection[] =
    designInspectorTarget === 'form'
      ? [
          {
            type: 'CAPTURE',
            context: {
              value: captureConfig,
              disabled: captureDisabled,
              onChange: (next: CaptureConfigurationValue) => {
                setCaptureConfig(next);
                markDirty();
              },
            },
          },
          {
            type: 'ERP_MAPPING',
            context: buildErpMappingContext('form'),
          },
          {
            type: 'WORKFLOW',
            context: buildWorkflowContext(),
          },
        ]
      : selected && selectedIdx != null
        ? [
            {
              type: 'FIELD',
              context: {
                field: selected,
                fieldIndex: selectedIdx,
                fields,
                sections,
                learning,
                onChange: (patch: Partial<FormFieldDefinition>) => updateField(selectedIdx, patch),
              },
            },
          ]
        : [];

  const tabs: { id: StudioTab; label: string }[] = [
    { id: 'design', label: 'Diseño' },
    { id: 'layout', label: 'Layout' },
    { id: 'components', label: 'Componentes' },
    { id: 'preview', label: 'Vista previa' },
    { id: 'simulator', label: 'Probar formulario' },
    { id: 'rules', label: 'JSON / Reglas' },
    ...(!isNew ? [{ id: 'versions' as const, label: 'Versiones' }] : []),
  ];

  return (
    <>
      <Header
        title={isNew ? 'Smart Form Studio — Nuevo' : `Smart Form Studio — ${name}`}
        subtitle="Plantillas · componentes · vista previa · simulador · versionado"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => setShowTemplates(true)}>Plantillas</button>
            {!isNew && formStatus === 'draft' && (
              <button type="button" className="btn" onClick={handleSubmitReview}>Enviar a revisión</button>
            )}
            {!isNew && (
              <button type="button" className="btn" onClick={handleSaveAsTemplate}>Guardar como plantilla</button>
            )}
            <button type="button" className="btn" onClick={() => navigate('/formularios')}>Mis Formularios</button>
            {(formStatus === 'draft' || isNew) && (id || savedFormId) && !dirty && (
              <button type="button" className="btn btn-primary" onClick={handlePublishFromDesigner}>Publicar</button>
            )}
            <button type="button" className="btn btn-primary" disabled={saving || (formStatus !== 'draft' && !isNew)} onClick={handleSave}>
              {saving ? 'Guardando…' : dirty || isNew ? 'Guardar borrador' : 'Guardar'}
            </button>
          </div>
        }
      />

      <TemplateLibraryModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={applyTemplate}
      />

      {templateLoaded && isNew && (
        <div className="alert alert-info">
          Plantilla cargada en el editor. Los cambios <strong>no están guardados</strong> hasta presionar «Guardar borrador».
        </div>
      )}

      {dirty && (
        <div className="alert alert-warning">Hay cambios sin guardar.</div>
      )}

      {lastSavedAt && !dirty && (
        <div className="alert alert-success form-save-success panel">
          <strong>Borrador guardado</strong>
          {savedVersion != null ? ` · v${savedVersion}` : ''}
          {' · '}
          {new Date(lastSavedAt).toLocaleString('es-CO')}
          <p className="muted">{getNextLifecycleHint(formStatus)}</p>
          <div className="row-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigate(`/formularios?saved=${savedFormId ?? id}`)}
            >
              Ver en Mis Formularios
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setTab('preview')}>Vista previa</button>
            {(formStatus === 'draft' || isNew) && (id || savedFormId) && (
              <button type="button" className="btn btn-sm btn-primary" onClick={handlePublishFromDesigner}>Publicar ahora</button>
            )}
          </div>
        </div>
      )}

      <section className="panel form-designer-lifecycle">
        <FormLifecycleStepper status={formStatus} compact highlightFrom={templateLoaded ? 'template' : undefined} />
      </section>

      {formStatus !== 'draft' && !isNew && (
        <div className="alert alert-warning">
          Estado: <strong>{formStatus}</strong>. Para editar, cree una <button type="button" className="btn-link" onClick={handleNewVersion}>nueva versión</button>.
        </div>
      )}
      {saveError && <div className="alert alert-danger">{saveError}</div>}

      <div className="form-studio-settings-bar panel">
        <label>
          Layout
          <select value={layoutMode} onChange={(e) => { setLayoutMode(e.target.value as typeof layoutMode); markDirty(); }} disabled={formStatus !== 'draft' && !isNew}>
            <option value="flat">Plano</option>
            <option value="tabs">Pestañas</option>
            <option value="accordion">Acordeón</option>
          </select>
        </label>
        <button type="button" className="btn btn-sm" onClick={() => setSections((s) => [...(s ?? []), { key: `sec_${(s?.length ?? 0) + 1}`, title: `Sección ${(s?.length ?? 0) + 1}` }])}>
          + Sección
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setTab('simulator')}>Probar formulario</button>
      </div>

      <nav className="tab-nav">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'design' && (
        <div className="designer-layout">
          <ComponentLibraryPanel onAdd={addField} selectedType={selected?.type} />

          <section className="designer-canvas panel">
            {isNew && (
              <div className="form-row">
                <input placeholder="form_key" value={formKey} onChange={(e) => { setFormKey(e.target.value); markDirty(); }} />
                <input placeholder="Nombre" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} />
              </div>
            )}
            <textarea placeholder="Descripción" value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} rows={2} />
            <div
              className={`designer-field designer-form-target ${designInspectorTarget === 'form' ? 'selected' : ''}`}
              onClick={() => {
                setDesignInspectorTarget('form');
                setSelectedIdx(null);
              }}
            >
              <strong>{name || formKey || 'Formulario'}</strong>
              <span className="muted">Capture · UCEM · Workflow · Offline · GPS · ERP</span>
            </div>
            <h3>Campos ({fields.length})</h3>
            {fields.map((f, idx) => (
              <div
                key={`${f.key}-${idx}`}
                className={`designer-field ${designInspectorTarget === 'field' && selectedIdx === idx ? 'selected' : ''}`}
                onClick={() => {
                  setDesignInspectorTarget('field');
                  setSelectedIdx(idx);
                }}
              >
                <strong>{f.label}</strong> <span className="muted">({f.type})</span>
                {f.visibleWhen ? <span className="badge">condicional</span> : null}
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); moveField(idx, -1); }}>↑</button>
                  <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); moveField(idx, 1); }}>↓</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); removeField(idx); }}>×</button>
                </div>
              </div>
            ))}
          </section>

          <InspectorPanel
            variant="design"
            emptyMessage="Seleccione el formulario o un campo para editar propiedades."
            selections={designInspectorSelections}
          />
        </div>
      )}

      {tab === 'layout' && (
        <LayoutBuilder
          layout={layout}
          fields={fields}
          disabled={formStatus !== 'draft' && !isNew}
          onLayoutChange={(next) => {
            setLayout(next);
            markDirty();
          }}
          onFieldsChange={(next) => {
            setFields(next);
            markDirty();
          }}
        />
      )}

      {tab === 'components' && (
        <div className="designer-layout">
          <ComponentLibraryPanel onAdd={(f) => { addField(f); setTab('design'); }} />
          <section className="panel">
            <h3>Catálogo de componentes Enterprise</h3>
            <p className="muted">Clic para agregar al formulario. Clic derecho en un componente (en Diseño) para ver modo aprendizaje.</p>
            <p>Listas dinámicas en cadena: País → Departamento → Municipio → Vereda → Finca → Lote.</p>
          </section>
        </div>
      )}

      {tab === 'preview' && (() => {
        const localPayload = captureValueToPayload(captureConfig);
        const displaySettings = previewRender?.settings ?? buildSchema().settings;
        const displayMetadata = (previewMetadata as FormCaptureMetadata).processingType
          ? previewMetadata
          : localPayload.metadata;
        const displayCatalogKeys = previewCatalogKeys.length
          ? previewCatalogKeys
          : localPayload.requiredCatalogKeys;
        const clientUcem = buildClientUcemPreview(
          fields,
          dataMapping.entityMapping,
          dataMapping.universalCatalogs,
        );
        const displayUcem = previewUcem?.fieldOrigins?.length
          ? previewUcem
          : {
              entityMapping: dataMapping.entityMapping,
              universalCatalogs: dataMapping.universalCatalogs,
              fieldOrigins: clientUcem,
            };
        return (
        <>
          <UcemPreviewBanner
            fieldOrigins={displayUcem.fieldOrigins}
            targetEntity={displayUcem.entityMapping?.targetEntity}
          />
          <div className="panel capture-preview-package">
            <h3>Paquete Capture (vista previa)</h3>
            <p className="muted">Misma estructura que consume Android: <code>render</code> + <code>settings</code> + <code>metadata</code>.</p>
            <div className="capture-preview-meta">
              <div>
                <strong>processingType</strong>
                <span>{String((displayMetadata as FormCaptureMetadata).processingType ?? '—')}</span>
              </div>
              <div>
                <strong>requiredCatalogKeys</strong>
                <span>{displayCatalogKeys.length ? displayCatalogKeys.join(', ') : '—'}</span>
              </div>
              <div>
                <strong>Offline</strong>
                <span>
                  {displaySettings?.allowOffline !== false ? 'allowOffline' : 'off'}
                  {' · '}
                  {displaySettings?.allowDraft !== false ? 'allowDraft' : 'no draft'}
                  {' · '}
                  {displaySettings?.requiresSync ? 'requiresSync' : 'sync opcional'}
                </span>
              </div>
              <div>
                <strong>GPS</strong>
                <span>
                  {displaySettings?.location?.enabled
                    ? `enabled${displaySettings.location.required ? ' (required)' : ''} · ${displaySettings.location.accuracy ?? 50}m`
                    : 'disabled'}
                </span>
              </div>
            </div>
          </div>
          <FormStudioPreview device={previewDevice} onDeviceChange={setPreviewDevice}>
            <FormStudioRenderer
              fields={fields}
              layout={layout}
              data={previewRender?.resolvedData ?? previewData}
              serverFields={serverFields.length ? serverFields : undefined}
              onChange={(key, val) => setPreviewData((d) => ({ ...d, [key]: val }))}
              onButtonAction={(action, field) => {
                if (action === 'reset') setPreviewData({});
                if (action === 'link') {
                  const url = field.metadata?.url ?? field.description;
                  if (url) window.open(String(url), '_blank', 'noopener,noreferrer');
                }
              }}
            />
          </FormStudioPreview>
        </>
        );
      })()}

      {tab === 'simulator' && (
        <FormSimulator fields={fields} layout={layout} formName={name || 'Formulario'} />
      )}

      {tab === 'rules' && (
        <div className="panel">
          <p>Esquema JSON compatible con Web y móvil. Las reglas <code>visibleWhen</code> / <code>requiredWhen</code> se evalúan en servidor y cliente.</p>
          <h4>Schema</h4>
          <pre className="code-block">{JSON.stringify(buildSchema(), null, 2)}</pre>
          <h4>Layout</h4>
          <pre className="code-block">{JSON.stringify(layout, null, 2)}</pre>
          <h4>Capture metadata</h4>
          <pre className="code-block">{JSON.stringify(buildSavePayload().metadata, null, 2)}</pre>
        </div>
      )}

      {tab === 'versions' && (
        <div className="panel">
          <div className="row-actions" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleNewVersion}>Nueva versión (clonar)</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Versión</th><th>Estado</th><th>Creado</th><th>Publicado</th></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version}</td>
                  <td>{FORM_STATUS_LABELS[v.status] ?? v.status}</td>
                  <td>{new Date(v.createdAt).toLocaleString()}</td>
                  <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
