import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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

  useEffect(() => { listBiReports().then(setReports); }, []);

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
      <Header
        title="Centro de Reportes"
        subtitle="Generador universal EBIAP"
        actions={<Link to="/bi" className="btn">Centro BI</Link>}
      />

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
    </>
  );
}
