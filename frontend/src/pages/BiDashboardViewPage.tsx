import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { BiWidgetRenderer } from '../components/bi/BiWidgetRenderer';
import {
  getBiDashboard,
  getBiCategoryData,
  resolveBiWidgets,
  type BiDashboardDefinition,
  type ResolvedWidget,
} from '../api/bi';

export function BiDashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [widgets, setWidgets] = useState<ResolvedWidget[]>([]);
  const [categoryData, setCategoryData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!id) return;
    getBiDashboard(id).then((d) => {
      setName(d.name);
      setCategory(d.category);
      const def = d.versions?.[0]?.definition as BiDashboardDefinition | undefined;
      if (def?.widgets?.length) {
        resolveBiWidgets(def.widgets, d.category).then(setWidgets);
      }
      getBiCategoryData(d.category).then(setCategoryData).catch(() => undefined);
    });
  }, [id]);

  return (
    <>
      <Header
        title={name || 'Dashboard'}
        subtitle={`EBIAP — ${category}`}
        actions={
          <div className="row-actions">
            <Link to="/bi/dashboards" className="btn">Volver</Link>
            <Link to={`/bi/disenar/${id}`} className="btn btn-primary">Editar</Link>
          </div>
        }
      />

      {categoryData && (categoryData as { kpis?: Record<string, number> }).kpis && (
        <div className="kpi-grid kpi-grid-lg">
          {Object.entries((categoryData as { kpis: Record<string, number> }).kpis).map(([k, v]) => (
            <div key={k} className="kpi-card">
              <span className="kpi-label">{k}</span>
              <span className="kpi-value">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bi-dashboard-grid">
        {widgets.map((w, i) => (
          <div key={i} className="bi-dashboard-cell">
            <BiWidgetRenderer widget={w} />
          </div>
        ))}
      </div>
    </>
  );
}
