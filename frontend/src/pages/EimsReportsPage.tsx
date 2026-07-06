import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  listEimsReportDefinitions,
  listEimsReportRuns,
  listEimsReports,
  runEimsReport,
  saveEimsReportDefinition,
} from '../api/eims';

function downloadContent(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function EimsReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reportType: 'valued_inventory',
    format: 'csv',
    warehouseKey: '',
    name: 'Reporte personalizado',
  });

  const reload = async () => {
    const [r, d, runsList] = await Promise.all([
      listEimsReports(),
      listEimsReportDefinitions(),
      listEimsReportRuns(),
    ]);
    setReports([...(r as Array<Record<string, unknown>>), ...(d as Array<Record<string, unknown>>)]);
    setRuns(runsList as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const run = async (format: string) => {
    const result = await runEimsReport({
      reportType: form.reportType,
      format,
      filters: form.warehouseKey ? { warehouseKey: form.warehouseKey } : {},
    });
    const ext = format === 'excel' ? 'xls' : format;
    downloadContent(
      `${form.reportType}.${ext}`,
      String(result.content ?? ''),
      String(result.contentType ?? 'text/plain'),
    );
    await reload();
  };

  return (
    <>
      <Header
        title="Centro de reportes"
        subtitle="Inventario valorizado, kardex, rotación, cobertura, conteos y más"
        actions={<Link to="/inventario/ops" className="btn">Ops Center</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <h3>Generar reporte</h3>
        <div className="row-actions">
          <select value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })}>
            <option value="valued_inventory">Inventario valorizado</option>
            <option value="kardex">Kardex</option>
            <option value="turnover">Rotación</option>
            <option value="coverage">Cobertura</option>
            <option value="stock">Existencias</option>
            <option value="counts">Conteos</option>
            <option value="differences">Diferencias</option>
            <option value="expiry">Vencimientos</option>
            <option value="reservations">Reservas</option>
            <option value="replenishment">Abastecimiento</option>
            <option value="movements">Movimientos</option>
          </select>
          <input placeholder="Filtro bodega" value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })} />
          <button className="btn" onClick={() => run('csv').catch((e) => setError(e.message))}>CSV</button>
          <button className="btn" onClick={() => run('excel').catch((e) => setError(e.message))}>Excel</button>
          <button className="btn" onClick={() => run('pdf').catch((e) => setError(e.message))}>PDF</button>
        </div>
      </section>
      <section className="panel">
        <h3>Constructor de reportes personalizados</h3>
        <div className="row-actions">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <button
            className="btn btn-primary"
            onClick={() =>
              saveEimsReportDefinition({
                name: form.name,
                reportType: form.reportType,
                filters: form.warehouseKey ? { warehouseKey: form.warehouseKey } : {},
                columns: ['itemKey', 'warehouseKey', 'onHandQty', 'totalCost'],
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Guardar definición
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Definiciones</h3>
        <ul>
          {reports.map((r) => (
            <li key={String(r.id ?? r.reportKey)}>
              {String(r.reportKey)} — {String(r.name)} [{String(r.reportType)}]
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Historial de exportaciones</h3>
        <table className="data-table">
          <thead>
            <tr><th>Run</th><th>Reporte</th><th>Formato</th><th>Filas</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={String(r.runKey)}>
                <td>{String(r.runKey)}</td>
                <td>{String(r.reportKey)}</td>
                <td>{String(r.format)}</td>
                <td>{String(r.rowCount)}</td>
                <td>{String(r.generatedAt).slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
