import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  BI_CATEGORIES,
  deleteBiDashboard,
  duplicateBiDashboard,
  listBiDashboards,
  publishBiDashboard,
  type BiDashboard,
} from '../api/bi';

const CATEGORY_LABELS: Record<string, string> = {
  executive: 'Ejecutivo',
  financial: 'Financiero',
  commercial: 'Comercial',
  operational: 'Operativo',
  agronomic: 'Agronómico',
  purchases: 'Compras',
  inventory: 'Inventario',
  quality: 'Calidad',
  producers: 'Productores',
  gis: 'GIS',
  ai: 'IA',
  custom: 'Personalizable',
};

export function BiDashboardsPage() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') ?? undefined;
  const [dashboards, setDashboards] = useState<BiDashboard[]>([]);
  const navigate = useNavigate();

  const load = () => listBiDashboards({ category: categoryFilter }).then(setDashboards);
  useEffect(() => { load(); }, [categoryFilter]);

  async function handleDuplicate(id: string) {
    await duplicateBiDashboard(id);
    load();
  }

  async function handlePublish(id: string) {
    await publishBiDashboard(id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar dashboard?')) return;
    await deleteBiDashboard(id);
    load();
  }

  return (
    <>
      <Header
        title="Administrador de Dashboards"
        subtitle="EBIAP — visualización empresarial"
        actions={
          <div className="row-actions">
            <Link to="/bi" className="btn">Centro BI</Link>
            <Link to="/bi/disenar" className="btn btn-primary">Nuevo dashboard</Link>
          </div>
        }
      />

      <div className="filter-bar">
        <Link to="/bi/dashboards" className={`filter-chip${!categoryFilter ? ' active' : ''}`}>Todos</Link>
        {BI_CATEGORIES.map((c) => (
          <Link
            key={c}
            to={`/bi/dashboards?category=${c}`}
            className={`filter-chip${categoryFilter === c ? ' active' : ''}`}
          >
            {CATEGORY_LABELS[c] ?? c}
          </Link>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Sistema</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {dashboards.map((d) => (
            <tr key={d.id}>
              <td>
                <Link to={`/bi/dashboards/${d.id}`}>{d.name}</Link>
                <div className="text-muted">{d.dashboardKey}</div>
              </td>
              <td>{CATEGORY_LABELS[d.category] ?? d.category}</td>
              <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
              <td>{d.isSystem ? 'Sí' : 'No'}</td>
              <td>
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => navigate(`/bi/dashboards/${d.id}`)}>Ver</button>
                  <button type="button" className="btn btn-sm" onClick={() => navigate(`/bi/disenar/${d.id}`)}>Editar</button>
                  <button type="button" className="btn btn-sm" onClick={() => handleDuplicate(d.id)}>Duplicar</button>
                  {d.status !== 'published' && (
                    <button type="button" className="btn btn-sm" onClick={() => handlePublish(d.id)}>Publicar</button>
                  )}
                  {!d.isSystem && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Eliminar</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
