import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import {
  deleteFarm,
  exportFarms,
  getFarmDashboard,
  listFarms,
  type FarmDashboard,
  type FarmFilters,
  type FarmUnit,
} from '../api/ftip';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_validation: 'En validación',
  active: 'Activa',
  inactive: 'Inactiva',
  abandoned: 'Abandonada',
};

export function FarmsPage() {
  const navigate = useNavigate();
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

  const load = useCallback(async () => {
    if (!hasItemsRef.current) setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([listFarms(filters), getFarmDashboard()]);
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
    await deleteFarm(row.id);
    load();
  }

  return (
    <>
      <Header
        title="Fincas"
        subtitle="Gestión territorial FTIP — Digital Twin"
        actions={
          <div className="row-actions">
            <Link to="/fincas/dashboard" className="btn">
              Dashboard
            </Link>
            <Link to="/fincas/mapa" className="btn">
              Mapa
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/fincas/nueva')}
            >
              + Nueva finca
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
            <span className="kpi-label">Activas</span>
            <span className="kpi-value">{dashboard.kpis.active}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Georreferenciadas</span>
            <span className="kpi-value">{dashboard.kpis.georeferenced}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">% Georef.</span>
            <span className="kpi-value">{dashboard.kpis.georefRatePct}%</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

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
        onExport={handleExport}
        onRowClick={(r) => navigate(`/fincas/${r.id}`)}
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
        columns={[
              { key: 'code', label: 'Código', render: (r) => r.farmCode },
              { key: 'name', label: 'Finca', render: (r) => r.farmName },
              {
                key: 'producer',
                label: 'Productor',
                render: (r) =>
                  r.producerLinks?.[0]?.producer?.legalName ?? '—',
              },
              {
                key: 'area',
                label: 'Área (ha)',
                render: (r) =>
                  r.totalAreaHa != null ? Number(r.totalAreaHa).toFixed(2) : '—',
              },
              { key: 'muni', label: 'Municipio', render: (r) => r.municipalityCode ?? '—' },
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
                        navigate(`/fincas/${r.id}`);
                      }}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/fincas/${r.id}/editar`);
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
