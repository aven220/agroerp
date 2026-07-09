import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  acknowledgeOpsAlert,
  evaluateOpsAlerts,
  getOperationalDashboard,
} from '../api/coffee';
import { useIsMounted } from '../hooks/useIsMounted';
import { useOnEntityUpdated } from '../lib/entitySync';

export function CoffeeOpsCenterPage() {
  const mounted = useIsMounted();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const reload = () =>
    getOperationalDashboard().then((next) => {
      if (mounted.current) setData(next);
    });

  useEffect(() => {
    reload().catch(() => undefined);
    const t = setInterval(() => reload().catch(() => undefined), 15000);
    return () => clearInterval(t);
  }, [mounted]);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase', 'inventory']);

  if (!data) return <LoadingState variant="dashboard" message="Cargando operations center..." />;
  const ops = (data.operations ?? {}) as Record<string, unknown>;
  const alerts = (data.alerts ?? []) as Array<Record<string, unknown>>;
  const byHour = (ops.purchasesByHour ?? []) as Array<Record<string, unknown>>;
  const stages = (ops.stages ?? {}) as Record<string, number>;
  const liveQueue = (ops.liveQueue ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header
        title="Operations Center — Compras de Café"
        subtitle="Monitoreo en tiempo real"
        actions={
          <>
            <button className="btn" onClick={() => evaluateOpsAlerts().then(reload)}>Evaluar alertas</button>
            <Link to="/compras/ops/ejecutivo" className="btn">Ejecutivo</Link>
            <Link to="/compras/ops/analitica" className="btn">Analítica</Link>
            <Link to="/compras/ops/reportes" className="btn">Reportes</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Compras hoy</span><span className="kpi-value">{String(ops.purchasesToday ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Productores atendidos</span><span className="kpi-value">{String(ops.producersAttended ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">En espera</span><span className="kpi-value">{String(ops.producersWaiting ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Turnos activos</span><span className="kpi-value">{String(ops.activeTurns ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Atención prom. (min)</span><span className="kpi-value">{String(ops.avgAttentionMinutes ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pesaje prom. (min)</span><span className="kpi-value">{String(ops.avgWeighingMinutes ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Calidad prom. (min)</span><span className="kpi-value">{String(ops.avgQualityMinutes ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Liquidación prom. (min)</span><span className="kpi-value">{String(ops.avgSettlementMinutes ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Proceso total (min)</span><span className="kpi-value">{String(ops.avgTotalProcessMinutes ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Kg hoy</span><span className="kpi-value">{Number(ops.kgToday ?? 0).toFixed(0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Valor hoy</span><span className="kpi-value">{Number(ops.amountToday ?? 0).toLocaleString()}</span></div>
      </div>

      <section className="panel">
        <h3>Compras por hora</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'end', minHeight: 120 }}>
          {byHour.map((h) => (
            <div key={String(h.hour)} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ background: '#1f6feb88', height: Math.max(8, Number(h.count) * 12) }} />
              <small>{String(h.hour)}</small>
              <div>{String(h.count)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel grid-4">
        <div><strong>Recepción</strong><div>{stages.reception ?? 0}</div></div>
        <div><strong>Pesaje</strong><div>{stages.weighing ?? 0}</div></div>
        <div><strong>Calidad</strong><div>{stages.quality ?? 0}</div></div>
        <div><strong>Liquidación</strong><div>{stages.settlement ?? 0}</div></div>
        <div><strong>Inventario</strong><div>{stages.inventory ?? 0}</div></div>
        <div><strong>Rechazados</strong><div>{stages.rejected ?? 0}</div></div>
      </section>

      <section className="panel">
        <h3>Alertas</h3>
        <table className="data-table">
          <thead><tr><th>Severidad</th><th>Tipo</th><th>Título</th><th>Mensaje</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={String(a.alertKey)}>
                <td>{String(a.severity)}</td>
                <td>{String(a.alertType)}</td>
                <td>{String(a.title)}</td>
                <td>{String(a.message)}</td>
                <td>
                  {!a.acknowledged ? (
                    <button className="btn" onClick={() => acknowledgeOpsAlert(String(a.alertKey)).then(reload)}>
                      Ack
                    </button>
                  ) : 'OK'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Cola en vivo</h3>
        <table className="data-table">
          <thead><tr><th>Ticket</th><th>Productor</th><th>Turno</th><th>Estado</th><th>Espera (min)</th></tr></thead>
          <tbody>
            {liveQueue.map((q) => (
              <tr key={String(q.ticketKey)}>
                <td>{String(q.ticketKey)}</td>
                <td>{String(q.producerName ?? '—')}</td>
                <td>{String(q.turnNumber ?? '—')}</td>
                <td>{String(q.status)}</td>
                <td>{String(q.waitMinutes ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
