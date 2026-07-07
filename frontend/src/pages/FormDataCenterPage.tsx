import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { LoadingState } from '../components/ux/LoadingState';
import { getFormDashboard, listForms, runFormReport } from '../api/forms';

interface DataCenterReport {
  reportCode?: string;
  totals?: {
    submissions: number;
    withGps: number;
    synced: number;
    pending: number;
    failed: number;
    activeCampaigns: number;
  };
  submissionsByForm?: Array<{ formId: string; formKey: string; name: string; count: number }>;
  submissionsByDay?: Array<{ date: string; count: number }>;
  campaigns?: Array<{ id: string; code: string; name: string; status: string; expectedCount?: number | null }>;
}

export function FormDataCenterPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFormDashboard>> | null>(null);
  const [report, setReport] = useState<DataCenterReport | null>(null);
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [formId, setFormId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rpt, formList] = await Promise.all([
        getFormDashboard(),
        runFormReport('UDFE-RPT-05', formId || undefined) as Promise<DataCenterReport>,
        listForms({ status: 'published' }),
      ]);
      setDashboard(dash);
      setReport(rpt);
      setForms(formList.map((f) => ({ id: f.id, name: f.name })));
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const maxDay = Math.max(...(report?.submissionsByDay?.map((d) => d.count) ?? [1]), 1);

  return (
    <>
      <Header
        title="Centro de Datos"
        subtitle="Indicadores, tendencias y cruce de información recolectada"
      />
      <FormsPlatformNav />

      <div className="filter-bar">
        <select value={formId} onChange={(e) => setFormId(e.target.value)}>
          <option value="">Todos los formularios publicados</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <Link to="/formularios/recoleccion" className="btn btn-sm">Ver registros</Link>
        <Link to="/formularios/exportar" className="btn btn-sm btn-primary">Exportar</Link>
      </div>

      {loading ? <LoadingState variant="dashboard" /> : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card kpi-green"><span className="kpi-label">Envíos</span><span className="kpi-value">{report?.totals?.submissions ?? dashboard?.kpis.totalSubmissions ?? 0}</span></div>
            <div className="kpi-card"><span className="kpi-label">Sincronizados</span><span className="kpi-value">{report?.totals?.synced ?? 0}</span></div>
            <div className="kpi-card"><span className="kpi-label">Pendientes sync</span><span className="kpi-value">{report?.totals?.pending ?? dashboard?.kpis.pendingSync ?? 0}</span></div>
            <div className="kpi-card"><span className="kpi-label">Con GPS</span><span className="kpi-value">{report?.totals?.withGps ?? 0}</span></div>
            <div className="kpi-card"><span className="kpi-label">Campañas activas</span><span className="kpi-value">{report?.totals?.activeCampaigns ?? 0}</span></div>
            <div className="kpi-card"><span className="kpi-label">Formularios pub.</span><span className="kpi-value">{dashboard?.kpis.publishedForms ?? 0}</span></div>
          </div>

          <div className="form-datacenter-grid">
            <section className="panel">
              <h3 className="ds-h4">Envíos por formulario</h3>
              {(report?.submissionsByForm?.length ?? 0) === 0 ? (
                <p className="muted">Sin datos aún.</p>
              ) : (
                <ul className="form-bar-chart">
                  {report?.submissionsByForm?.map((row) => (
                    <li key={row.formId}>
                      <span className="form-bar-label">{row.name}</span>
                      <div className="form-bar-track">
                        <div
                          className="form-bar-fill"
                          style={{
                            width: `${Math.round((row.count / (report?.totals?.submissions || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="form-bar-value">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h3 className="ds-h4">Tendencia diaria</h3>
              {(report?.submissionsByDay?.length ?? 0) === 0 ? (
                <p className="muted">Sin tendencia registrada.</p>
              ) : (
                <div className="form-trend-chart">
                  {report?.submissionsByDay?.map((d) => (
                    <div key={d.date} className="form-trend-bar-wrap" title={`${d.date}: ${d.count}`}>
                      <div className="form-trend-bar" style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }} />
                      <span className="form-trend-label">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <h3 className="ds-h4">Campañas</h3>
              {(report?.campaigns?.length ?? 0) === 0 ? (
                <p className="muted">Sin campañas. <Link to="/formularios/campanas">Crear campaña</Link></p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Nombre</th><th>Estado</th><th>Meta</th></tr></thead>
                  <tbody>
                    {report?.campaigns?.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.status}</td>
                        <td>{c.expectedCount ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h3 className="ds-h4">Mapa (GPS)</h3>
              <p className="muted">
                Exporte a <strong>GeoJSON</strong> desde la sección Exportar para visualizar en GIS externo o AGROERP GIS.
                Registros con coordenadas: <strong>{report?.totals?.withGps ?? 0}</strong>.
              </p>
              <Link to="/formularios/exportar" className="btn btn-sm">Exportar GeoJSON</Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
