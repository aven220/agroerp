import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getWeighingMonitor, syncWeighingContingency } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeWeighingMonitorPage() {
  const [monitor, setMonitor] = useState<Record<string, unknown> | null>(null);

  const reload = () => getWeighingMonitor().then(setMonitor);
  useEffect(() => {
    reload().catch(() => undefined);
    const t = setInterval(() => reload().catch(() => undefined), 3000);
    return () => clearInterval(t);
  }, []);

  if (!monitor) return <LoadingState variant="page" message="Cargando monitor de pesaje..." />;

  const summary = (monitor.summary ?? {}) as Record<string, number>;
  const scales = (monitor.scales ?? []) as Array<Record<string, unknown>>;
  const sessions = (monitor.activeSessions ?? []) as Array<Record<string, unknown>>;
  const alerts = (monitor.alerts ?? []) as Array<Record<string, unknown>>;
  const readings = (monitor.recentReadings ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header
        title="Monitor de pesaje en tiempo real"
        subtitle="Estado de balanzas, sesiones y lecturas"
        actions={
          <>
            <button className="btn" onClick={() => syncWeighingContingency().then(reload)}>
              Sincronizar contingencias
            </button>
            <Link to="/compras/pesaje" className="btn">Panel pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <section className="panel grid-4">
        <div><strong>Balanzas disponibles</strong><div>{summary.availableScales ?? 0}</div></div>
        <div><strong>Ocupadas</strong><div>{summary.busyScales ?? 0}</div></div>
        <div><strong>Sesiones abiertas</strong><div>{summary.openSessions ?? 0}</div></div>
        <div><strong>Alertas</strong><div>{summary.openAlerts ?? 0}</div></div>
      </section>

      <section className="panel">
        <h3>Balanzas</h3>
        <table className="data-table">
          <thead>
            <tr><th>Balanza</th><th>Conexión</th><th>Estado</th><th>Último peso</th><th>Última señal</th></tr>
          </thead>
          <tbody>
            {scales.map((s) => (
              <tr key={String(s.scaleKey)}>
                <td>{String(s.name)}</td>
                <td>{String(s.connectionType)}</td>
                <td>{String(s.status)}</td>
                <td>{s.lastWeightKg != null ? `${s.lastWeightKg} kg` : '—'}</td>
                <td>{s.lastSeenAt ? new Date(String(s.lastSeenAt)).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Sesiones activas</h3>
        <table className="data-table">
          <thead>
            <tr><th>Número</th><th>Ticket</th><th>Productor</th><th>Estado</th><th>Neto</th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const ticket = s.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={String(s.sessionKey)}>
                  <td>{String(s.weighingNumber)}</td>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{String(s.status)}</td>
                  <td>{s.netWeightKg != null ? `${s.netWeightKg} kg` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Lecturas recientes</h3>
        <table className="data-table">
          <thead>
            <tr><th>Tipo</th><th>Peso</th><th>Fuente</th><th>Estable</th><th>Hora</th></tr>
          </thead>
          <tbody>
            {readings.map((r, i) => (
              <tr key={i}>
                <td>{String(r.weighingType)}</td>
                <td>{r.weightKg != null ? `${r.weightKg} kg` : '—'}</td>
                <td>{String(r.source)}</td>
                <td>{r.isStable ? 'Sí' : 'No'}</td>
                <td>{r.recordedAt ? new Date(String(r.recordedAt)).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Alertas abiertas</h3>
        <ul>
          {alerts.map((a, i) => (
            <li key={i}>[{String(a.severity)}] {String(a.code)} — {String(a.message)}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
