import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSummary,
  MetricCard,
  PageState,
} from '../components/page';
import { DataTable, type RowAction } from '../components/ui/DataTable';
import { useAuth } from '../context/AuthContext';
import { createStandardBulkActions } from '../lib/gridBulkActions';
import type { GridColumnDef } from '../lib/data-grid/types';
import {
  deleteLot,
  exportLots,
  getLotDashboard,
  listLots,
  type FieldLotProfile,
  type LotDashboard,
  type LotFilters,
} from '../api/fmdt';
import { useOnEntityUpdated, notifyEntityUpdated } from '../lib/entitySync';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  fallow: 'Barbecho',
  renovation: 'Renovación',
  inactive: 'Inactivo',
  abandoned: 'Abandonado',
};

export function LotsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('lot:create');
  const canUpdate = hasPermission('lot:update');
  const canDelete = hasPermission('lot:delete');
  const canImport = hasPermission('lot:import');
  const canExport = hasPermission('lot:export');
  const [filters, setFilters] = useState<LotFilters>({ page: 1, limit: 25 });
  const [items, setItems] = useState<FieldLotProfile[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<LotDashboard | null>(null);
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
      const list = await listLots(filters);
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
      setDashboard(await getLotDashboard());
    } catch {
      /* KPIs opcionales */
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
  }, 'lot');

  useEffect(() => {
    const raw = sessionStorage.getItem('agroerp_cmd_filter_lots');
    if (!raw) return;
    sessionStorage.removeItem('agroerp_cmd_filter_lots');
    try {
      setFilters((f) => ({ ...f, ...JSON.parse(raw), page: 1 }));
    } catch { /* ignore */ }
  }, []);

  async function handleExport() {
    const result = await exportLots(filters);
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lotes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(row: FieldLotProfile) {
    if (!confirm(`¿Archivar lote "${row.lotName}"?`)) return;
    try {
      await deleteLot(row.id);
      notifyEntityUpdated('lot', row.id);
      loadList();
      getLotDashboard().then(setDashboard).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo archivar');
    }
  }

  const exportColumns = useMemo<GridColumnDef<FieldLotProfile>[]>(() => [
    { key: 'code', label: 'Código', getValue: (r) => r.lotCode },
    { key: 'name', label: 'Lote', getValue: (r) => r.lotName },
    { key: 'farm', label: 'Finca', getValue: (r) => r.farmUnit?.farmName ?? '' },
    { key: 'producer', label: 'Productor', getValue: (r) => r.responsibleProducer?.legalName ?? '' },
    { key: 'crop', label: 'Cultivo', getValue: (r) => r.agronomicStates?.[0]?.primaryCropCode ?? '' },
    { key: 'area', label: 'Área (ha)', getValue: (r) => r.totalAreaHa ?? '' },
    { key: 'status', label: 'Estado', getValue: (r) => STATUS_LABELS[r.status] ?? r.status },
  ], []);

  const bulkActions = useMemo(
    () => createStandardBulkActions(exportColumns, 'lotes', (r) => `/lotes/${r.id}`)
      .filter((a) => a.id !== 'bulk-export' || canExport),
    [exportColumns, canExport],
  );

  const rowActions = useMemo((): RowAction<FieldLotProfile>[] => {
    const actions: RowAction<FieldLotProfile>[] = [
      { id: 'view', label: 'Ver', onAction: (r) => navigate(`/lotes/${r.id}`) },
    ];
    if (canUpdate) actions.push({ id: 'edit', label: 'Editar', onAction: (r) => navigate(`/lotes/${r.id}/editar`) });
    if (canDelete) actions.push({ id: 'archive', label: 'Archivar', variant: 'danger', onAction: handleDelete });
    return actions;
  }, [canUpdate, canDelete, navigate]);

  const columns = useMemo(() => [
    { key: 'code', label: 'Código', render: (r: FieldLotProfile) => r.lotCode },
    { key: 'name', label: 'Lote', render: (r: FieldLotProfile) => r.lotName },
    { key: 'farm', label: 'Finca', render: (r: FieldLotProfile) => r.farmUnit?.farmName ?? '—' },
    { key: 'producer', label: 'Productor', render: (r: FieldLotProfile) => r.responsibleProducer?.legalName ?? '—' },
    { key: 'crop', label: 'Cultivo', render: (r: FieldLotProfile) => r.agronomicStates?.[0]?.primaryCropCode ?? '—' },
    {
      key: 'area',
      label: 'Área (ha)',
      render: (r: FieldLotProfile) => (r.totalAreaHa != null ? Number(r.totalAreaHa).toFixed(2) : '—'),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (r: FieldLotProfile) => (
        <span className={`badge badge-${r.status}`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </span>
      ),
    },
    { key: 'geo', label: 'GPS', render: (r: FieldLotProfile) => (r.centroidLatitude != null ? '✓' : '—') },
  ], []);

  return (
    <PageLayout>
      <PageHeader
        title="Lotes"
        subtitle="Gestione lotes productivos, cultivos y rendimiento por parcela"
        showExperience={false}
        actions={
          <PageActions>
            <Link to="/lotes/dashboard" className="btn">
              Indicadores
            </Link>
            <Link to="/lotes/mapa" className="btn">
              Mapa
            </Link>
            {canImport ? (
              <Link to="/lotes/importar" className="btn">
                Importar
              </Link>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/lotes/nuevo')}
              >
                + Nuevo lote
              </button>
            ) : null}
          </PageActions>
        }
      />

      {dashboard && (
        <PageSummary>
          <MetricCard label="Total" value={dashboard.kpis.total} />
          <MetricCard label="Activos" value={dashboard.kpis.active} tone="green" />
          <MetricCard
            label="Producción del año (kg)"
            value={Number(dashboard.kpis.totalProductionYtdKg).toLocaleString('es-CO')}
          />
          <MetricCard label="Rendimiento promedio (kg/ha)" value={dashboard.kpis.avgYieldKgHa} />
          <MetricCard label="Riesgos activos" value={dashboard.kpis.activeRisks} />
          <MetricCard label="Georreferenciados" value={dashboard.kpis.georeferenced} />
        </PageSummary>
      )}

      {error ? <PageState variant="error" message={error} onRetry={loadList} /> : null}

      {!loading && items.length === 0 && !error ? (
        <PageState
          variant="empty"
          title="Aún no hay lotes registrados"
          message="Los lotes son las unidades productivas dentro de cada finca. Registre el primero para llevar seguimiento agronómico y de cosecha."
          hint="Si ya tiene fincas, puede crear lotes vinculados desde el detalle de la finca."
          action={
            canCreate
              ? { label: 'Registrar lote', to: '/lotes/nuevo' }
              : canImport
                ? { label: 'Importar lotes', to: '/lotes/importar' }
                : { label: 'Ver mapa', to: '/lotes/mapa' }
          }
        />
      ) : (
      <DataTable<FieldLotProfile>
        gridId="lots"
        data={items}
        loading={loading}
        serverSide
        totalCount={pagination.total}
        page={pagination.page}
        pageSize={filters.limit ?? 25}
        onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        onPageSizeChange={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
        onQuickSearchChange={handleQuickSearchChange}
        onExport={canExport ? handleExport : undefined}
        emptyMessage="No se encontraron lotes con los filtros aplicados."
        onRowClick={(r) => navigate(`/lotes/${r.id}`)}
        bulkActions={bulkActions}
        rowActions={rowActions}
        serverFilterState={filters as unknown as Record<string, unknown>}
        onServerFilterStateApply={(state) => setFilters({ ...(state as LotFilters), page: 1 })}
        toolbar={
          <select
            className="ds-input edw-density-select"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value || undefined,
                page: 1,
              }))
            }
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        }
        columns={columns}
      />
      )}
    </PageLayout>
  );
}
