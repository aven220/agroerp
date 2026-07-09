import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';
import { ComponentLibraryPanel } from '../form-studio/ComponentLibraryPanel';
import { FormSimulator } from '../form-studio/FormSimulator';
import { FormStudioCanvas } from '../form-studio/FormStudioCanvas';
import { FormStudioPreview, type PreviewDevice } from '../form-studio/FormStudioPreview';
import { FormStudioRenderer } from '../form-studio/FormStudioRenderer';
import { FormStudioToolbar } from '../form-studio/FormStudioToolbar';
import { labelProcessingType, LAYOUT_MODE_LABELS } from '../form-studio/studio-labels';
import {
  captureValueFromForm,
  captureValueToPayload,
  type CaptureConfigurationValue,
} from '../form-studio/CaptureConfigurationPanel';
import { useToast } from '../context/ToastContext';
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
import { FORM_STATUS_LABELS } from '../form-studio/form-lifecycle';
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
  const presetTab = searchParams.get('tab') as StudioTab | null;
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
  const [tab, setTab] = useState<StudioTab>(presetTab ?? 'design');

  useEffect(() => {
    if (presetTab && ['design', 'layout', 'preview', 'simulator', 'components', 'rules', 'versions'].includes(presetTab)) {
      setTab(presetTab);
    }
  }, [presetTab]);
  const [showTemplates, setShowTemplates] = useState(isNew || openTemplatesOnLoad);
  const [versions, setVersions] = useState<FormVersionHistoryItem[]>([]);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getForm(id)
      .then((f) => {
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
        setSaveError(null);
      })
      .catch((err) => {
        setSaveError(err instanceof Error ? err.message : 'No se pudo cargar el formulario');
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
    try {
      await publishForm(targetId);
      setFormStatus('published');
      toast.success('Publicado. Verifique en Mis Formularios → Verificar sync.', 'Publicado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar');
    }
  }

  async function handleSaveAsTemplate() {
    const templateKey = prompt('Nombre interno de la plantilla:', `${formKey}-plantilla`);
    if (!templateKey) return;
    try {
      await saveAsTemplate({
        templateKey,
        name: name || templateKey,
        description,
        schema: buildSchema(),
        tags: ['studio', 'custom'],
      });
      toast.success('Plantilla guardada en la biblioteca.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la plantilla');
    }
  }

  async function handleNewVersion() {
    if (!formKey) return;
    try {
      const created = await newFormVersion(formKey);
      navigate(`/formularios/${created.id}/disenar`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la nueva versión');
    }
  }

  async function handleSubmitReview() {
    if (!id) return;
    try {
      await submitFormForReview(id);
      setFormStatus('in_review');
      toast.success('Formulario enviado a revisión.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar a revisión');
    }
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if ((formStatus === 'draft' || isNew) && !saving) handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setTab('preview');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setTab('simulator');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- atajos de teclado del estudio
  }, [formStatus, isNew, saving]);

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

  const studioTabs = [
    { id: 'design', label: 'Diseño', icon: '✏️' },
    { id: 'layout', label: 'Estructura', icon: '📐' },
    { id: 'preview', label: 'Vista previa', icon: '👁' },
    { id: 'simulator', label: 'Simular', icon: '🧪' },
    ...(!isNew ? [{ id: 'versions', label: 'Historial', icon: '📋' }] : []),
  ];

  const canSave = formStatus === 'draft' || isNew;
  const canPublish = (formStatus === 'draft' || isNew) && Boolean(id || savedFormId);

  return (
    <div className="fs-studio">
      <FormStudioToolbar
        formName={name || 'Nuevo formulario'}
        formKey={formKey}
        status={formStatus}
        dirty={dirty}
        saving={saving}
        lastSavedAt={lastSavedAt}
        activeTab={tab}
        tabs={studioTabs}
        canSave={canSave}
        canPublish={canPublish}
        onTabChange={(t) => setTab(t as StudioTab)}
        onBack={() => navigate('/formularios')}
        onSave={handleSave}
        onPublish={handlePublishFromDesigner}
        onPreview={() => setTab('preview')}
        onSimulate={() => setTab('simulator')}
        onTemplates={() => setShowTemplates(true)}
        onHistory={!isNew ? () => setTab('versions') : undefined}
        onSettings={() => setDesignInspectorTarget('form')}
      />

      <div className="fs-studio-body">
      <TemplateLibraryModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={applyTemplate}
      />

      {saveError ? <div className="alert alert-danger" style={{ margin: '0.5rem 1rem' }}>{saveError}</div> : null}

      {formStatus !== 'draft' && !isNew ? (
        <div className="alert alert-warning" style={{ margin: '0.5rem 1rem' }}>
          Este formulario está publicado. Para editar, cree una{' '}
          <button type="button" className="btn-link" onClick={handleNewVersion}>nueva versión</button>.
        </div>
      ) : null}

      {(tab === 'design' || tab === 'layout') ? (
        <div className="fs-studio-settings">
          <label>
            Presentación
            <select
              value={layoutMode}
              onChange={(e) => { setLayoutMode(e.target.value as typeof layoutMode); markDirty(); }}
              disabled={formStatus !== 'draft' && !isNew}
            >
              {Object.entries(LAYOUT_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="fs-action-btn"
            onClick={() =>
              setSections((s) => [
                ...(s ?? []),
                { key: `sec_${(s?.length ?? 0) + 1}`, title: `Sección ${(s?.length ?? 0) + 1}` },
              ])
            }
          >
            + Sección
          </button>
          {!isNew && formStatus === 'draft' ? (
            <button type="button" className="fs-action-btn" onClick={handleSubmitReview}>
              Enviar a revisión
            </button>
          ) : null}
          {!isNew ? (
            <button type="button" className="fs-action-btn" onClick={handleSaveAsTemplate}>
              Guardar como plantilla
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'design' && (
        <div className="fs-studio-workspace">
          <ComponentLibraryPanel onAdd={addField} selectedType={selected?.type} />

          <FormStudioCanvas
            isNew={isNew}
            formKey={formKey}
            name={name}
            description={description}
            fields={fields}
            selectedIdx={selectedIdx}
            formSelected={designInspectorTarget === 'form'}
            onFormKeyChange={(v) => { setFormKey(v); markDirty(); }}
            onNameChange={(v) => { setName(v); markDirty(); }}
            onDescriptionChange={(v) => { setDescription(v); markDirty(); }}
            onSelectForm={() => {
              setDesignInspectorTarget('form');
              setSelectedIdx(null);
            }}
            onSelectField={(idx) => {
              setDesignInspectorTarget('field');
              setSelectedIdx(idx);
            }}
            onMoveField={moveField}
            onRemoveField={removeField}
          />

          <InspectorPanel
            variant="design"
            className="fs-inspector"
            emptyMessage="Seleccione el formulario o un campo para editar sus propiedades."
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
        const processingCode = (displayMetadata as FormCaptureMetadata).processingType;
        return (
          <div style={{ padding: '1rem' }}>
            <UcemPreviewBanner
              fieldOrigins={displayUcem.fieldOrigins}
              targetEntity={displayUcem.entityMapping?.targetEntity}
            />
            <div className="fs-preview-package">
              <div className="fs-preview-package-item">
                <strong>Al enviar</strong>
                <span>{labelProcessingType(processingCode)}</span>
              </div>
              <div className="fs-preview-package-item">
                <strong>Catálogos</strong>
                <span>{displayCatalogKeys.length ? `${displayCatalogKeys.length} requeridos` : 'Ninguno'}</span>
              </div>
              <div className="fs-preview-package-item">
                <strong>Sin conexión</strong>
                <span>{displaySettings?.allowOffline !== false ? 'Permitido' : 'No permitido'}</span>
              </div>
              <div className="fs-preview-package-item">
                <strong>Ubicación</strong>
                <span>
                  {displaySettings?.location?.enabled
                    ? `Activa${displaySettings.location.required ? ' (obligatoria)' : ''}`
                    : 'Desactivada'}
                </span>
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
          </div>
        );
      })()}

      {tab === 'simulator' && (
        <div style={{ padding: '1rem' }}>
          <FormSimulator fields={fields} layout={layout} formName={name || 'Formulario'} />
        </div>
      )}

      {tab === 'rules' && (
        <div className="panel" style={{ margin: '1rem' }}>
          <div className="fs-rules-summary">
            <div className="fs-rules-card">
              <h4>Resumen del formulario</h4>
              <p className="muted">{fields.length} campos · {sections?.length ?? 0} secciones · Presentación: {LAYOUT_MODE_LABELS[layoutMode]}</p>
              <p className="muted">
                Campos condicionales: {fields.filter((f) => f.visibleWhen || f.requiredWhen).length}
              </p>
            </div>
            <div className="fs-rules-card">
              <h4>Al enviar</h4>
              <p>{labelProcessingType(captureConfig.metadata.processingType)}</p>
            </div>
          </div>
          <details className="fs-rules-dev">
            <summary>Vista técnica (solo para soporte)</summary>
            <pre className="code-block" style={{ maxHeight: 240, overflow: 'auto' }}>
              {JSON.stringify({ fields: fields.length, layout: layout.length }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {tab === 'versions' && (
        <div className="panel" style={{ margin: '1rem' }}>
          <section className="form-designer-lifecycle" style={{ marginBottom: '1rem' }}>
            <FormLifecycleStepper status={formStatus} compact />
          </section>
          <div className="row-actions" style={{ marginBottom: '1rem' }}>
            <button type="button" className="fs-action-btn fs-action-primary" onClick={handleNewVersion}>
              Nueva versión
            </button>
          </div>
          <table className="data-table">
            <thead><tr><th>Versión</th><th>Estado</th><th>Creado</th><th>Publicado</th></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version}</td>
                  <td>{FORM_STATUS_LABELS[v.status] ?? v.status}</td>
                  <td>{new Date(v.createdAt).toLocaleString('es-CO')}</td>
                  <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleString('es-CO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
