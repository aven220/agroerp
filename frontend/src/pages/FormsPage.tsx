import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ux/LoadingState';
import { FormAvailabilityBadges } from '../components/forms/FormAvailabilityBadges';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';
import {
  archiveForm,
  approveForm,
  bootstrapForms,
  deleteForm,
  duplicateForm,
  getFormDashboard,
  listForms,
  newFormVersion,
  publishForm,
  rejectForm,
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
  const { success, error: toastError, info, warning } = useToast();
  const { user, hasPermission } = useAuth();
  const canCreateForm = hasPermission('form:create');
  const canUpdateForm = hasPermission('form:update');
  const canPublishForm = hasPermission('form:publish');
  const canDeleteForm = hasPermission('form:delete');
  const canApproveForm = hasPermission('form:approve');
  const canAdminForm = hasPermission('form:admin');
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

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listForms({ status: status || undefined, search: search.trim() || undefined });
      setItems(list);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al cargar formularios');
    } finally {
      setLoading(false);
    }
  }, [status, search, toastError]);

  const loadMeta = useCallback(async () => {
    try {
      const [dash, bootstrap] = await Promise.all([
        getFormDashboard(),
        bootstrapForms().catch(() => ({ forms: [], syncedAt: '' })),
      ]);
      setDashboard(dash);
      setBootstrapIds(new Set(bootstrap.forms.map((f) => f.id)));
    } catch {
      /* KPIs opcionales */
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

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

  const versionsByKey = useMemo(() => {
    const map = new Map<string, FormDefinition[]>();
    for (const item of items) {
      const group = map.get(item.formKey);
      if (group) group.push(item);
      else map.set(item.formKey, [item]);
    }
    return map;
  }, [items]);

  const refreshAfterMutation = useCallback(() => {
    loadList();
    loadMeta();
  }, [loadList, loadMeta]);

  useOnEntityUpdated(refreshAfterMutation, 'form');

  const modifierName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;

  async function handlePublish(row: FormDefinition) {
    if (!confirm(`¿Publicar "${row.name}" v${row.version}?\n\nTras publicar estará disponible en la web y se incluirá en la próxima descarga de formularios en dispositivos móviles.`)) return;
    try {
      await publishForm(row.id);
      notifyEntityUpdated('form', row.id);
      success('Publicado. Los dispositivos lo recibirán al sincronizar.', row.name);
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo publicar');
    }
  }

  async function handleArchive(row: FormDefinition) {
    if (!confirm(`¿Archivar "${row.name}"? Dejará de estar disponible en la app.`)) return;
    try {
      await archiveForm(row.id);
      notifyEntityUpdated('form', row.id);
      info('Formulario archivado.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo archivar');
    }
  }

  async function handleDelete(row: FormDefinition) {
    const msg = row.status === 'published'
      ? `¿Eliminar "${row.name}"? Está publicado y dejará de aparecer en la app móvil.`
      : `¿Eliminar permanentemente "${row.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteForm(row.id);
      notifyEntityUpdated('form', row.id);
      success('Formulario eliminado.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function handleDownloadReport(type: 'full' | 'catalog' = 'full') {
    setExporting(true);
    try {
      await saveFormsReport(type);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo generar el reporte');
    } finally {
      setExporting(false);
    }
  }

  async function handleDuplicate(row: FormDefinition) {
    const newKey = prompt('Nombre interno para la copia (solo letras minúsculas y guiones bajos):', `${row.formKey}-copia`);
    if (!newKey) return;
    try {
      const created = await duplicateForm(row.id, newKey);
      navigate(`/formularios/${created.id}/disenar`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo duplicar');
    }
  }

  async function handleNewVersion(row: FormDefinition) {
    try {
      const created = await newFormVersion(row.formKey);
      navigate(`/formularios/${created.id}/disenar`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo crear versión');
    }
  }

  async function handleSubmitReview(row: FormDefinition) {
    try {
      await submitFormForReview(row.id);
      notifyEntityUpdated('form', row.id);
      info('Enviado a revisión.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo enviar a revisión');
    }
  }

  async function handleApprove(row: FormDefinition) {
    if (!confirm(`¿Aprobar "${row.name}" v${row.version}?`)) return;
    try {
      await approveForm(row.id);
      notifyEntityUpdated('form', row.id);
      success('Formulario aprobado.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo aprobar');
    }
  }

  async function handleReject(row: FormDefinition) {
    const reason = prompt('Motivo del rechazo (opcional):');
    if (reason === null) return;
    try {
      await rejectForm(row.id, reason.trim() || undefined);
      notifyEntityUpdated('form', row.id);
      info('Formulario rechazado.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo rechazar');
    }
  }

  async function handleRestore(row: FormDefinition) {
    try {
      await restoreForm(row.id);
      notifyEntityUpdated('form', row.id);
      success('Restaurado como borrador.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo restaurar');
    }
  }

  async function handleUnpublish(row: FormDefinition) {
    if (!confirm(`¿Despublicar "${row.name}"?`)) return;
    try {
      await unpublishForm(row.id);
      notifyEntityUpdated('form', row.id);
      warning('Despublicado. Vuelve a borrador.');
      refreshAfterMutation();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo despublicar');
    }
  }

  async function handleExportSchema(row: FormDefinition) {
    try {
      await saveFormSchemaExport(row.id, row.formKey, 'csv');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo exportar');
    }
  }

  async function handleVerifySync(row: FormDefinition) {
    try {
      const payload = await bootstrapForms();
      const found = payload.forms.some((f) => f.id === row.id);
      setBootstrapIds(new Set(payload.forms.map((f) => f.id)));
      info(
        found
          ? 'Incluido en el paquete móvil. Los dispositivos lo descargarán en la próxima sincronización.'
          : 'Aún no está en el paquete móvil. Publique el formulario y verifique que permita uso sin conexión.',
        found ? 'Disponible en móvil' : 'Pendiente',
      );
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al verificar');
    }
  }

  return (
    <>
      <Header
        title="Mis Formularios"
        subtitle="Cree, publique y distribuya formularios para uso en web y dispositivos de campo"
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
            <button type="button" className="btn" onClick={() => navigate('/formularios/nuevo')} disabled={!canCreateForm}>
              + Nuevo
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/formularios/nuevo?plantilla=1')} disabled={!canCreateForm}>
              Desde plantilla
            </button>
          </div>
        }
      />

      <FormsPlatformNav />

      <FlowProgress flowId="forms" currentStepId="create" />

      <FlowNextActions
        title="Iniciar un formulario nuevo"
        subtitle="Siga el ciclo completo: diseñar → probar → publicar → capturar."
        actions={[
          {
            label: 'Crear formulario',
            description: 'Comience desde cero o una plantilla',
            to: '/formularios/nuevo',
            primary: true,
            icon: '➕',
          },
          {
            label: 'Ver plantillas',
            description: 'Acelere con modelos predefinidos',
            to: '/formularios/plantillas',
            icon: '📚',
          },
          {
            label: 'Ir a recolección',
            description: 'Capture datos ya publicados',
            to: '/formularios/recoleccion',
            icon: '📥',
          },
        ]}
      />

      <section className="panel form-lifecycle-intro">
        <h2 className="ds-h4">Cómo funciona</h2>
        <FormLifecycleStepper status="draft" compact highlightFrom="template" />
        <p className="muted form-lifecycle-intro-text">
          Las <strong>plantillas</strong> solo cargan el diseño en el editor. Al <strong>guardar borrador</strong> el formulario
          aparece aquí. Debe <strong>publicarse</strong> para usarse en la web y descargarse en dispositivos de campo.
        </p>
      </section>

      {dashboard && (
        <div className="kpi-grid">
          <div className="kpi-card"><span className="kpi-label">Total</span><span className="kpi-value">{dashboard.kpis.totalForms}</span></div>
          <div className="kpi-card kpi-green"><span className="kpi-label">Publicados</span><span className="kpi-value">{dashboard.kpis.publishedForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">Borradores</span><span className="kpi-value">{dashboard.kpis.draftForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">Disponibles en campo</span><span className="kpi-value">{bootstrapIds.size}</span></div>
        </div>
      )}

      <div className="filter-bar form-mis-filters">
        <input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadList(); }}
        />
        <button type="button" className="btn btn-sm" onClick={() => loadList()}>Buscar</button>
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
          <option value="latest">Última versión de cada formulario</option>
          <option value="all">Todas las versiones</option>
        </select>
      </div>

      {loading ? <LoadingState variant="table" message="Cargando formularios…" /> : displayed.length === 0 ? (
        <EmptyState
          illustration="data"
          title="Aún no hay formularios guardados"
          description="Elija una plantilla, edite el diseño y presione «Guardar borrador». El formulario aparecerá aquí como borrador hasta que lo publique."
          hint="Los borradores no se descargan en dispositivos móviles."
          action={{ label: 'Crear desde plantilla', to: '/formularios/nuevo?plantilla=1' }}
          secondaryAction={{ label: 'Formulario en blanco', to: '/formularios/nuevo' }}
        />
      ) : (
        <div className="form-mis-list">
          {displayed.map((row) => {
            const isHighlighted = highlightedId === row.id;
            const inBootstrap = bootstrapIds.has(row.id);
            const versionsForKey = viewMode === 'all' ? [] : (versionsByKey.get(row.formKey) ?? []);
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
                      Versión {row.version} · {FORM_STATUS_LABELS[row.status] ?? row.status}
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
                  {canUpdateForm ? (
                    <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/disenar`)}>Editar</button>
                  ) : null}
                  {row.status === 'published' && canUpdateForm ? (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/ejecutar`)}>Usar en web</button>
                      <button type="button" className="btn btn-sm" onClick={() => handleVerifySync(row)} title="Comprueba si el formulario ya está disponible en celulares">Verificar en celular</button>
                    </>
                  ) : null}
                  {row.status === 'published' && canPublishForm ? (
                    <button type="button" className="btn btn-sm" onClick={() => handleUnpublish(row)}>Despublicar</button>
                  ) : null}
                  {(row.status === 'draft' || row.status === 'approved') && canPublishForm ? (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => handlePublish(row)}>Publicar</button>
                  ) : null}
                  {row.status === 'draft' && canApproveForm ? (
                    <button type="button" className="btn btn-sm" onClick={() => handleSubmitReview(row)}>A revisión</button>
                  ) : null}
                  {row.status === 'in_review' && canApproveForm ? (
                    <>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => handleApprove(row)}>Aprobar</button>
                      <button type="button" className="btn btn-sm" onClick={() => handleReject(row)}>Rechazar</button>
                    </>
                  ) : null}
                  {row.status === 'archived' && canAdminForm ? (
                    <button type="button" className="btn btn-sm" onClick={() => handleRestore(row)}>Restaurar</button>
                  ) : null}
                  {canCreateForm ? (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => handleNewVersion(row)}>Nueva versión</button>
                      <button type="button" className="btn btn-sm" onClick={() => handleDuplicate(row)}>Clonar</button>
                    </>
                  ) : null}
                  {row.status !== 'archived' && canAdminForm ? (
                    <button type="button" className="btn btn-sm" onClick={() => handleArchive(row)}>Archivar</button>
                  ) : null}
                  <button type="button" className="btn btn-sm" onClick={() => handleExportSchema(row)}>CSV</button>
                  {canDeleteForm ? (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>Eliminar</button>
                  ) : null}
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
