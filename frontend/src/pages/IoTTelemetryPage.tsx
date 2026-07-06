import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getTelemetryDashboard, listIotTelemetry, type IotTelemetry } from '../api/iot';

export function IoTTelemetryPage() {
  const [readings, setReadings] = useState<IotTelemetry[]>([]);
  const [metrics, setMetrics] = useState<unknown[]>([]);
  useEffect(() => {
    listIotTelemetry().then(setReadings);
    getTelemetryDashboard().then(setMetrics);
  }, []);

  return (
    <>
      <Header title="Dashboard de telemetría" subtitle="Lecturas y métricas 24h" actions={<Link to="/iot" className="btn">Centro</Link>} />
      {metrics.length > 0 && (
        <section className="panel">
          <h3>Métricas agregadas (24h)</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Métrica</th><th>Promedio</th><th>Conteo</th></tr></thead>
            <tbody>
              {metrics.map((m, i) => {
                const row = m as { metricKey: string; avgValue?: number; count: number };
                return <tr key={i}><td>{row.metricKey}</td><td>{row.avgValue?.toFixed(2) ?? '—'}</td><td>{row.count}</td></tr>;
              })}
            </tbody>
          </table>
        </section>
      )}
      <section className="panel">
        <h3>Historial reciente</h3>
        <table className="data-table">
          <thead><tr><th>Dispositivo</th><th>Métrica</th><th>Valor</th><th>Unidad</th><th>Fecha</th></tr></thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{r.deviceKey}</td>
                <td>{r.metricKey}</td>
                <td>{r.value ?? r.valueText ?? '—'}</td>
                <td>{r.unit ?? '—'}</td>
                <td>{new Date(r.recordedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
