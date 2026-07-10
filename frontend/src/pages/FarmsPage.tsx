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
  deleteFarm,
  exportFarms,
  getFarmDashboard,
  listFarms,
  type FarmDashboard,
  type FarmFilters,
  type FarmUnit,
} from '../api/ftip';
import { useOnEntityUpdated, notifyEntityUpdated } from '../lib/entitySync';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_validation: 'En validación',
  active: 'Activa',
  inactive: 'Inactiva',
  abandoned: 'Abandonada',
};

export function FarmsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('farm:create');
  const canUpdate = hasPermission('farm:update');
  const canDelete = hasPermission('farm:delete');
  const canExport = hasPermission('farm:export');
  const [filters, setFilters] = useState<FarmFilters>({ page: 1, limit: 25 });
  const [items, setItems] = useState<FarmUnit[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<FarmDashboard | null>(null);
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
      const list = await listFarms(filters);
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
      setDashboard(await getFarmDashboard());
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
  }, 'farm');

  useEffect(() => {
    const raw = sessionStorage.getItem('agroerp_cmd_filter_farms');
    if (!raw) return;
    sessionStorage.removeItem('agroerp_cmd_filter_farms');
    try {
      setFilters((f) => ({ ...f, ...JSON.parse(raw), page: 1 }));
    } catch { /* ignore */ }
  }, []);

  async function handleExport() {
    const result = await exportFarms(filters);
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fincas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(row: FarmUnit) {
    if (!confirm(`¿Archivar finca "${row.farmName}"?`)) return;
    try {
      await deleteFarm(row.id);
      notifyEntityUpdated('farm', row.id);
      loadList();
      getFarmDashboard().then(setDashboard).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo archivar');
    }
  }

  const exportColumns = useMemo<GridColumnDef<FarmUnit>[]>(() => [
    { key: 'code', label: 'Código', getValue: (r) => r.farmCode },
    { key: 'name', label: 'Finca', getValue: (r) => r.farmName },
    { key: 'producer', label: 'Productor', getValue: (r) => r.producerLinks?.[0]?.producer?.legalName ?? '' },
    { key: 'area', label: 'Área (ha)', getValue: (r) => r.totalAreaHa ?? '' },
    { key: 'muni', label: 'Municipio', getValue: (r) => r.municipalityCode ?? '' },
    { key: 'status', label: 'Estado', getValue: (r) => STATUS_LABELS[r.status] ?? r.status },
  ], []);

  const bulkActions = useMemo(
    () => createStandardBulkActions(exportColumns, 'fincas', (r) => `/fincas/${r.id}`)
      .filter((a) => a.id !== 'bulk-export' || canExport),
    [exportColumns, canExport],
  );

  const rowActions = useMemo((): RowAction<FarmUnit>[] => {
    const actions: RowAction<FarmUnit>[] = [
      { id: 'view', label: 'Ver', onAction: (r) => navigate(`/fincas/${r.id}`) },
    ];
    if (canUpdate) actions.push({ id: 'edit', label: 'Editar', onAction: (r) => navigate(`/fincas/${r.id}/editar`) });
    if (canDelete) actions.push({ id: 'archive', label: 'Archivar', variant: 'danger', onAction: handleDelete });
    return actions;
  }, [canUpdate, canDelete, navigate]);

  const columns = useMemo(() => [
    { key: 'code', label: 'Código', render: (r: FarmUnit) => r.farmCode },
    { key: 'name', label: 'Finca', render: (r: FarmUnit) => r.farmName },
    {
      key: 'producer',
      label: 'Productor',
      render: (r: FarmUnit) => r.producerLinks?.[0]?.producer?.legalName ?? '—',
    },
    {
      key: 'area',
      label: 'Área (ha)',
      render: (r: FarmUnit) => (r.totalAreaHa != null ? Number(r.totalAreaHa).toFixed(2) : '—'),
    },
    { key: 'muni', label: 'Municipio', render: (r: FarmUnit) => r.municipalityCode ?? '—' },
    {
      key: 'status',
      label: 'Estado',
      render: (r: FarmUnit) => (
        <span className={`badge badge-${r.status}`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </span>
      ),
    },
    { key: 'geo', label: 'GPS', render: (r: FarmUnit) => (r.centroidLatitude != null ? '✓' : '—') },
  ], []);

  return (
    <PageLayout>
      <PageHeader
        title="Fincas"
        subtitle="Administre predios, ubicación y vínculos con productores"
        showExperience={false}
        actions={
          <PageActions>
            <Link to="/fincas/dashboard" className="btn">
              Indicadores
            </Link>
            <Link to="/fincas/mapa" className="btn">
              Mapa
            </Link>
            {canCreate ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/fincas/nueva')}
              >
                + Nueva finca
              </button>
            ) : null}
          </PageActions>
        }
      />

      {dashboard && (
        <PageSummary>
          <MetricCard label="Total" value={dashboard.kpis.total} />
          <MetricCard label="Activas" value={dashboard.kpis.active} tone="green" />
          <MetricCard label="Georreferenciadas" value={dashboard.kpis.georeferenced} />
          <MetricCard label="% con ubicación" value={`${dashboard.kpis.georefRatePct}%`} />
        </PageSummary>
      )}

      {error ? <PageState variant="error" message={error} onRetry={loadList} /> : null}

      {!loading && items.length === 0 && !error ? (
        <PageState
          variant="empty"
          title="Aún no hay fincas registradas"
          message="Las fincas representan los predios de su operación. Registre la primera para asociar lotes y productores."
          hint="Puede georreferenciar la finca después desde el detalle o el mapa."
          action={canCreate ? { label: 'Registrar finca', to: '/fincas/nueva' } : { label: 'Ver mapa', to: '/fincas/mapa' }}
        />
      ) : (
      <DataTable<FarmUnit>
        gridId="farms"
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
        onRowClick={(r) => navigate(`/fincas/${r.id}`)}
        bulkActions={bulkActions}
        rowActions={rowActions}
        serverFilterState={filters as unknown as Record<string, unknown>}
        onServerFilterStateApply={(state) => setFilters({ ...(state as FarmFilters), page: 1 })}
        emptyMessage="No se encontraron fincas con los filtros aplicados."
        toolbar={
          <>
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
              aria-label="Municipio"
            />
          </>
        }
        columns={columns}
      />
      )}
    </PageLayout>
  );
}
