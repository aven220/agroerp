import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmCustomerTimeline, listEscmCustomers } from '../api/escm';

export function EscmCustomerTimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerKey = searchParams.get('customerKey') ?? '';
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>)); }, []);
  useEffect(() => {
    if (customerKey) getEscmCustomerTimeline(customerKey).then(setTimeline);
    else setTimeline(null);
  }, [customerKey]);

  const customer = timeline?.customer as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Historial del cliente" subtitle="Interacciones, oportunidades, cotizaciones y pedidos" actions={<Link to="/comercial/crm" className="btn">CRM</Link>} />
      <section className="panel">
        <select value={customerKey} onChange={(e) => setSearchParams(e.target.value ? { customerKey: e.target.value } : {})}>
          <option value="">Seleccionar cliente</option>
          {customers.map((c) => <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>)}
        </select>
      </section>
      {customer ? (
        <>
          <section className="panel"><h3>{String(customer.legalName)}</h3><p>{String(customer.customerKey)} · {String(customer.status)}</p></section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <section className="panel">
              <h4>Oportunidades</h4>
              <ul>{((timeline?.opportunities as Array<Record<string, unknown>>) ?? []).map((o) => <li key={String(o.opportunityKey)}>{String(o.title)} [{String(o.stageKey)}]</li>)}</ul>
            </section>
            <section className="panel">
              <h4>Cotizaciones</h4>
              <ul>{((timeline?.quotations as Array<Record<string, unknown>>) ?? []).map((q) => <li key={String(q.quotationKey)}>{String(q.quotationKey)} — {String(q.status)} — {Number(q.totalAmount ?? 0).toLocaleString()}</li>)}</ul>
            </section>
            <section className="panel">
              <h4>Pedidos</h4>
              <ul>{((timeline?.orders as Array<Record<string, unknown>>) ?? []).map((o) => <li key={String(o.orderKey)}>{String(o.orderKey)} — {String(o.status)}</li>)}</ul>
            </section>
            <section className="panel">
              <h4>Interacciones</h4>
              <ul>{((timeline?.interactions as Array<Record<string, unknown>>) ?? []).map((i) => <li key={String(i.interactionKey)}>{String(i.interactionType)}: {String(i.subject ?? '—')}</li>)}</ul>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
