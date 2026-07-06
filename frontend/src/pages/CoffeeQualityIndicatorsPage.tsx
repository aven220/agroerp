import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getQualityIndicators, listCoffeeQuality } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeQualityIndicatorsPage() {
  const [indicators, setIndicators] = useState<Record<string, unknown> | null>(null);
  const [recent, setRecent] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getQualityIndicators().then(setIndicators);
    listCoffeeQuality().then((r) => setRecent((r as Array<Record<string, unknown>>).slice(0, 20)));
  }, []);

  if (!indicators) return <LoadingState variant="page" message="Cargando indicadores..." />;

  return (
    <>
      <Header
        title="Indicadores de calidad"
        subtitle="Aceptación, rechazo, laboratorio y score"
        actions={<Link to="/compras/calidad" className="btn">Panel calidad</Link>}
      />
      <section className="panel grid-4">
        <div><strong>Pendientes</strong><div>{String(indicators.pending)}</div></div>
        <div><strong>Aceptados</strong><div>{String(indicators.accepted)}</div></div>
        <div><strong>Condicionados</strong><div>{String(indicators.conditioned)}</div></div>
        <div><strong>Rechazados</strong><div>{String(indicators.rejected)}</div></div>
        <div><strong>Laboratorio</strong><div>{String(indicators.lab)}</div></div>
        <div><strong>Alertas abiertas</strong><div>{String(indicators.openAlerts)}</div></div>
        <div><strong>Score promedio</strong><div>{Number(indicators.avgScore ?? 0).toFixed(1)}</div></div>
        <div><strong>Tasa aceptación</strong><div>{(Number(indicators.acceptanceRate ?? 0) * 100).toFixed(1)}%</div></div>
      </section>
      <section className="panel">
        <h3>Últimas evaluaciones</h3>
        <table className="data-table">
          <thead>
            <tr><th>Ticket</th><th>Productor</th><th>Score</th><th>Decisión</th><th>Grado</th></tr>
          </thead>
          <tbody>
            {recent.map((r, i) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{String(r.qualityScore ?? '—')}</td>
                  <td>{String(r.decision ?? '')}</td>
                  <td>{String(r.grade ?? '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
