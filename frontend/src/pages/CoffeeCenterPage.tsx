import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeeCenter, type CoffeeDashboard } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeCenterPage() {
  const [dash, setDash] = useState<CoffeeDashboard | null>(null);
  useEffect(() => { getCoffeeCenter().then(setDash); }, []);
  if (!dash) return <LoadingState variant="page" message="Cargando compras de café..." />;

  return (
    <>
      <Header
        title="Compras de Café — CPEP"
        subtitle="Café Procurement Enterprise Platform"
        actions={
          <div className="row-actions">
            <Link to="/compras/wizard" className="btn">Wizard recepción</Link>
            <Link to="/compras/recepcion" className="btn">Recepción</Link>
            <Link to="/compras/dia" className="btn">Compras del día</Link>
            <Link to="/compras/cola" className="btn">Cola</Link>
            <Link to="/compras/pesaje" className="btn">Pesaje</Link>
            <Link to="/compras/pesaje/monitor" className="btn">Monitor balanzas</Link>
            <Link to="/compras/balanzas" className="btn">Balanzas</Link>
            <Link to="/compras/pesaje/historial" className="btn">Historial pesajes</Link>
            <Link to="/compras/calidad" className="btn">Calidad</Link>
            <Link to="/compras/calidad/historial" className="btn">Historial calidad</Link>
            <Link to="/compras/calidad/muestras" className="btn">Muestras</Link>
            <Link to="/compras/calidad/indicadores" className="btn">Indicadores calidad</Link>
            <Link to="/compras/liquidaciones" className="btn">Liquidaciones</Link>
            <Link to="/compras/liquidaciones/reportes" className="btn">Reportes liquidación</Link>
            <Link to="/compras/inventario" className="btn">Inventario</Link>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
            <Link to="/compras/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/compras/inventario/auditoria" className="btn">Auditoría inventario</Link>
            <Link to="/compras/historial" className="btn">Historial</Link>
            <Link to="/compras/consultas" className="btn">Consultas</Link>
            <Link to="/compras/ops" className="btn">Operations Center</Link>
            <Link to="/compras/ops/ejecutivo" className="btn">Dashboard ejecutivo</Link>
            <Link to="/compras/ops/analitica" className="btn">Analítica</Link>
            <Link to="/compras/ops/reportes" className="btn">Reportes</Link>
            <Link to="/compras/kpis" className="btn">KPIs</Link>
            <Link to="/compras/auditoria" className="btn">Auditoría</Link>
            <Link to="/compras/config" className="btn">Configuración</Link>
            <Link to="/compras/simple" className="btn">Vista simple</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Tickets hoy</span><span className="kpi-value">{dash.ticketsToday}</span></div>
        <div className="kpi-card"><span className="kpi-label">En cola</span><span className="kpi-value">{dash.queueLength}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pesados</span><span className="kpi-value">{dash.weighedToday}</span></div>
        <div className="kpi-card"><span className="kpi-label">Calidad</span><span className="kpi-value">{dash.qualityToday}</span></div>
        <div className="kpi-card"><span className="kpi-label">Liquidaciones</span><span className="kpi-value">{dash.settlementsToday}</span></div>
        <div className="kpi-card"><span className="kpi-label">Inventario</span><span className="kpi-value">{dash.inventoryToday}</span></div>
        <div className="kpi-card"><span className="kpi-label">Kg hoy</span><span className="kpi-value">{dash.kgToday.toFixed(0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Monto hoy</span><span className="kpi-value">${dash.amountToday.toLocaleString()}</span></div>
      </div>
      {dash.operations ? (
        <section className="panel grid-4">
          <div><strong>Atención prom.</strong><div>{String((dash.operations as Record<string, unknown>).avgAttentionMinutes ?? 0)} min</div></div>
          <div><strong>Pesaje prom.</strong><div>{String((dash.operations as Record<string, unknown>).avgWeighingMinutes ?? 0)} min</div></div>
          <div><strong>Calidad prom.</strong><div>{String((dash.operations as Record<string, unknown>).avgQualityMinutes ?? 0)} min</div></div>
          <div><strong>Proceso total</strong><div>{String((dash.operations as Record<string, unknown>).avgTotalProcessMinutes ?? 0)} min</div></div>
        </section>
      ) : null}
      {(dash.alerts?.length ?? 0) > 0 && (
        <section className="panel">
          <h3>Alertas operativas</h3>
          <ul>
            {(dash.alerts ?? []).slice(0, 5).map((a, i) => (
              <li key={i}>[{String(a.severity)}] {String(a.title)} — {String(a.message)}</li>
            ))}
          </ul>
          <Link to="/compras/ops">Ver Operations Center</Link>
        </section>
      )}
      {dash.suggestions.length > 0 && (
        <section className="panel">
          <h3>IA — recomendaciones</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
            <tbody>
              {dash.suggestions.map((s, i) => (
                <tr key={i}>
                  <td>{String(s.type ?? '')}</td>
                  <td>{String(s.recommendation ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
