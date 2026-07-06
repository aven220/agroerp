import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getIotCenter, type IotCenter } from '../api/iot';
import { LoadingState } from '../components/ux/LoadingState';

export function IoTCenterPage() {
  const [center, setCenter] = useState<IotCenter | null>(null);
  useEffect(() => { getIotCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro IoT..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Centro IoT — EIESDP"
        subtitle="Enterprise IoT, Edge & Smart Devices Platform"
        actions={
          <div className="row-actions">
            <Link to="/iot/dispositivos" className="btn">Dispositivos</Link>
            <Link to="/iot/mapa" className="btn">Mapa</Link>
            <Link to="/iot/telemetria" className="btn">Telemetría</Link>
            <Link to="/iot/alertas" className="btn">Alertas</Link>
            <Link to="/iot/firmware" className="btn">Firmware</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Dispositivos</span><span className="kpi-value">{d.totalDevices}</span></div>
        <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{d.activeDevices}</span></div>
        <div className="kpi-card"><span className="kpi-label">Offline</span><span className="kpi-value">{d.offlineDevices}</span></div>
        <div className="kpi-card"><span className="kpi-label">Lecturas 24h</span><span className="kpi-value">{d.readings24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas abiertas</span><span className="kpi-value">{d.alertsOpen}</span></div>
        <div className="kpi-card"><span className="kpi-label">Gateways online</span><span className="kpi-value">{d.gatewaysOnline}</span></div>
      </div>
      {center.suggestions.length > 0 && (
        <section className="panel">
          <h3>Análisis IA</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
            <tbody>
              {center.suggestions.map((s, i) => (
                <tr key={i}>
                  <td>{String((s as { type?: string }).type ?? '')}</td>
                  <td>{String((s as { recommendation?: string }).recommendation ?? JSON.stringify(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
