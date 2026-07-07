import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { LoadingState } from '../components/ux/LoadingState';
import { useToast } from '../context/ToastContext';
import {
  activateCampaign,
  archiveCampaign,
  closeCampaign,
  createCampaign,
  getCampaignStats,
  listCampaigns,
  listForms,
  type FormCampaign,
  type FormCampaignStats,
  type FormDefinition,
} from '../api/forms';
import { formatFormDate } from '../form-studio/form-lifecycle';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  closed: 'Cerrada',
  archived: 'Archivada',
};

export function FormCampaignsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<FormCampaign[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [stats, setStats] = useState<Record<string, FormCampaignStats>>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    formId: '',
    startsAt: '',
    endsAt: '',
    expectedCount: '',
    zones: '',
    municipalities: '',
    farms: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, published] = await Promise.all([
        listCampaigns({ status: status || undefined }),
        listForms({ status: 'published' }),
      ]);
      setCampaigns(camps);
      setForms(published);
      const statEntries = await Promise.all(
        camps.filter((c) => c.status === 'active' || c.status === 'closed').map(async (c) => {
          try {
            const s = await getCampaignStats(c.id);
            return [c.id, s] as const;
          } catch {
            return null;
          }
        }),
      );
      setStats(Object.fromEntries(statEntries.filter(Boolean) as [string, FormCampaignStats][]));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createCampaign({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description || undefined,
        formId: form.formId,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        expectedCount: form.expectedCount ? Number(form.expectedCount) : undefined,
        metadata: {
          zones: splitCsv(form.zones),
          municipalities: splitCsv(form.municipalities),
          farms: splitCsv(form.farms),
        },
      });
      toast.success('Campaña creada. Actívela para iniciar la recolección.', created.name);
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la campaña');
    }
  }

  return (
    <>
      <Header
        title="Campañas de Recolección"
        subtitle="Ejecute formularios publicados en contexto operativo con metas y cobertura geográfica"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Nueva campaña
          </button>
        }
      />
      <FormsPlatformNav />

      <section className="panel form-lifecycle-intro">
        <p className="muted">
          Flujo: <strong>Formulario publicado</strong> → Campaña activa → Recolección en campo (Android/Web) →
          Centro de Datos. Cada respuesta queda vinculada al formulario; incluya <code>campaignId</code> en el contexto al capturar.
        </p>
      </section>

      <div className="form-status-chips" style={{ marginBottom: '1rem' }}>
        {['', 'draft', 'active', 'closed', 'archived'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`form-status-chip${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s ? STATUS_LABELS[s] : 'Todas'}
          </button>
        ))}
      </div>

      {showCreate && (
        <form className="panel form-campaign-form" onSubmit={handleCreate}>
          <h3 className="ds-h4">Nueva campaña</h3>
          <div className="form-row">
            <label>Código<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          </div>
          <label>Formulario publicado
            <select required value={form.formId} onChange={(e) => setForm({ ...form, formId: e.target.value })}>
              <option value="">— Seleccione —</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.name} (v{f.version})</option>
              ))}
            </select>
          </label>
          <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="form-row">
            <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
            <label>Cierre<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            <label>Meta registros<input type="number" min={0} value={form.expectedCount} onChange={(e) => setForm({ ...form, expectedCount: e.target.value })} /></label>
          </div>
          <label>Zonas (separadas por coma)<input value={form.zones} onChange={(e) => setForm({ ...form, zones: e.target.value })} /></label>
          <label>Municipios<input value={form.municipalities} onChange={(e) => setForm({ ...form, municipalities: e.target.value })} /></label>
          <label>Fincas<input value={form.farms} onChange={(e) => setForm({ ...form, farms: e.target.value })} /></label>
          <div className="row-actions">
            <button type="submit" className="btn btn-primary">Crear campaña</button>
            <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <LoadingState variant="table" /> : (
        <div className="form-mis-list">
          {campaigns.length === 0 ? (
            <p className="muted panel">No hay campañas. Cree una asociada a un formulario publicado.</p>
          ) : campaigns.map((c) => {
            const st = stats[c.id];
            return (
              <article key={c.id} className="form-mis-card panel">
                <div className="form-mis-card-head">
                  <div>
                    <h3 className="form-mis-title">{c.name}</h3>
                    <p className="muted"><code>{c.code}</code></p>
                  </div>
                  <span className={`badge badge-${c.status === 'active' ? 'published' : 'draft'}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                <p>
                  Formulario:{' '}
                  <Link to={`/formularios/${c.formId}`}>{c.form?.name ?? c.formId}</Link>
                  {' '}· v{c.form?.version}
                </p>
                <dl className="form-mis-meta">
                  {c.startsAt ? <div><dt>Inicio</dt><dd>{formatFormDate(c.startsAt)}</dd></div> : null}
                  {c.endsAt ? <div><dt>Cierre</dt><dd>{formatFormDate(c.endsAt)}</dd></div> : null}
                  {c.expectedCount != null ? <div><dt>Meta</dt><dd>{c.expectedCount}</dd></div> : null}
                  {st ? (
                    <>
                      <div><dt>Recolectados</dt><dd>{st.collected}</dd></div>
                      <div><dt>Sincronizados</dt><dd>{st.synced}</dd></div>
                      <div><dt>Pendientes</dt><dd>{st.pending}</dd></div>
                    </>
                  ) : null}
                </dl>
                {st?.progressPct != null ? (
                  <div className="form-campaign-progress">
                    <div className="form-campaign-progress-bar" style={{ width: `${Math.min(100, st.progressPct)}%` }} />
                    <span className="ds-caption">{st.progressPct}% de la meta</span>
                  </div>
                ) : null}
                <div className="row-actions form-mis-actions">
                  {c.status === 'draft' && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={async () => { await activateCampaign(c.id); toast.success('Campaña activa'); load(); }}>Activar</button>
                  )}
                  {c.status === 'active' && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${c.formId}/ejecutar`)}>Ejecutar Web</button>
                      <button type="button" className="btn btn-sm" onClick={async () => { await closeCampaign(c.id); load(); }}>Cerrar</button>
                    </>
                  )}
                  {c.status !== 'archived' && (
                    <button type="button" className="btn btn-sm" onClick={async () => { await archiveCampaign(c.id); load(); }}>Archivar</button>
                  )}
                  <Link to="/formularios/recoleccion" className="btn btn-sm">Ver recolección</Link>
                  <Link to="/formularios/centro-datos" className="btn btn-sm">Analizar</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function splitCsv(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
