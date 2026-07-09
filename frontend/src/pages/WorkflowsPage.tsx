import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import { useAuth } from '../context/AuthContext';
import {
  cloneWorkflowDefinition,
  deactivateWorkflowDefinition,
  exportWorkflowDefinition,
  getWorkflowBootstrap,
  importWorkflowDefinition,
  listWorkflowDefinitions,
  publishWorkflowVersion,
  type WorkflowDefinition,
} from '../api/workflows';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canImport = hasPermission('workflow:import');
  const canCreate = hasPermission('workflow:create');
  const canUpdate = hasPermission('workflow:update');
  const canPublish = hasPermission('workflow:publish');
  const canAdmin = hasPermission('workflow:admin');
  const [items, setItems] = useState<WorkflowDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, boot] = await Promise.all([
        listWorkflowDefinitions(),
        getWorkflowBootstrap(),
      ]);
      setItems(list);
      setCategories(boot.categories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePublish(row: WorkflowDefinition) {
    const version = row.versions.find((v) => v.status === 'draft') ?? row.versions[0];
    if (!version) return;
    if (!confirm(`¿Publicar "${row.name}" v${version.version}?`)) return;
    await publishWorkflowVersion(version.id);
    load();
  }

  async function handleDeactivate(row: WorkflowDefinition) {
    if (!confirm(`¿Desactivar "${row.name}"?`)) return;
    await deactivateWorkflowDefinition(row.id);
    load();
  }

  async function handleClone(row: WorkflowDefinition) {
    const key = prompt('Código interno del nuevo proceso (solo letras, números y guiones):', `${row.name.toLowerCase().replace(/\s+/g, '-')}-copia`);
    if (!key) return;
    const cloned = await cloneWorkflowDefinition(row.id, key);
    navigate(`/procesos/${cloned.id}/disenar`);
  }

  async function handleExport(row: WorkflowDefinition) {
    const data = await exportWorkflowDefinition(row.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${row.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const content = await file.text();
      const result = await importWorkflowDefinition(content, { publish: false });
      if (result.definitionId) navigate(`/procesos/${result.definitionId}/disenar`);
      else load();
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Header
        title="Procesos y aprobaciones"
        subtitle="Configure solicitudes, revise la bandeja y dé seguimiento a instancias activas"
        actions={
          <div className="row-actions">
            <Link to="/procesos/dashboard" className="btn">Dashboard</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/instancias" className="btn">Instancias</Link>
            {canImport ? (
              <label className="btn">
                {importing ? 'Importando...' : 'Importar'}
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                />
              </label>
            ) : null}
            {canCreate ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate('/procesos/nuevo')}>
                + Nuevo proceso
              </button>
            ) : null}
          </div>
        }
      />

      {categories.length > 0 && (
        <div className="chip-row">
          {categories.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingState variant="table" message="Cargando procesos..." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Categoría</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const latest = row.versions[0];
                const category = (latest?.definition as { settings?: { processCategory?: string } })?.settings?.processCategory ?? '—';
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{category}</td>
                    <td>v{latest?.version ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${latest?.status ?? 'draft'}`}>
                        {STATUS_LABELS[latest?.status ?? 'draft'] ?? latest?.status}
                      </span>
                    </td>
                    <td>{row.active ? 'Sí' : 'No'}</td>
                    <td>
                      <div className="row-actions">
                        {canUpdate ? (
                          <Link to={`/procesos/${row.id}/disenar`} className="btn btn-sm">Diseñar</Link>
                        ) : null}
                        {latest?.status === 'draft' && canPublish ? (
                          <button type="button" className="btn btn-sm" onClick={() => handlePublish(row)}>Publicar</button>
                        ) : null}
                        {canCreate ? (
                          <button type="button" className="btn btn-sm" onClick={() => handleClone(row)}>Clonar</button>
                        ) : null}
                        <button type="button" className="btn btn-sm" onClick={() => handleExport(row)}>Exportar</button>
                        {row.active && canAdmin ? (
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDeactivate(row)}>Desactivar</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
