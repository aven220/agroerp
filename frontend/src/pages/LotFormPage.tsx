import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowProgress } from '../components/flow/FlowProgress';
import { createLot, getEligibleFtipLots, getLot, setLotGeometry, updateLot } from '../api/fmdt';
import { listFarms } from '../api/ftip';
import { listProducers } from '../api/prm';
import { markProcessMilestone } from '../lib/processWorkspace';

interface LotFormState {
  ftipLotUnitId: string;
  lotName: string;
  lotTypeCode: string;
  primaryCropCode: string;
  varietyCodes: string;
  totalAreaHa?: number;
  cultivableAreaHa?: number;
  plantedAreaHa?: number;
  responsibleProducerId: string;
  soilTypeCode: string;
  observations: string;
  centroidLatitude?: number;
  centroidLongitude?: number;
  boundaryGeoJson: string;
}

const emptyForm: LotFormState = {
  ftipLotUnitId: '',
  lotName: '',
  lotTypeCode: 'productive',
  primaryCropCode: 'coffee',
  varietyCodes: 'caturra',
  responsibleProducerId: '',
  soilTypeCode: '',
  observations: '',
  boundaryGeoJson: '',
};

export function LotFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFarmId = searchParams.get('finca') ?? '';
  const isEdit = Boolean(id);
  const [form, setForm] = useState<LotFormState>(emptyForm);
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibleLots, setEligibleLots] = useState<Array<{
    id: string;
    lotCode: string;
    lotName?: string | null;
    farmUnitId: string;
    areaHa?: number | null;
  }>>([]);
  const [producers, setProducers] = useState<Array<{ id: string; legalName: string }>>([]);
  const [farmFilter, setFarmFilter] = useState('');
  const [farms, setFarms] = useState<Array<{ id: string; farmName: string }>>([]);

  useEffect(() => {
    listProducers({ limit: 200 }).then((r) =>
      setProducers(r.items.map((p) => ({ id: p.id, legalName: p.legalName }))),
    );
    listFarms({ limit: 200 }).then((r) =>
      setFarms(r.items.map((f) => ({ id: f.id, farmName: f.farmName }))),
    );
  }, []);

  useEffect(() => {
    getEligibleFtipLots(farmFilter || undefined).then((r) =>
      setEligibleLots((r.items as typeof eligibleLots) ?? []),
    );
  }, [farmFilter]);

  useEffect(() => {
    if (!isEdit && presetFarmId) {
      setFarmFilter(presetFarmId);
    }
  }, [isEdit, presetFarmId]);

  useEffect(() => {
    if (!id) return;
    getLot(id).then((lot) => {
      setForm({
        ftipLotUnitId: lot.ftipLotUnitId,
        lotName: lot.lotName,
        lotTypeCode: lot.lotTypeCode,
        primaryCropCode: lot.agronomicStates?.[0]?.primaryCropCode ?? 'coffee',
        varietyCodes: (lot.agronomicStates?.[0]?.varietyCodes ?? []).join(', '),
        totalAreaHa: lot.totalAreaHa != null ? Number(lot.totalAreaHa) : undefined,
        cultivableAreaHa: lot.cultivableAreaHa != null ? Number(lot.cultivableAreaHa) : undefined,
        plantedAreaHa: lot.plantedAreaHa != null ? Number(lot.plantedAreaHa) : undefined,
        responsibleProducerId: lot.responsibleProducerId ?? '',
        soilTypeCode: '',
        observations: lot.observations ?? '',
        centroidLatitude: lot.centroidLatitude != null ? Number(lot.centroidLatitude) : undefined,
        centroidLongitude: lot.centroidLongitude != null ? Number(lot.centroidLongitude) : undefined,
        boundaryGeoJson: lot.boundaryGeoRef ? JSON.stringify(lot.boundaryGeoRef, null, 2) : '',
      });
      setVersion(lot.version);
    });
  }, [id]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        lotName: form.lotName,
        lotTypeCode: form.lotTypeCode,
        primaryCropCode: form.primaryCropCode,
        varietyCodes: form.varietyCodes.split(',').map((s) => s.trim()).filter(Boolean),
        totalAreaHa: form.totalAreaHa,
        cultivableAreaHa: form.cultivableAreaHa,
        plantedAreaHa: form.plantedAreaHa,
        responsibleProducerId: form.responsibleProducerId || undefined,
        soilTypeCode: form.soilTypeCode || undefined,
        observations: form.observations || undefined,
        centroidLatitude: form.centroidLatitude,
        centroidLongitude: form.centroidLongitude,
      };

      if (isEdit && id) {
        await updateLot(id, { ...payload, version });
        if (form.boundaryGeoJson.trim()) {
          const geometry = JSON.parse(form.boundaryGeoJson);
          await setLotGeometry(id, { applicationGeo: geometry, source: 'web_form' });
        }
        navigate(`/lotes/${id}`);
      } else {
        if (!form.ftipLotUnitId) throw new Error('Seleccione la finca y la parcela donde registrará el lote');
        const created = await createLot({ ...payload, ftipLotUnitId: form.ftipLotUnitId });
        markProcessMilestone('agricultural', 'lot', {
          entityId: created.id,
          entityName: form.lotName,
          entityType: 'lot',
        });
        navigate(`/lotes/${created.id}?paso=completado`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header
        title={isEdit ? 'Editar lote' : 'Nuevo lote'}
        subtitle={
          isEdit
            ? 'Actualice cultivo, áreas y ubicación del lote.'
            : 'Seleccione la finca y el espacio productivo; luego complete cultivo y áreas.'
        }
        actions={
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        }
      />

      {!isEdit ? <FlowProgress flowId="agricultural" currentStepId="lot" /> : null}

      {error && <div className="alert alert-error">{error}</div>}

      {!isEdit ? (
        <div className="admin-help-card" style={{ marginBottom: '1rem' }}>
          <strong>¿Cómo registrar un lote?</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Primero elija la finca. Luego seleccione el espacio o parcela dentro de esa finca.
            Si no aparece ninguna opción, registre primero la finca en el módulo de Fincas.
          </p>
        </div>
      ) : null}

      <form className="form-panel" onSubmit={handleSubmit}>
        {!isEdit && (
          <>
            <div className="form-group">
              <label>Finca *</label>
              <select
                value={farmFilter}
                onChange={(e) => setFarmFilter(e.target.value)}
                required
              >
                <option value="">Seleccione la finca…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.farmName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Parcela o espacio en la finca *</label>
              <select
                required
                value={form.ftipLotUnitId}
                disabled={!farmFilter}
                onChange={(e) => {
                  const lot = eligibleLots.find((l) => l.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    ftipLotUnitId: e.target.value,
                    lotName: lot?.lotName ?? lot?.lotCode ?? f.lotName,
                    plantedAreaHa: lot?.areaHa != null ? Number(lot.areaHa) : f.plantedAreaHa,
                  }));
                }}
              >
                <option value="">
                  {farmFilter ? 'Seleccione la parcela…' : 'Primero elija una finca'}
                </option>
                {eligibleLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lotName ?? l.lotCode}{l.lotName ? ` (${l.lotCode})` : ''}
                  </option>
                ))}
              </select>
              {farmFilter && eligibleLots.length === 0 ? (
                <small className="muted">
                  No hay parcelas disponibles en esta finca. Verifique el registro de la finca o contacte al administrador.
                </small>
              ) : null}
            </div>
          </>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              required
              value={form.lotName}
              onChange={(e) => setForm((f) => ({ ...f, lotName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select
              value={form.lotTypeCode}
              onChange={(e) => setForm((f) => ({ ...f, lotTypeCode: e.target.value }))}
            >
              <option value="productive">Productivo</option>
              <option value="nursery">Vivero</option>
              <option value="buffer">Zona amortiguadora</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cultivo</label>
            <input
              value={form.primaryCropCode}
              onChange={(e) => setForm((f) => ({ ...f, primaryCropCode: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Variedades (coma)</label>
            <input
              value={form.varietyCodes}
              onChange={(e) => setForm((f) => ({ ...f, varietyCodes: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Área total (ha)</label>
            <input
              type="number"
              step="0.0001"
              value={form.totalAreaHa ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  totalAreaHa: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label>Área cultivable (ha)</label>
            <input
              type="number"
              step="0.0001"
              value={form.cultivableAreaHa ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cultivableAreaHa: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label>Área sembrada (ha)</label>
            <input
              type="number"
              step="0.0001"
              value={form.plantedAreaHa ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  plantedAreaHa: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label>Productor responsable</label>
          <select
            value={form.responsibleProducerId}
            onChange={(e) => setForm((f) => ({ ...f, responsibleProducerId: e.target.value }))}
          >
            <option value="">Sin asignar</option>
            {producers.map((p) => (
              <option key={p.id} value={p.id}>{p.legalName}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Latitud</label>
            <input
              type="number"
              step="0.0000001"
              value={form.centroidLatitude ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  centroidLatitude: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label>Longitud</label>
            <input
              type="number"
              step="0.0000001"
              value={form.centroidLongitude ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  centroidLongitude: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn" onClick={captureGps}>
              Capturar GPS
            </button>
          </div>
        </div>

        <details className="form-advanced-section">
          <summary>Delimitación del lote (opcional, uso avanzado)</summary>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label>Contorno del lote</label>
            <textarea
              rows={6}
              value={form.boundaryGeoJson}
              onChange={(e) => setForm((f) => ({ ...f, boundaryGeoJson: e.target.value }))}
              placeholder="Pegue aquí el contorno si lo tiene en formato técnico, o use el mapa más adelante."
            />
            <small className="muted">
              Solo necesario si desea registrar el perímetro exacto. Puede omitirlo y usar «Capturar GPS».
            </small>
          </div>
        </details>

        <div className="form-group">
          <label>Observaciones</label>
          <textarea
            rows={3}
            value={form.observations}
            onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar lote'}
        </button>
      </form>
    </>
  );
}
