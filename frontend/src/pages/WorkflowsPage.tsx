import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
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

  const columns: SimpleColumn<WorkflowDefinition>[] = [
    {
      key: 'name',
      label: 'Proceso',
      render: (r) => <strong>{r.name}</strong>,
      getValue: (r) => r.name,
    },
    {
      key: 'category',
      label: 'Categoría',
      getValue: (r) =>
        (r.versions[0]?.definition as { settings?: { processCategory?: string } })?.settings?.processCategory ?? '—',
    },
    {
      key: 'version',
      label: 'Versión',
      getValue: (r) => `v${r.versions[0]?.version ?? '—'}`,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (r) => {
        const status = r.versions[0]?.status ?? 'draft';
        return (
          <span className={`badge badge-${status}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        );
      },
      getValue: (r) => r.versions[0]?.status ?? 'draft',
    },
    {
      key: 'active',
      label: 'Activo',
      getValue: (r) => (r.active ? 'Sí' : 'No'),
    },
  ];

  const rowActions: RowAction<WorkflowDefinition>[] = [
    {
      id: 'design',
      label: 'Diseñar',
      hidden: () => !canUpdate,
      onAction: (r) => navigate(`/procesos/${r.id}/disenar`),
    },
    {
      id: 'publish',
      label: 'Publicar',
      hidden: (r) => r.versions[0]?.status !== 'draft' || !canPublish,
      onAction: (r) => { handlePublish(r); },
    },
    {
      id: 'clone',
      label: 'Clonar',
      hidden: () => !canCreate,
      onAction: (r) => { handleClone(r); },
    },
    {
      id: 'export',
      label: 'Exportar',
      onAction: (r) => { handleExport(r); },
    },
    {
      id: 'deactivate',
      label: 'Desactivar',
      variant: 'danger',
      hidden: (r) => !r.active || !canAdmin,
      onAction: (r) => { handleDeactivate(r); },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Procesos y aprobaciones"
        subtitle="Configure solicitudes, revise la bandeja y dé seguimiento a instancias activas"
        actions={
          <PageActions>
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
          </PageActions>
        }
      />

      {categories.length > 0 && (
        <div className="chip-row">
          {categories.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      )}

      <PageSection title="Catálogo de procesos">
        <SimpleRecordsTable
          gridId="workflows-catalog"
          columns={columns}
          data={items}
          loading={loading}
          selectable={false}
          rowActions={rowActions}
          emptyMessage="Sin procesos"
          emptyDescription="Cree o importe un proceso para comenzar."
        />
      </PageSection>
    </PageLayout>
  );
}
