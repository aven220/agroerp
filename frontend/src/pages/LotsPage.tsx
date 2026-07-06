import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
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

  const load = useCallback(async () => {
    if (!hasItemsRef.current) setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([listLots(filters), getLotDashboard()]);
      setItems(list.items);
      hasItemsRef.current = list.items.length > 0;
      setPagination(list.pagination);
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

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
    await deleteLot(row.id);
    load();
  }

  return (
    <>
      <Header
        title="Lotes"
        subtitle="FMDT — Field Management & Digital Twin"
        actions={
          <div className="row-actions">
            <Link to="/lotes/dashboard" className="btn">
              Dashboard
            </Link>
            <Link to="/lotes/mapa" className="btn">
              Mapa
            </Link>
            <Link to="/lotes/importar" className="btn">
              Importar
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/lotes/nuevo')}
            >
              + Nuevo lote
            </button>
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
            <span className="kpi-label">Prod. YTD (kg)</span>
            <span className="kpi-value">{Number(dashboard.kpis.totalProductionYtdKg).toLocaleString('es-CO')}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Rend. prom. (kg/ha)</span>
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
        onRowClick={(r) => navigate(`/lotes/${r.id}`)}
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
        columns={[
          { key: 'code', label: 'Código', render: (r) => r.lotCode },
          { key: 'name', label: 'Lote', render: (r) => r.lotName },
          {
            key: 'farm',
            label: 'Finca',
            render: (r) => r.farmUnit?.farmName ?? '—',
          },
          {
            key: 'producer',
            label: 'Productor',
            render: (r) => r.responsibleProducer?.legalName ?? '—',
          },
          {
            key: 'crop',
            label: 'Cultivo',
            render: (r) => r.agronomicStates?.[0]?.primaryCropCode ?? '—',
          },
          {
            key: 'area',
            label: 'Área (ha)',
            render: (r) =>
              r.totalAreaHa != null ? Number(r.totalAreaHa).toFixed(2) : '—',
          },
          {
            key: 'status',
            label: 'Estado',
            render: (r) => (
              <span className={`badge badge-${r.status}`}>
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: 'geo',
            label: 'GPS',
            render: (r) =>
              r.centroidLatitude != null ? '✓' : '—',
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (r) => (
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/lotes/${r.id}`);
                  }}
                >
                  Ver
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/lotes/${r.id}/editar`);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r);
                  }}
                >
                  Archivar
                </button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
