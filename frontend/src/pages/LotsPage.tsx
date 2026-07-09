import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DataTable, type RowAction } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
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
    () => createStandardBulkActions(exportColumns, 'lotes', (r) => `/lotes/${r.id}`),
    [exportColumns],
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
    <>
      <Header
        title="Lotes"
        subtitle="Gestione lotes productivos, cultivos y rendimiento por parcela"
        actions={
          <div className="row-actions">
            <Link to="/lotes/dashboard" className="btn">
              Dashboard
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
            <span className="kpi-label">Producción del año (kg)</span>
            <span className="kpi-value">{Number(dashboard.kpis.totalProductionYtdKg).toLocaleString('es-CO')}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Rendimiento promedio (kg/ha)</span>
            <span className="kpi-value">{dashboard.kpis.avgYieldKgHa}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Riesgos activos</span>
            <span className="kpi-value">{dashboard.kpis.activeRisks}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Georreferenciados</span>
            <span className="kpi-value">{dashboard.kpis.georeferenced}</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && items.length === 0 && !error ? (
        <EmptyState
          illustration="data"
          title="Aún no hay lotes registrados"
          description="Los lotes son las unidades productivas dentro de cada finca. Registre el primero para llevar seguimiento agronómico y de cosecha."
          hint="Si ya tiene fincas, puede crear lotes vinculados desde el detalle de la finca."
          action={canCreate ? { label: 'Registrar lote', to: '/lotes/nuevo' } : undefined}
          secondaryAction={canImport ? { label: 'Importar lotes', to: '/lotes/importar' } : { label: 'Ver mapa', to: '/lotes/mapa' }}
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
        onExport={handleExport}
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
    </>
  );
}
