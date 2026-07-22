import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
} from '../components/page';
import {
  BI_REPORT_FORMATS,
  downloadExport,
  listBiReports,
  runBiReport,
  type BiReport,
} from '../api/bi';

export function BiReportsPage() {
  const [reports, setReports] = useState<BiReport[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listBiReports()
      .then(setReports)
      .finally(() => setLoaded(true));
  }, []);

  async function handleRun(id: string, format: string) {
    setRunning(id);
    try {
      const result = await runBiReport(id, format);
      const ext = format === 'excel' ? 'xls' : format;
      downloadExport(result.export.content, `reporte-${id}.${ext}`, result.export.mimeType);
    } finally {
      setRunning(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Centro de Reportes"
        subtitle="Cree reportes personalizados con filtros y agrupaciones"
        actions={
          <PageActions>
            <Link to="/bi" className="btn">
              Centro BI
            </Link>
            <Link to="/bi/dashboards" className="btn">
              Tableros
            </Link>
          </PageActions>
        }
      />
      <PageLayout>
        <PageSummary>
          <MetricCard label="Reportes" value={reports.length} tone="teal" />
          <MetricCard label="Formatos" value={BI_REPORT_FORMATS.length} />
          <MetricCard label="Estado" value={loaded ? 'Listo' : 'Cargando…'} tone="green" />
        </PageSummary>

        {!loaded ? (
          <PageState variant="loading" message="Cargando reportes…" loadingVariant="table" />
        ) : reports.length === 0 ? (
          <PageState
            variant="empty"
            title="Sin reportes"
            message="Cuando existan reportes configurados, podrá ejecutarlos y exportarlos desde aquí."
            action={{ label: 'Volver al Centro BI', to: '/bi' }}
          />
        ) : (
          <PageSection title="Catálogo de reportes">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reporte</th>
                    <th>Estado</th>
                    <th>Versión</th>
                    <th>Exportar</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                        <div className="text-muted">{r.reportKey}</div>
                      </td>
                      <td>{r.status}</td>
                      <td>v{r.version}</td>
                      <td>
                        <div className="row-actions">
                          {BI_REPORT_FORMATS.map((f) => (
                            <button
                              key={f}
                              type="button"
                              className="btn btn-sm"
                              disabled={running === r.id}
                              onClick={() => handleRun(r.id, f)}
                            >
                              {f.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        )}
      </PageLayout>
    </>
  );
}
