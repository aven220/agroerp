import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmBillingCenter } from '../api/escm';

export function EscmBillingCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEscmBillingCenter().then(setDash);
  }, []);

  const byStatus = (dash?.invoicesByStatus ?? {}) as Record<string, number>;
  const returns = (dash?.returnsByStatus ?? {}) as Record<string, number>;

  return (
    <>
      <Header
        title="Centro de facturación"
        subtitle="Facturas, prefacturas, impuestos y documentos"
        actions={
          <>
            <Link to="/comercial/facturas" className="btn">Facturas</Link>
            <Link to="/comercial/devoluciones" className="btn">Devoluciones</Link>
            <Link to="/comercial/garantias" className="btn">Garantías</Link>
            <Link to="/comercial/notas" className="btn">Notas</Link>
            <Link to="/comercial/documentos-facturacion" className="btn">Documentos</Link>
          </>
        }
      />
      <section className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div><strong>Facturado emitido</strong>: {Number(dash?.issuedTotalAmount ?? 0).toLocaleString()}</div>
        <div><strong>Devoluciones pendientes</strong>: {Number(dash?.pendingReturns ?? 0)}</div>
        <div><strong>Garantías activas</strong>: {Number(dash?.pendingWarranties ?? 0)}</div>
        <div><strong>Notas crédito emitidas</strong>: {Number(dash?.issuedCreditNotes ?? 0)}</div>
        <div><strong>Notas débito emitidas</strong>: {Number(dash?.issuedDebitNotes ?? 0)}</div>
      </section>
      <section className="panel">
        <h3>Facturas por estado</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k}>{k}: {v}</div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Devoluciones por estado</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(returns).map(([k, v]) => (
            <div key={k}>{k}: {v}</div>
          ))}
        </div>
      </section>
    </>
  );
}
