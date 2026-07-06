import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  archiveForm,
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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  published: 'Publicado',
  deprecated: 'Obsoleto',
  archived: 'Archivado',
};

export function FormsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FormDefinition[]>([]);
  const [dashboard, setDashboard] = useState<FormDashboard | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        listForms({ status: status || undefined, search: search || undefined }),
        getFormDashboard(),
      ]);
      setItems(list);
      setDashboard(dash);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  async function handlePublish(row: FormDefinition) {
    if (!confirm(`¿Publicar "${row.name}" v${row.version}?`)) return;
    await publishForm(row.id);
    load();
  }

  async function handleArchive(row: FormDefinition) {
    if (!confirm(`¿Archivar "${row.name}"? Dejará de estar disponible en la app.`)) return;
    await archiveForm(row.id);
    load();
  }

  async function handleDelete(row: FormDefinition) {
    const msg = row.status === 'published'
      ? `¿Eliminar "${row.name}"? Está publicado y dejará de aparecer en la app móvil.`
      : `¿Eliminar permanentemente "${row.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteForm(row.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function handleDownloadReport(type: 'full' | 'catalog' = 'full') {
    setExporting(true);
    try {
      await saveFormsReport(type);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo generar el reporte');
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
    load();
  }

  async function handleRestore(row: FormDefinition) {
    await restoreForm(row.id);
    load();
  }

  async function handleUnpublish(row: FormDefinition) {
    if (!confirm(`¿Despublicar "${row.name}"?`)) return;
    await unpublishForm(row.id);
    load();
  }

  async function handleExportSchema(row: FormDefinition) {
    try {
      await saveFormSchemaExport(row.id, row.formKey, 'csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo exportar');
    }
  }

  return (
    <>
      <Header
        title="Formularios"
        subtitle="UDFE — Universal Dynamic Forms Engine"
        actions={
          <div className="row-actions">
            <Link to="/formularios/dashboard" className="btn">Dashboard</Link>
            <Link to="/formularios/envios" className="btn">Envíos</Link>
            <button
              type="button"
              className="btn"
              disabled={exporting}
              onClick={() => handleDownloadReport('catalog')}
            >
              {exporting ? 'Generando...' : 'Exportar catálogo'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={exporting}
              onClick={() => handleDownloadReport('full')}
            >
              {exporting ? 'Generando...' : 'Reporte completo (Excel)'}
            </button>
            <button type="button" className="btn" onClick={() => navigate('/formularios/nuevo')}>
              + Nuevo formulario
            </button>
            <button type="button" className="btn" onClick={() => navigate('/formularios/nuevo?plantillas=1')}>
              Desde plantilla
            </button>
          </div>
        }
      />

      {dashboard && (
        <div className="kpi-grid">
          <div className="kpi-card"><span className="kpi-label">Total</span><span className="kpi-value">{dashboard.kpis.totalForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">Publicados</span><span className="kpi-value">{dashboard.kpis.publishedForms}</span></div>
          <div className="kpi-card"><span className="kpi-label">Envíos</span><span className="kpi-value">{dashboard.kpis.totalSubmissions}</span></div>
          <div className="kpi-card"><span className="kpi-label">Pend. sync</span><span className="kpi-value">{dashboard.kpis.pendingSync}</span></div>
        </div>
      )}

      <div className="filter-bar">
        <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => load()} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <LoadingState variant="table" message="Cargando..." /> : (
        <table className="data-table">
          <thead>
            <tr><th>Clave</th><th>Nombre</th><th>Versión</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.formKey}</td>
                <td><Link to={`/formularios/${row.id}`}>{row.name}</Link></td>
                <td>v{row.version}</td>
                <td><span className={`badge badge-${row.status}`}>{STATUS_LABELS[row.status] ?? row.status}</span></td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/disenar`)}>Diseñar</button>
                    {row.status === 'published' && (
                      <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/ejecutar`)}>Ejecutar</button>
                    )}
                    {row.status === 'draft' && (
                      <>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handlePublish(row)}>Publicar</button>
                        <button type="button" className="btn btn-sm" onClick={() => handleSubmitReview(row)}>A revisión</button>
                      </>
                    )}
                    {row.status === 'in_review' && (
                      <button type="button" className="btn btn-sm" onClick={() => navigate(`/formularios/${row.id}/disenar`)}>Revisar</button>
                    )}
                    {row.status === 'published' && (
                      <button type="button" className="btn btn-sm" onClick={() => handleUnpublish(row)}>Despublicar</button>
                    )}
                    {row.status === 'archived' && (
                      <button type="button" className="btn btn-sm" onClick={() => handleRestore(row)}>Restaurar</button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => handleNewVersion(row)}>Nueva versión</button>
                    <button type="button" className="btn btn-sm" onClick={() => handleDuplicate(row)}>Clonar</button>
                    {row.status !== 'archived' && (
                      <button type="button" className="btn btn-sm" onClick={() => handleArchive(row)}>Archivar</button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => handleExportSchema(row)}>Campos CSV</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
