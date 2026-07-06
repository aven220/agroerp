import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getFormDashboard, saveFormsReport, type FormDashboard } from '../api/forms';
import { LoadingState } from '../components/ux/LoadingState';

export function FormsDashboardPage() {
  const [dashboard, setDashboard] = useState<FormDashboard | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getFormDashboard().then(setDashboard);
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await saveFormsReport('full');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el reporte');
    } finally {
      setExporting(false);
    }
  }

  if (!dashboard) return <LoadingState variant="dashboard" message="Cargando dashboard..." />;

  return (
    <>
      <Header
        title="Dashboard UDFE"
        subtitle="KPIs del motor de formularios"
        actions={
          <div className="row-actions">
            <Link to="/formularios" className="btn">Catálogo</Link>
            <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
              {exporting ? 'Generando...' : 'Descargar reporte (Excel)'}
            </button>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Formularios</span>
          <span className="kpi-value">{dashboard.kpis.totalForms}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Publicados</span>
          <span className="kpi-value">{dashboard.kpis.publishedForms}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Borradores</span>
          <span className="kpi-value">{dashboard.kpis.draftForms}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">En revisión</span>
          <span className="kpi-value">{dashboard.kpis.inReviewForms}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Envíos totales</span>
          <span className="kpi-value">{dashboard.kpis.totalSubmissions}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pend. sincronización</span>
          <span className="kpi-value">{dashboard.kpis.pendingSync}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Asignaciones pendientes</span>
          <span className="kpi-value">{dashboard.kpis.pendingAssignments}</span>
        </div>
      </div>
      <div className="dashboard-panels">
        <div className="panel">
          <h3>Por estado</h3>
          <ul className="stat-list">
            {dashboard.byStatus.map((s) => (
              <li key={s.status}><span>{s.status}</span><strong>{s.count}</strong></li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Top formularios</h3>
          <ul className="stat-list">
            {dashboard.topForms.map((f) => (
              <li key={f.formId}>
                <span>{f.name ?? f.formKey}</span>
                <strong>{f.submissions}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
