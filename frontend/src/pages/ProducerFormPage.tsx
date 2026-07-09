import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EnterpriseForm } from '../components/data-workspace/EnterpriseForm';
import { FlowProgress } from '../components/flow/FlowProgress';
import {
  checkDuplicate,
  createProducer,
  getProducer,
  updateProducer,
  type CreateProducerPayload,
} from '../api/prm';
import { markProcessMilestone } from '../lib/processWorkspace';

const emptyForm: CreateProducerPayload = {
  producerTypeCode: 'natural',
  legalName: '',
  documentTypeCode: 'CC',
  documentNumber: '',
  firstName: '',
  lastName: '',
  municipalityCode: '',
  veredaCode: '',
  categoryCode: '',
  yearsExperience: undefined,
  notes: '',
};

export function ProducerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<CreateProducerPayload>(emptyForm);
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const savedSnapshot = useRef(JSON.stringify(emptyForm));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getProducer(id)
      .then((p) => {
        const next = {
          producerTypeCode: p.producerTypeCode,
          legalName: p.legalName,
          commercialName: p.commercialName ?? undefined,
          firstName: p.firstName ?? undefined,
          lastName: p.lastName ?? undefined,
          documentTypeCode: p.documentTypeCode,
          documentNumber: p.documentNumber,
          taxId: p.taxId ?? undefined,
          municipalityCode: p.municipalityCode ?? undefined,
          veredaCode: p.veredaCode ?? undefined,
          categoryCode: p.categoryCode ?? undefined,
          leadSourceCode: p.leadSourceCode ?? undefined,
          yearsExperience: p.yearsExperience ?? undefined,
          latitude: p.latitude != null ? Number(p.latitude) : undefined,
          longitude: p.longitude != null ? Number(p.longitude) : undefined,
          notes: p.notes ?? undefined,
        };
        setForm(next);
        savedSnapshot.current = JSON.stringify(next);
        setVersion(p.version);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el productor');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const dirty = JSON.stringify(form) !== savedSnapshot.current;

  const progress = useMemo(() => {
    const required = [form.legalName, form.documentNumber, form.producerTypeCode, form.documentTypeCode];
    const filled = required.filter(Boolean).length;
    const optional = [form.municipalityCode, form.categoryCode, form.notes].filter(Boolean).length;
    return Math.min(100, Math.round(((filled / required.length) * 70) + (optional * 10)));
  }, [form]);

  async function handleDocBlur() {
    if (!form.documentNumber) return;
    const result = await checkDuplicate(form.documentNumber, id);
    if (result.duplicate && result.existing) {
      setDupWarning(
        `Documento duplicado: ${result.existing.producerNumber} — ${result.existing.legalName}`,
      );
    } else {
      setDupWarning(null);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        await updateProducer(id, { ...form, version });
        navigate(`/productores/${id}`);
      } else {
        const created = await createProducer(form);
        markProcessMilestone('agricultural', 'producer', {
          entityId: created.id,
          entityName: form.legalName,
          entityType: 'producer',
        });
        navigate(`/productores/${created.id}?paso=completado`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof CreateProducerPayload>(key: K, value: CreateProducerPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCancel() {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Salir sin guardar?')) return;
    navigate(-1);
  }

  return (
    <>
      <Header
        title={isEdit ? 'Editar productor' : 'Nuevo productor'}
        subtitle={
          isEdit
            ? 'Actualice los datos del productor. Los cambios se guardan al confirmar.'
            : 'Complete los datos básicos. Después podrá registrar las fincas asociadas.'
        }
      />

      {!isEdit ? <FlowProgress flowId="agricultural" currentStepId="producer" /> : null}

      <EnterpriseForm
        title={isEdit ? 'Expediente del productor' : 'Registro de nuevo productor'}
        progress={progress}
        dirty={dirty}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel={saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear productor'}
        sections={[
          {
            id: 'identification',
            title: 'Identificación',
            description: 'Datos legales y documento',
            content: (
              <div className="form-grid">
                <label>
                  Tipo productor *
                  <select
                    value={form.producerTypeCode}
                    onChange={(e) => set('producerTypeCode', e.target.value)}
                    required
                  >
                    <option value="natural">Persona natural</option>
                    <option value="juridica">Persona jurídica</option>
                    <option value="asociacion">Asociación</option>
                  </select>
                </label>
                <label>
                  Nombre legal *
                  <input
                    value={form.legalName}
                    onChange={(e) => set('legalName', e.target.value)}
                    required
                  />
                </label>
                <label>
                  Primer nombre
                  <input value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} />
                </label>
                <label>
                  Apellidos
                  <input value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} />
                </label>
                <label>
                  Tipo documento *
                  <select
                    value={form.documentTypeCode}
                    onChange={(e) => set('documentTypeCode', e.target.value)}
                  >
                    <option value="CC">Cédula</option>
                    <option value="CE">Cédula extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </label>
                <label>
                  Número documento *
                  <input
                    value={form.documentNumber}
                    onChange={(e) => set('documentNumber', e.target.value)}
                    onBlur={handleDocBlur}
                    required
                  />
                </label>
                {dupWarning ? <div className="alert alert-warn full-width">{dupWarning}</div> : null}
                <label>
                  NIT / RUT
                  <input value={form.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} />
                </label>
              </div>
            ),
          },
          {
            id: 'location',
            title: 'Ubicación',
            description: 'Indique dónde opera el productor',
            content: (
              <div className="form-grid">
                <label>
                  Municipio
                  <input
                    value={form.municipalityCode ?? ''}
                    onChange={(e) => set('municipalityCode', e.target.value)}
                    placeholder="Ej. Medellín o código DANE 05001"
                    aria-describedby="producer-muni-hint"
                  />
                  <small id="producer-muni-hint" className="muted">
                    Escriba el nombre del municipio o su código oficial si lo conoce.
                  </small>
                </label>
                <label>
                  Vereda o corregimiento
                  <input
                    value={form.veredaCode ?? ''}
                    onChange={(e) => set('veredaCode', e.target.value)}
                    placeholder="Ej. El Progreso"
                  />
                </label>
                <label>
                  Latitud (opcional)
                  <input
                    type="number"
                    step="any"
                    value={form.latitude ?? ''}
                    onChange={(e) => set('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="6.2442"
                  />
                </label>
                <label>
                  Longitud (opcional)
                  <input
                    type="number"
                    step="any"
                    value={form.longitude ?? ''}
                    onChange={(e) => set('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="-75.5812"
                  />
                </label>
              </div>
            ),
          },
          {
            id: 'commercial',
            title: 'Comercial',
            description: 'Categoría y experiencia',
            content: (
              <div className="form-grid">
                <label>
                  Categoría comercial
                  <select
                    value={form.categoryCode ?? ''}
                    onChange={(e) => set('categoryCode', e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    <option value="A">Categoría A — alto volumen</option>
                    <option value="B">Categoría B — medio volumen</option>
                    <option value="C">Categoría C — bajo volumen</option>
                  </select>
                </label>
                <label>
                  Años experiencia
                  <input
                    type="number"
                    min={0}
                    value={form.yearsExperience ?? ''}
                    onChange={(e) =>
                      set('yearsExperience', e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                  />
                </label>
                <label className="full-width">
                  Observaciones
                  <textarea
                    value={form.notes ?? ''}
                    onChange={(e) => set('notes', e.target.value)}
                    rows={4}
                  />
                </label>
              </div>
            ),
          },
        ]}
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
    </>
  );
}
