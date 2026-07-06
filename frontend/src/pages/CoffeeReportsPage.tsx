import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  downloadReportExport,
  generateCoffeeReport,
  generateCustomCoffeeReport,
  listCoffeeReports,
} from '../api/coffee';

const REPORT_TYPES = [
  'daily', 'weekly', 'monthly', 'yearly',
  'producer', 'farm', 'lot', 'financial', 'quality', 'audit',
];

export function CoffeeReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [reportType, setReportType] = useState('daily');
  const [period, setPeriod] = useState('day');
  const [format, setFormat] = useState('csv');
  const [customTitle, setCustomTitle] = useState('Reporte personalizado');
  const [groupBy, setGroupBy] = useState('producer');
  const [error, setError] = useState('');

  const reload = () => listCoffeeReports().then((r) => setReports(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const generate = async () => {
    setError('');
    try {
      const report = await generateCoffeeReport({ reportType, period, format });
      downloadReportExport(report);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando reporte');
    }
  };

  const generateCustom = async () => {
    setError('');
    try {
      const report = await generateCustomCoffeeReport({
        title: customTitle,
        groupBy,
        period,
        format,
        metrics: ['kgTotal', 'amountTotal', 'avgPricePerKg'],
      });
      downloadReportExport(report);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error reporte personalizado');
    }
  };

  return (
    <>
      <Header
        title="Centro de reportes"
        subtitle="Diarios, financieros, calidad, auditoría y personalizados"
        actions={<Link to="/compras/ops" className="btn">Operations</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <h3>Generar reporte</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
          </select>
          <button className="btn" onClick={generate}>Generar y exportar</button>
        </div>
      </section>

      <section className="panel">
        <h3>Constructor personalizado</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="producer">Productor</option>
            <option value="farm">Finca</option>
            <option value="lot">Lote</option>
            <option value="center">Centro</option>
          </select>
          <button className="btn" onClick={generateCustom}>Generar personalizado</button>
        </div>
      </section>

      <section className="panel">
        <h3>Historial de reportes</h3>
        <table className="data-table">
          <thead>
            <tr><th>Clave</th><th>Tipo</th><th>Periodo</th><th>Formato</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.reportKey)}</td>
                <td>{String(r.reportType)}</td>
                <td>{String(r.period)}</td>
                <td>{String(r.format)}</td>
                <td>{r.generatedAt ? new Date(String(r.generatedAt)).toLocaleString() : '—'}</td>
                <td>
                  <button className="btn" onClick={() => downloadReportExport(r)}>Descargar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
