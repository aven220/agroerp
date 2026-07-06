import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
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

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pre_registered: 'Pre-registro',
  pending_approval: 'Pendiente aprobación',
  active: 'Activo',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

export function ProducersPage() {
  const navigate = useNavigate();
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

  const load = useCallback(async () => {
    if (!hasItemsRef.current) setLoading(true);
    setError(null);
    try {
      const [list, dash, segs] = await Promise.all([
        listProducers(filters),
        getProducerDashboard(),
        listSegments(),
      ]);
      setItems(list.items);
      hasItemsRef.current = list.items.length > 0;
      setPagination(list.pagination);
      setDashboard(dash);
      setSegments(segs);
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
    const result = await exportProducers(filters);
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(row: Producer) {
    if (!confirm(`¿Archivar productor "${row.legalName}"?`)) return;
    await deleteProducer(row.id);
    load();
  }

  const serverFilters = (
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
  );

  return (
    <>
      <Header
        title="Productores"
        subtitle="Gestión de expedientes PRM"
        actions={
          <div className="row-actions">
            <Link to="/productores/dashboard" className="btn">
              Dashboard
            </Link>
            <Link to="/productores/mapa" className="btn">
              Mapa
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/productores/nuevo')}
            >
              + Nuevo productor
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
            <span className="kpi-label">Pend. aprobación</span>
            <span className="kpi-value">{dashboard.kpis.pendingApproval}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Score calidad</span>
            <span className="kpi-value">{dashboard.kpis.avgQualityScore}</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable<Producer>
        gridId="producers"
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
        onRowClick={(r) => navigate(`/productores/${r.id}`)}
        toolbar={serverFilters}
        columns={[
          {
            key: 'code',
            label: 'Código',
            render: (r) => r.producerNumber,
            sortable: true,
          },
          {
            key: 'name',
            label: 'Nombre',
            render: (r) => r.legalName,
            sortable: true,
          },
          {
            key: 'doc',
            label: 'Documento',
            render: (r) => `${r.documentTypeCode} ${r.documentNumber}`,
          },
          {
            key: 'muni',
            label: 'Municipio',
            render: (r) => r.municipalityCode ?? '—',
          },
          {
            key: 'status',
            label: 'Estado',
            render: (r) => (
              <span className={`badge badge-${r.lifecycleStatus}`}>
                {LIFECYCLE_LABELS[r.lifecycleStatus] ?? r.lifecycleStatus}
              </span>
            ),
          },
          {
            key: 'quality',
            label: 'Calidad',
            render: (r) => r.qualityScore,
          },
          {
            key: 'activity',
            label: 'Última actividad',
            render: (r) =>
              r.lastActivityAt
                ? new Date(r.lastActivityAt).toLocaleDateString('es-CO')
                : '—',
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
                    navigate(`/productores/${r.id}`);
                  }}
                >
                  Ver
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/productores/${r.id}/editar`);
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
