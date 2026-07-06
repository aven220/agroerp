import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getSettlementKpis, listCoffeeSettlements } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeSettlementReportsPage() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getSettlementKpis().then(setKpis);
    listCoffeeSettlements().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  if (!kpis) return <LoadingState variant="page" message="Cargando reportes..." />;

  return (
    <>
      <Header
        title="Reportes y KPIs de liquidación"
        subtitle="Totales, pagos y calidad aplicada"
        actions={<Link to="/compras/liquidaciones" className="btn">Centro liquidaciones</Link>}
      />
      <section className="panel grid-4">
        <div><strong>Liquidaciones</strong><div>{String(kpis.count)}</div></div>
        <div><strong>Kg liquidados</strong><div>{Number(kpis.kgSettled ?? 0).toLocaleString()}</div></div>
        <div><strong>Bonificaciones</strong><div>{Number(kpis.bonusesTotal ?? 0).toLocaleString()}</div></div>
        <div><strong>Castigos</strong><div>{Number(kpis.penaltiesTotal ?? 0).toLocaleString()}</div></div>
        <div><strong>Pagadas</strong><div>{String(kpis.paidCount)}</div></div>
        <div><strong>Parciales</strong><div>{String(kpis.partialCount)}</div></div>
        <div><strong>Pendientes pago</strong><div>{String(kpis.pendingCount)}</div></div>
        <div><strong>Saldo</strong><div>{Number(kpis.outstanding ?? 0).toLocaleString()}</div></div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Liquidación</th><th>Productor</th><th>Neto</th><th>Bonos</th><th>Castigos</th><th>Total</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.settlementKey)}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{String(r.netWeightKg)}</td>
                  <td>{Number(r.bonusesTotal ?? 0).toLocaleString()}</td>
                  <td>{Number(r.penaltiesTotal ?? 0).toLocaleString()}</td>
                  <td>{Number(r.totalAmount).toLocaleString()}</td>
                  <td>{String(r.paymentStatus)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
