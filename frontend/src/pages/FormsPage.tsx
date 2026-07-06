import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ux/LoadingState';
import { FormAvailabilityBadges } from '../components/forms/FormAvailabilityBadges';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  archiveForm,
  bootstrapForms,
  deleteForm,
  duplicateForm,
  getFormDashboard,
  listForms,
  newFormVersion,
  publishForm,
  restoreForm,
  saveFormSchemaExport,
  saveFormsReport,
  submitFormForReview,
  unpublishForm,
  type FormDefinition,
  type FormDashboard,
} from '../api/forms';
import {
  FORM_STATUS_LABELS,
  formatFormDate,
  formatModifiedBy,
  groupLatestVersions,
} from '../form-studio/form-lifecycle';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'published', label: 'Publicado' },
  { value: 'deprecated', label: 'Obsoleto' },
  { value: 'archived', label: 'Archivado' },
];

export function FormsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<FormDefinition[]>([]);
  const [dashboard, setDashboard] = useState<FormDashboard | null>(null);
  const [bootstrapIds, setBootstrapIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'latest' | 'all'>('latest');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const highlightedId = searchParams.get('saved');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dash, bootstrap] = await Promise.all([
        listForms({ status: status || undefined, search: search.trim() || undefined }),
        getFormDashboard(),
        bootstrapForms().catch(() => ({ forms: [], syncedAt: '' })),
      ]);
      setItems(list);
      setDashboard(dash);
      setBootstrapIds(new Set(bootstrap.forms.map((f) => f.id)));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!highlightedId) return;
    const t = window.setTimeout(() => {
      searchParams.delete('saved');
      setSearchParams(searchParams, { replace: true });
    }, 8000);
    return () => window.clearTimeout(t);
  }, [highlightedId, searchParams, setSearchParams]);

  const displayed = useMemo(
    () => (viewMode === 'latest' ? groupLatestVersions(items) : items),
    [items, viewMode],
  );

  const modifierName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;

  async function handlePublish(row: FormDefinition) {
    if (!confirm(`¿Publicar "${row.name}" v${row.version}?\n\nTras publicar estará disponible en Web y en el próximo sync de Android.`)) return;
    await publishForm(row.id);
    toast.success('Publicado. Los dispositivos lo recibirán al sincronizar.', row.name);
    load();
  }

  async function handleArchive(row: FormDefinition) {
    if (!confirm(`¿Archivar "${row.name}"? Dejará de estar disponible en la app.`)) return;
    await archiveForm(row.id);
    toast.info('Formulario archivado.');
    load();
  }

  async function handleDelete(row: FormDefinition) {
    const msg = row.status === 'published'
      ? `¿Eliminar "${row.name}"? Está publicado y dejará de aparecer en la app móvil.`
      : `¿Eliminar permanentemente "${row.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteForm(row.id);
      toast.success('Formulario eliminado.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function handleDownloadReport(type: 'full' | 'catalog' = 'full') {
    setExporting(true);
    try {
      await saveFormsReport(type);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el reporte');
    } finally {
      setExporting(false);
    }
  }

  async function handleDuplicate(row: FormDefinition) {
    const newKey = prompt('Nueva clave de formulario:', `${row.formKey}-copia`);
    if (!newKey) return;
    const created = await duplicateForm(row.id, newKey);
    navigate(`/formularios/${created.id}/disenar`);
  }

  async function handleNewVersion(row: FormDefinition) {
    const created = await newFormVersion(row.formKey);
    navigate(`/formularios/${created.id}/disenar`);
  }

  async function handleSubmitReview(row: FormDefinition) {
    await submitFormForReview(row.id);
    toast.info('Enviado a revisión.');
    load();
  }

  async function handleRestore(row: FormDefinition) {
    await restoreForm(row.id);
    toast.success('Restaurado como borrador.');
    load();
  }

  async function handleUnpublish(row: FormDefinition) {
    if (!confirm(`¿Despublicar "${row.name}"?`)) return;
    await unpublishForm(row.id);
    toast.warning('Despublicado. Vuelve a borrador.');
    load();
  }

  async function handleExportSchema(row: FormDefinition) {
    try {
      await saveFormSchemaExport(row.id, row.formKey, 'csv');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar');
    }
  }

  async function handleVerifySync(row: FormDefinition) {
    try {
      const payload = await bootstrapForms();
      const found = payload.forms.some((f) => f.id === row.id);
      setBootstrapIds(new Set(payload.forms.map((f) => f.id)));
      toast.info(
        found
          ? 'Incluido en el paquete móvil. Los dispositivos lo descargarán en el próximo sync.'
          : 'No está en bootstrap. Publique y verifique soporte offline.',
        found ? 'Sync Android OK' : 'Pendiente',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al verificar');
    }
  }

  return (
    <>
      <Header
        title="Mis Formularios"
        subtitle="Ciclo de vida: plantilla → borrador → publicar → sync Android"
        actions={
          <div className="row-actions">
            <Link to="/formularios/dashboard" className="btn">Dashboard</Link>
            <Link to="/formularios/envios" className="btn">Envíos</Link>
            <button type="button" className="btn" disabled={exporting} onClick={() => handleDownloadReport('catalog')}>
              {exporting ? 'Generando…' : 'Exportar catálogo'}
            </button>
            <button type="button" className="btn btn-primary" disabled={exporting} onClick={() => handleDownloadReport('full')}>
              {exporting ? 'Generando…' : 'Reporte Excel'}
            </button>
            <button type="button" className="btn" onClick={() => navigate('/formularios/nuevo')}>
              + Nuevo
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/formularios/nuevo?plantilla=1')}>
              Desde plantilla
            </button>
          </div>
        }
      />

      <section className="panel form-lifecycle-intro">
        <h2 className="ds-h4">Cómo funciona</h2>
        <FormLifecycleStepper status="draft" compact highlightFrom="template" />
        <p className="muted form-lifecycle-intro-text">
          Las <strong>plantillas</strong> solo cargan el diseño en el editor. Al <strong>guardar borrador</strong> el formulario
          aparece aquí. Debe <strong>publicarse</strong> para ejecutarse en Web y sincronizarse con Android.
        </p>
      </section>

      {dashboard && (
        <div className="kpi-grid">
          <div className="kpi-card"><span className="kpi-label">Total</span><span className="kpi-value">{dashboard.kpis.totalForms}</span></div>
          <div className="kpi-card kpi-green"><span className="kpi-label">Publicados</span><span className="kpi-value">{dashboard.kpis.publishedForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">Borradores</span><span className="kpi-value">{dashboard.kpis.draftForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">En bootstrap móvil</span><span className="kpi-value">{bootstrapIds.size}</span></div>
        </div>
      )}

      <div className="filter-bar form-mis-filters">
        <input
          placeholder="Buscar por nombre o clave…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
        />
        <button type="button" className="btn btn-sm" onClick={() => load()}>Buscar</button>
        <div className="form-status-chips" role="tablist" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              role="tab"
              className={`form-status-chip${status === f.value ? ' active' : ''}`}
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'latest' | 'all')} aria-label="Modo de vista">
          <option value="latest">Última versión por clave</option>
          <option value="all">Todas las versiones</option>
        </select>
      </div>

      {loading ? <LoadingState variant="table" message="Cargando formularios…" /> : displayed.length === 0 ? (
        <EmptyState
          illustration="data"
          title="Aún no hay formularios guardados"
          description="Elija una plantilla, edite el diseño y presione «Guardar borrador». El formulario aparecerá aquí como borrador hasta que lo publique."
          hint="Los borradores no se sincronizan con Android."
          action={{ label: 'Crear desde plantilla', to: '/formularios/nuevo?plantilla=1' }}
          secondaryAction={{ label: 'Formulario en blanco', to: '/formularios/nuevo' }}
        />
      ) : (
        <div className="form-mis-list">
          {displayed.map((row) => {
            const isHighlighted = highlightedId === row.id;
            const inBootstrap = bootstrapIds.has(row.id);
            const versionsForKey = viewMode === 'all' ? [] : items.filter((i) => i.formKey === row.formKey);
            const showVersions = expandedKey === row.formKey && versionsForKey.length > 1;

            return (
              <article
                key={row.id}
                className={`form-mis-card panel${isHighlighted ? ' form-mis-card-highlight' : ''}`}
              >
                <div className="form-mis-card-head">
                  <div>
                    <Link to={`/formularios/${row.id}`} className="form-mis-title">{row.name}</Link>
                    <p className="muted form-mis-sub">
                      <code>{row.formKey}</code> · v{row.version}
                      {isHighlighted ? <span className="form-mis-saved-badge"> ✓ Guardado recientemente</span> : null}
                    </p>
                  </div>
                  <span className={`badge badge-${row.status}`}>{FORM_STATUS_LABELS[row.status] ?? row.status}</span>
                </div>

                <FormAvailabilityBadges
                  form={row}
                  showSyncCheck={row.status === 'published'}
                  inMobileBootstrap={row.status === 'published' ? inBootstrap : undefined}
                />

                <dl className="form-mis-meta">
                  <div><dt>Modificado</dt><dd>{formatFormDate(row.updatedAt)}</dd></div>
                  <div><dt>Autor</dt><dd>{formatModifiedBy(row.createdBy, user?.id, modifierName)}</dd></div>
                  <div><dt>Campos</dt><dd>{row.schema?.fields?.length ?? 0}</dd></div>
                </dl>

                <div className="form-mis-actions row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}`)}>Ver detalle</button>
                  <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/disenar`)}>Editar</button>
                  {row.status === 'published' && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/ejecutar`)}>Ejecutar Web</button>
                      <button type="button" className="btn btn-sm" onClick={() => handleVerifySync(row)}>Verificar sync</button>
                      <button type="button" className="btn btn-sm" onClick={() => handleUnpublish(row)}>Despublicar</button>
                    </>
                  )}
                  {(row.status === 'draft' || row.status === 'approved') && (
                    <>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => handlePublish(row)}>Publicar</button>
                      {row.status === 'draft' && (
                        <button type="button" className="btn btn-sm" onClick={() => handleSubmitReview(row)}>A revisión</button>
                      )}
                    </>
                  )}
                  {row.status === 'archived' && (
                    <button type="button" className="btn btn-sm" onClick={() => handleRestore(row)}>Restaurar</button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => handleNewVersion(row)}>Nueva versión</button>
                  <button type="button" className="btn btn-sm" onClick={() => handleDuplicate(row)}>Clonar</button>
                  {row.status !== 'archived' && (
                    <button type="button" className="btn btn-sm" onClick={() => handleArchive(row)}>Archivar</button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => handleExportSchema(row)}>CSV</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>Eliminar</button>
                </div>

                {viewMode === 'latest' && versionsForKey.length > 1 && (
                  <button
                    type="button"
                    className="btn-link form-mis-versions-toggle"
                    onClick={() => setExpandedKey(showVersions ? null : row.formKey)}
                  >
                    {showVersions ? 'Ocultar' : 'Ver'} {versionsForKey.length} versiones
                  </button>
                )}

                {showVersions && (
                  <table className="data-table form-mis-versions-table">
                    <thead><tr><th>Ver.</th><th>Estado</th><th>Modificado</th><th /></tr></thead>
                    <tbody>
                      {versionsForKey.map((v) => (
                        <tr key={v.id}>
                          <td>v{v.version}</td>
                          <td><span className={`badge badge-${v.status}`}>{FORM_STATUS_LABELS[v.status]}</span></td>
                          <td>{formatFormDate(v.updatedAt)}</td>
                          <td><Link to={`/formularios/${v.id}`}>Abrir</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
