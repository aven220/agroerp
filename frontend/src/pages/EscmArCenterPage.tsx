import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmArCenter } from '../api/escm';

export function EscmArCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEscmArCenter().then(setDash);
  }, []);

  const aging = (dash?.aging ?? []) as Array<{ label: string; amount: number; count: number }>;
  const byStatus = (dash?.receivablesByStatus ?? {}) as Record<string, number>;

  return (
    <>
      <Header
        title="Centro de cartera"
        subtitle="Saldos, mora, antigüedad y riesgo"
        actions={
          <>
            <Link to="/comercial/cartera" className="btn">Cartera</Link>
            <Link to="/comercial/recaudos" className="btn">Recaudos</Link>
            <Link to="/comercial/cobranza" className="btn">Cobranza</Link>
            <Link to="/comercial/acuerdos" className="btn">Acuerdos</Link>
            <Link to="/comercial/estados-cuenta" className="btn">Estados de cuenta</Link>
          </>
        }
      />
      <section className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div><strong>Cartera abierta</strong>: {Number(dash?.totalOpenBalance ?? 0).toLocaleString()}</div>
        <div><strong>Vencida</strong>: {Number(dash?.totalOverdueBalance ?? 0).toLocaleString()}</div>
        <div><strong>Anticipos / saldo a favor</strong>: {Number(dash?.totalAdvanceBalance ?? 0).toLocaleString()}</div>
        <div><strong>Promesas pendientes</strong>: {Number(dash?.pendingPromises ?? 0)}</div>
        <div><strong>Acuerdos activos</strong>: {Number(dash?.activeAgreements ?? 0)}</div>
      </section>
      <section className="panel">
        <h3>Cartera por estado</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k}>{k}: {v}</div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Antigüedad</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {aging.map((b) => (
            <div key={b.label}>{b.label}: {b.amount.toLocaleString()} ({b.count})</div>
          ))}
        </div>
      </section>
    </>
  );
}
