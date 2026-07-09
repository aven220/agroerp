import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DataTable, type RowAction } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { createStandardBulkActions } from '../lib/gridBulkActions';
import type { GridColumnDef } from '../lib/data-grid/types';
import {
  deleteProducer,
  exportProducers,
  getProducerDashboard,
  listProducers,
  listSegments,
  type Producer,
  type ProducerDashboard,
  type ProducerFilters,
} from '../api/prm';
import { useOnEntityUpdated, notifyEntityUpdated } from '../lib/entitySync';

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pre_registered: 'Pre-registro',
  pending_approval: 'Pendiente aprobación',
  active: 'Activo',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CC: 'Cédula',
  CE: 'Cédula extranjería',
  NIT: 'NIT',
  PAS: 'Pasaporte',
};

export function ProducersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('producer:create');
  const canUpdate = hasPermission('producer:update');
  const canDelete = hasPermission('producer:delete');
  const canExport = hasPermission('producer:export');
  const [filters, setFilters] = useState<ProducerFilters>({ page: 1, limit: 25 });
  const [items, setItems] = useState<Producer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<ProducerDashboard | null>(null);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const hasItemsRef = useRef(false);

  const handleQuickSearchChange = useCallback((search: string) => {
    const nextSearch = search.trim() || undefined;
    setFilters((f) => {
      if (f.search === nextSearch && f.page === 1) return f;
      return { ...f, search: nextSearch, page: 1 };
    });
  }, []);

  const loadList = useCallback(async () => {
    if (!hasItemsRef.current) setLoading(true);
    setError(null);
    try {
      const list = await listProducers(filters);
      setItems(list.items);
      hasItemsRef.current = list.items.length > 0;
      setPagination(list.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadMeta = useCallback(async () => {
    try {
      const [dash, segs] = await Promise.all([getProducerDashboard(), listSegments()]);
      setDashboard(dash);
      setSegments(segs);
    } catch {
      /* KPIs opcionales — no bloquean la tabla */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useOnEntityUpdated(() => {
    loadList();
    loadMeta();
  }, 'producer');

  useEffect(() => {
    const raw = sessionStorage.getItem('agroerp_cmd_filter_producers');
    if (!raw) return;
    sessionStorage.removeItem('agroerp_cmd_filter_producers');
    try {
      setFilters((f) => ({ ...f, ...JSON.parse(raw), page: 1 }));
    } catch { /* ignore */ }
  }, []);

  const handleExport = useCallback(async () => {
    const result = await exportProducers(filters);
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filters]);

  const handleDelete = useCallback(async (row: Producer) => {
    if (!confirm(`¿Archivar productor "${row.legalName}"?`)) return;
    try {
      await deleteProducer(row.id);
      notifyEntityUpdated('producer', row.id);
      loadList();
      getProducerDashboard().then(setDashboard).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo archivar');
    }
  }, [loadList]);

  const handleRowClick = useCallback((r: Producer) => {
    navigate(`/productores/${r.id}`);
  }, [navigate]);

  const handlePageChange = useCallback((p: number) => {
    setFilters((f) => ({ ...f, page: p }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters((f) => ({ ...f, limit, page: 1 }));
  }, []);

  const exportColumns = useMemo<GridColumnDef<Producer>[]>(() => [
    { key: 'code', label: 'Código', getValue: (r) => r.producerNumber },
    { key: 'name', label: 'Nombre', getValue: (r) => r.legalName },
    {
      key: 'doc',
      label: 'Documento',
      getValue: (r) => `${DOCUMENT_TYPE_LABELS[r.documentTypeCode] ?? r.documentTypeCode} ${r.documentNumber}`,
    },
    { key: 'muni', label: 'Municipio', getValue: (r) => r.municipalityCode ?? '' },
    { key: 'status', label: 'Estado', getValue: (r) => LIFECYCLE_LABELS[r.lifecycleStatus] ?? r.lifecycleStatus },
    { key: 'quality', label: 'Índice de calidad', getValue: (r) => r.qualityScore ?? '' },
  ], []);

  const bulkActions = useMemo(
    () => createStandardBulkActions(exportColumns, 'productores', (r) => `/productores/${r.id}`)
      .filter((a) => a.id !== 'bulk-export' || canExport),
    [exportColumns, canExport],
  );

  const rowActions = useMemo((): RowAction<Producer>[] => {
    const actions: RowAction<Producer>[] = [
      { id: 'view', label: 'Ver', onAction: (r) => navigate(`/productores/${r.id}`) },
    ];
    if (canUpdate) {
      actions.push({ id: 'edit', label: 'Editar', onAction: (r) => navigate(`/productores/${r.id}/editar`) });
    }
    if (canDelete) {
      actions.push({ id: 'archive', label: 'Archivar', variant: 'danger', onAction: handleDelete });
    }
    return actions;
  }, [canUpdate, canDelete, navigate, handleDelete]);

  const serverFilters = useMemo(() => (
    <>
      <select
        className="ds-input edw-density-select"
        value={filters.lifecycleStatus ?? ''}
        onChange={(e) =>
          setFilters((f) => ({
            ...f,
            lifecycleStatus: e.target.value || undefined,
            page: 1,
          }))
        }
        aria-label="Estado del ciclo de vida"
      >
        <option value="">Todos los estados</option>
        {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select
        className="ds-input edw-density-select"
        value={filters.segmentId ?? ''}
        onChange={(e) =>
          setFilters((f) => ({
            ...f,
            segmentId: e.target.value || undefined,
            page: 1,
          }))
        }
        aria-label="Segmento"
      >
        <option value="">Todos los segmentos</option>
        {segments.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input
        className="ds-input edw-density-select"
        placeholder="Municipio"
        value={filters.municipalityCode ?? ''}
        onChange={(e) =>
          setFilters((f) => ({
            ...f,
            municipalityCode: e.target.value || undefined,
            page: 1,
          }))
        }
        aria-label="Filtrar por municipio"
      />
    </>
  ), [filters.lifecycleStatus, filters.segmentId, filters.municipalityCode, segments]);

  const columns = useMemo(() => [
    {
      key: 'code',
      label: 'Código',
      render: (r: Producer) => r.producerNumber,
      sortable: true,
    },
    {
      key: 'name',
      label: 'Nombre',
      render: (r: Producer) => r.legalName,
      sortable: true,
    },
    {
      key: 'doc',
      label: 'Documento',
      render: (r: Producer) => {
        const docType = DOCUMENT_TYPE_LABELS[r.documentTypeCode] ?? r.documentTypeCode;
        return `${docType} ${r.documentNumber}`;
      },
    },
    {
      key: 'muni',
      label: 'Municipio',
      render: (r: Producer) => r.municipalityCode ?? '—',
    },
    {
      key: 'status',
      label: 'Estado',
      render: (r: Producer) => (
        <span className={`badge badge-${r.lifecycleStatus}`}>
          {LIFECYCLE_LABELS[r.lifecycleStatus] ?? r.lifecycleStatus}
        </span>
      ),
    },
    {
      key: 'quality',
      label: 'Índice de calidad',
      render: (r: Producer) => (r.qualityScore != null ? r.qualityScore : '—'),
    },
    {
      key: 'activity',
      label: 'Última actividad',
      render: (r: Producer) =>
        r.lastActivityAt
          ? new Date(r.lastActivityAt).toLocaleDateString('es-CO')
          : '—',
    },
  ], []);

  return (
    <>
      <Header
        title="Productores"
        subtitle="Registre y administre los productores de su organización"
        actions={
          <div className="row-actions">
            <Link to="/productores/dashboard" className="btn">
              Dashboard
            </Link>
            <Link to="/productores/mapa" className="btn">
              Mapa
            </Link>
            {canCreate ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/productores/nuevo')}
              >
                + Nuevo productor
              </button>
            ) : null}
          </div>
        }
      />

      {dashboard && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-label">Total</span>
            <span className="kpi-value">{dashboard.kpis.total}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Activos</span>
            <span className="kpi-value">{dashboard.kpis.active}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Pendientes de aprobación</span>
            <span className="kpi-value">{dashboard.kpis.pendingApproval}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Índice de calidad</span>
            <span className="kpi-value">{dashboard.kpis.avgQualityScore}</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && items.length === 0 && !error ? (
        <EmptyState
          illustration="data"
          title="Aún no hay productores registrados"
          description="Los productores son la base de su operación agrícola. Registre el primero para vincular fincas, lotes y formularios de campo."
          hint="También puede importar productores desde un formulario de captura en dispositivos móviles."
          action={canCreate ? { label: 'Registrar productor', to: '/productores/nuevo' } : undefined}
          secondaryAction={{ label: 'Ver mapa', to: '/productores/mapa' }}
        />
      ) : (
      <DataTable<Producer>
        gridId="producers"
        data={items}
        loading={loading}
        serverSide
        totalCount={pagination.total}
        page={pagination.page}
        pageSize={filters.limit ?? 25}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onQuickSearchChange={handleQuickSearchChange}
        onExport={canExport ? handleExport : undefined}
        onRowClick={handleRowClick}
        toolbar={serverFilters}
        bulkActions={bulkActions}
        rowActions={rowActions}
        serverFilterState={filters as unknown as Record<string, unknown>}
        onServerFilterStateApply={(state) => {
          setFilters({ ...(state as ProducerFilters), page: 1 });
        }}
        columns={columns}
        emptyMessage="No se encontraron productores con los filtros aplicados."
      />
      )}
    </>
  );
}
