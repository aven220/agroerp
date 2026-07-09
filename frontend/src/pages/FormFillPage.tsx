import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { FormFieldControl } from '../components/forms/FormFieldControl';
import { MobileFormWizard } from '../components/mobile/MobileFormWizard';
import { useMobileOptional } from '../context/MobileContext';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { getForm, renderForm, submitForm } from '../api/forms';
import type { FormFieldDefinition } from '../api/forms';
import { UDFE_LAYOUT_FIELD_TYPES } from '../api/forms';
import { markProcessMilestone } from '../lib/processWorkspace';

const LAYOUT = new Set<string>(UDFE_LAYOUT_FIELD_TYPES);

type RenderedField = FormFieldDefinition & { visible?: boolean; effectiveRequired?: boolean; computedValue?: unknown };

function buildWizardSteps(
  fields: RenderedField[],
  data: Record<string, unknown>,
  onChange: (k: string, v: unknown) => void,
) {
  const visible = fields.filter((f) => f.visible !== false);
  const steps: Array<{ id: string; title: string; content: ReactNode }> = [];
  let currentTitle = 'Datos generales';
  let bucket: RenderedField[] = [];

  const flush = () => {
    if (!bucket.length) return;
    const id = `step-${steps.length}`;
    const chunk = [...bucket];
    steps.push({
      id,
      title: currentTitle,
      content: chunk.map((f) => (
        <FormFieldControl key={f.key} field={f} value={data[f.key]} onChange={onChange} />
      )),
    });
    bucket = [];
  };

  for (const field of visible) {
    if (LAYOUT.has(field.type) && field.type === 'heading') {
      flush();
      currentTitle = field.label;
      continue;
    }
    if (LAYOUT.has(field.type) && field.type !== 'heading') {
      bucket.push(field);
      continue;
    }
    bucket.push(field);
    if (bucket.length >= 5) flush();
  }
  flush();

  if (steps.length === 0) {
    steps.push({
      id: 'all',
      title: 'Formulario',
      content: visible.map((f) => (
        <FormFieldControl key={f.key} field={f} value={data[f.key]} onChange={onChange} />
      )),
    });
  }
  return steps;
}

export function FormFillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mobile = useMobileOptional();
  const device = useDeviceCapabilities();
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Array<Parameters<typeof FormFieldControl>[0]['field']>>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const draftKey = `agroerp_form_draft_${id}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { data: Record<string, unknown>; draftId?: string };
        setData(parsed.data);
        setDraftId(parsed.draftId ?? null);
      } catch { /* ignore */ }
    }
    getForm(id).then(async (f) => {
      setName(f.name);
      const rendered = await renderForm(id, {});
      setFields(rendered.fields);
    });
  }, [id]);

  async function refreshRender() {
    if (!id) return;
    const rendered = await renderForm(id, data);
    setFields(rendered.fields);
  }

  function handleChange(key: string, value: unknown) {
    setDirty(true);
    setData((d) => ({ ...d, [key]: value }));
  }

  useEffect(() => {
    const t = setTimeout(() => { refreshRender(); }, 300);
    return () => clearTimeout(t);
  }, [data, id]);

  useEffect(() => {
    if (!id || !dirty) return;
    const draftKey = `agroerp_form_draft_${id}`;
    localStorage.setItem(draftKey, JSON.stringify({ data, draftId }));
  }, [data, id, dirty, draftId]);

  async function handleSubmit(draft = false) {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      let gpsLocation: { lat: number; lng: number; accuracy?: number } | undefined;
      const gps = await device.getGPS();
      if (gps) gpsLocation = gps;

      if (!mobile?.online && mobile?.enqueueDraft) {
        const item = mobile.enqueueDraft({
          type: draft ? 'form_draft' : 'form_submit',
          label: `${name || 'Formulario'}${draft ? ' (borrador)' : ''}`,
          route: `/formularios/${id}/llenar`,
          payload: { formId: id, data, draft, gpsLocation },
        });
        setDraftId(item.id);
        navigate('/formularios/envios');
        return;
      }

      await submitForm(id, { data, draft, gpsLocation, context: {} });
      localStorage.removeItem(`agroerp_form_draft_${id}`);
      markProcessMilestone('forms', 'capture', {
        entityId: id,
        entityName: name,
        entityType: 'form_submission',
      });
      markProcessMilestone('agricultural', 'activity', {
        entityName: name,
        entityType: 'form_capture',
      });
      navigate('/formularios/recoleccion?paso=completado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
      if (draftId && mobile?.updateQueueItem) {
        mobile.updateQueueItem(draftId, { status: 'failed', error: String(err) });
      }
    } finally {
      setSaving(false);
    }
  }

  const wizardSteps = useMemo(
    () => buildWizardSteps(fields, data, handleChange),
    [fields, data],
  );

  const formBody = fields
    .filter((f) => f.visible !== false)
    .map((f) => (
    <FormFieldControl
      key={f.key}
      field={f}
      value={data[f.key]}
      onChange={handleChange}
      onButtonAction={(action, field) => {
        if (action === 'reset') {
          setData({});
          setDirty(true);
          return;
        }
        if (action === 'draft') {
          void handleSubmit(true);
          return;
        }
        if (action === 'submit') {
          void handleSubmit(false);
          return;
        }
        if (action === 'link') {
          const url = field.metadata?.url ?? field.description;
          if (url) window.open(String(url), '_blank', 'noopener,noreferrer');
        }
      }}
    />
  ));

  return (
    <>
      {!mobile?.isMobile ? (
        <>
          <Header
            title={name || 'Formulario'}
            subtitle="Complete los campos y envíe para registrar la actividad"
            actions={
              <button type="button" className="btn" onClick={() => navigate(-1)}>Cancelar</button>
            }
          />
          <FlowProgress flowId="forms" currentStepId="capture" compact />
        </>
      ) : null}
      {error && <div className="alert alert-error">{error}</div>}
      {mobile?.isMobile ? (
        <MobileFormWizard
          title={name || 'Formulario'}
          steps={wizardSteps}
          dirty={dirty}
          saving={saving}
          onCancel={() => {
            if (dirty && !confirm('¿Salir sin guardar?')) return;
            navigate(-1);
          }}
          onSaveDraft={() => handleSubmit(true)}
          onSubmit={() => handleSubmit(false)}
        />
      ) : (
        <form
          className="form-panel"
          onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}
        >
          {formBody}
          <div className="row-actions">
            <button type="button" className="btn" disabled={saving} onClick={() => handleSubmit(true)}>
              Guardar borrador
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
