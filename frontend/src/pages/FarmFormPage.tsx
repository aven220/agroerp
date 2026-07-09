import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowProgress } from '../components/flow/FlowProgress';
import { createFarm, getFarm, setFarmGeometry, updateFarm } from '../api/ftip';
import { notifyEntityUpdated } from '../lib/entitySync';
import { listProducers } from '../api/prm';
import { markProcessMilestone } from '../lib/processWorkspace';

interface FarmFormState {
  farmName: string;
  farmTypeCode: string;
  municipalityCode: string;
  veredaCode: string;
  streetAddress: string;
  totalAreaHa?: number;
  agriculturalAreaHa?: number;
  tenureTypeCode: string;
  observations: string;
  producerId: string;
  centroidLatitude?: number;
  centroidLongitude?: number;
  boundaryGeoJson: string;
}

const emptyForm: FarmFormState = {
  farmName: '',
  farmTypeCode: 'coffee_estate',
  municipalityCode: '',
  veredaCode: '',
  streetAddress: '',
  tenureTypeCode: 'owned',
  observations: '',
  producerId: '',
  boundaryGeoJson: '',
};

export function FarmFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProducerId = searchParams.get('productor') ?? '';
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FarmFormState>(emptyForm);
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [producers, setProducers] = useState<Array<{ id: string; legalName: string }>>([]);

  useEffect(() => {
    listProducers({ limit: 200 }).then((r) =>
      setProducers(r.items.map((p) => ({ id: p.id, legalName: p.legalName }))),
    );
  }, []);

  useEffect(() => {
    if (!isEdit && presetProducerId) {
      setForm((f) => ({ ...f, producerId: presetProducerId }));
    }
  }, [isEdit, presetProducerId]);

  useEffect(() => {
    if (!id) return;
    getFarm(id).then((f) => {
      setForm({
        farmName: f.farmName,
        farmTypeCode: f.farmTypeCode,
        municipalityCode: f.municipalityCode ?? '',
        veredaCode: f.veredaCode ?? '',
        streetAddress: '',
        totalAreaHa: f.totalAreaHa != null ? Number(f.totalAreaHa) : undefined,
        agriculturalAreaHa: f.agriculturalAreaHa != null ? Number(f.agriculturalAreaHa) : undefined,
        tenureTypeCode: f.tenureTypeCode ?? 'owned',
        observations: f.observations ?? '',
        producerId: f.producerLinks?.[0]?.producerId ?? '',
        centroidLatitude: f.centroidLatitude != null ? Number(f.centroidLatitude) : undefined,
        centroidLongitude: f.centroidLongitude != null ? Number(f.centroidLongitude) : undefined,
        boundaryGeoJson: f.boundaryGeo ? JSON.stringify(f.boundaryGeo, null, 2) : '',
      });
      setVersion(f.version);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        farmName: form.farmName,
        farmTypeCode: form.farmTypeCode,
        municipalityCode: form.municipalityCode || undefined,
        veredaCode: form.veredaCode || undefined,
        streetAddress: form.streetAddress || undefined,
        totalAreaHa: form.totalAreaHa,
        agriculturalAreaHa: form.agriculturalAreaHa,
        tenureTypeCode: form.tenureTypeCode || undefined,
        observations: form.observations || undefined,
        centroidLatitude: form.centroidLatitude,
        centroidLongitude: form.centroidLongitude,
      };

      if (isEdit && id) {
        await updateFarm(id, { ...payload, version });
        if (form.boundaryGeoJson.trim()) {
          const geometry = JSON.parse(form.boundaryGeoJson);
          await setFarmGeometry(id, { geometryGeo: geometry });
        }
        notifyEntityUpdated('farm', id);
        navigate(`/fincas/${id}`);
      } else {
        if (form.producerId) payload.producerId = form.producerId;
        const created = await createFarm(payload);
        if (form.boundaryGeoJson.trim()) {
          const geometry = JSON.parse(form.boundaryGeoJson);
          await setFarmGeometry(created.id, { geometryGeo: geometry });
        }
        notifyEntityUpdated('farm', created.id);
        markProcessMilestone('agricultural', 'farm', {
          entityId: created.id,
          entityName: form.farmName,
          entityType: 'farm',
        });
        navigate(`/fincas/${created.id}?paso=completado`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          centroidLatitude: pos.coords.latitude,
          centroidLongitude: pos.coords.longitude,
        }));
      },
      () => setError('No se pudo obtener GPS'),
    );
  }

  return (
    <>
      <Header
        title={isEdit ? 'Editar finca' : 'Nueva finca'}
        subtitle={
          isEdit
            ? 'Actualice datos de la finca. Los cambios se guardan al confirmar.'
            : 'Registre la finca del productor. Después podrá crear los lotes productivos.'
        }
        actions={
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        }
      />

      {!isEdit ? <FlowProgress flowId="agricultural" currentStepId="farm" /> : null}

      <form onSubmit={handleSubmit} className="form-page form-grid">
        {!isEdit && (
          <label>
            Productor asociado
            <select
              value={form.producerId}
              onChange={(e) => setForm({ ...form, producerId: e.target.value })}
            >
              <option value="">Sin asociar</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Nombre finca *
          <input
            value={form.farmName}
            onChange={(e) => setForm({ ...form, farmName: e.target.value })}
            required
          />
        </label>
        <label>
          Tipo
          <select
            value={form.farmTypeCode}
            onChange={(e) => setForm({ ...form, farmTypeCode: e.target.value })}
          >
            <option value="coffee_estate">Finca cafetera</option>
            <option value="mixed_farm">Finca mixta</option>
            <option value="plot">Lote independiente</option>
          </select>
        </label>
        <label>
          Municipio
          <input
            value={form.municipalityCode}
            onChange={(e) => setForm({ ...form, municipalityCode: e.target.value })}
            placeholder="Ej. Medellín o código DANE 05001"
          />
        </label>
        <label>
          Vereda o corregimiento
          <input
            value={form.veredaCode}
            onChange={(e) => setForm({ ...form, veredaCode: e.target.value })}
            placeholder="Ej. El Progreso"
          />
        </label>
        <label>
          Área total (ha)
          <input
            type="number"
            step="0.01"
            value={form.totalAreaHa ?? ''}
            onChange={(e) =>
              setForm({ ...form, totalAreaHa: Number(e.target.value) || undefined })
            }
          />
        </label>
        <label>
          Área agrícola (ha)
          <input
            type="number"
            step="0.01"
            value={form.agriculturalAreaHa ?? ''}
            onChange={(e) =>
              setForm({ ...form, agriculturalAreaHa: Number(e.target.value) || undefined })
            }
          />
        </label>
        <label>
          Tenencia
          <select
            value={form.tenureTypeCode}
            onChange={(e) => setForm({ ...form, tenureTypeCode: e.target.value })}
          >
            <option value="owned">Propia</option>
            <option value="leased">Arrendada</option>
            <option value="usufruct">Usufructo</option>
          </select>
        </label>

        <div className="form-section">
          <h3>Ubicación GPS</h3>
          <div className="row-actions">
            <button type="button" className="btn btn-sm" onClick={captureGps}>
              Capturar GPS
            </button>
            <span className="muted">
              {form.centroidLatitude != null
                ? `${form.centroidLatitude.toFixed(6)}, ${form.centroidLongitude?.toFixed(6)}`
                : 'Sin coordenadas'}
            </span>
          </div>
        </div>

        <details className="form-advanced-section form-full">
          <summary>Delimitación de la finca (opcional)</summary>
          <label style={{ display: 'block', marginTop: '0.75rem' }}>
            Contorno del predio
            <textarea
              value={form.boundaryGeoJson}
              onChange={(e) => setForm({ ...form, boundaryGeoJson: e.target.value })}
              rows={6}
              placeholder="Opcional. Puede registrar el perímetro más adelante desde el mapa."
            />
          </label>
        </details>

        <label className="form-full">
          Observaciones
          <textarea
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            rows={3}
          />
        </label>

        {error && <div className="alert alert-error form-full">{error}</div>}

        <div className="form-actions form-full">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar finca'}
          </button>
        </div>
      </form>
    </>
  );
}
