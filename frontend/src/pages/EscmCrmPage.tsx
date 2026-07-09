import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  addEscmAddress,
  addEscmContact,
  getEscmCrmPanel,
  listEscmCustomers,
  recordEscmVisit,
} from '../api/escm';

export function EscmCrmPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerKey = searchParams.get('customerKey') ?? '';
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '', isPrimary: true });
  const [address, setAddress] = useState({ line1: '', city: '', countryCode: 'CO', isPrimary: true });
  const [visit, setVisit] = useState({ purpose: '', outcome: '' });

  useEffect(() => {
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, []);

  const reload = () => {
    if (!customerKey) return;
    getEscmCrmPanel(customerKey).then(setPanel);
  };
  useEffect(() => { reload(); }, [customerKey]);

  const customer = panel?.customer as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Panel CRM" subtitle="Contactos, direcciones, visitas y clasificación" actions={<Link to="/comercial" className="btn">Comercial</Link>} />
      <section className="panel">
        <select
          value={customerKey}
          onChange={(e) => setSearchParams(e.target.value ? { customerKey: e.target.value } : {})}
        >
          <option value="">Seleccionar cliente</option>
          {customers.map((c) => (
            <option key={String(c.customerKey)} value={String(c.customerKey)}>
              {String(c.legalName)} ({String(c.customerKey)})
            </option>
          ))}
        </select>
      </section>
      {customer ? (
        <>
          <section className="panel">
            <h3>{String(customer.legalName)}</h3>
            <p>Tipo: {String(customer.customerType)} · Estado: {String(customer.status)} · Clasificación: {String(customer.classification ?? '—')}</p>
            <p>Segmento: {String(customer.segmentKey ?? '—')} · Canal: {String(customer.channelKey ?? '—')}</p>
          </section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <section className="panel">
              <h4>Contactos</h4>
              <ul>
                {((panel?.contacts as Array<Record<string, unknown>>) ?? []).map((c) => (
                  <li key={String(c.contactKey)}>{String(c.firstName)} {String(c.lastName ?? '')} — {String(c.email ?? c.phone ?? '—')}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                <input placeholder="Nombre" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                <input placeholder="Apellido" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                <input placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                <input placeholder="Teléfono" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                <button className="btn" onClick={() => addEscmContact(customerKey, contact).then(reload)}>Agregar</button>
              </div>
            </section>
            <section className="panel">
              <h4>Direcciones</h4>
              <ul>
                {((panel?.addresses as Array<Record<string, unknown>>) ?? []).map((a) => (
                  <li key={String(a.addressKey)}>{String(a.line1)}, {String(a.city ?? '')} ({String(a.countryCode ?? '')})</li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                <input placeholder="Línea 1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                <input placeholder="Ciudad" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <button className="btn" onClick={() => addEscmAddress(customerKey, address).then(reload)}>Agregar</button>
              </div>
            </section>
          </div>
          <section className="panel">
            <h4>Registrar visita</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Propósito" value={visit.purpose} onChange={(e) => setVisit({ ...visit, purpose: e.target.value })} />
              <input placeholder="Resultado" value={visit.outcome} onChange={(e) => setVisit({ ...visit, outcome: e.target.value })} />
              <button className="btn" onClick={() => recordEscmVisit(customerKey, visit).then(reload)}>Registrar</button>
            </div>
          </section>
          <section className="panel">
            <h4>Historial de compras</h4>
            <table className="data-table">
              <thead><tr><th>Documento</th><th>Fecha</th><th>Monto</th><th>Moneda</th></tr></thead>
              <tbody>
                {((panel?.purchaseHistory as Array<Record<string, unknown>>) ?? []).map((h) => (
                  <tr key={String(h.historyKey)}>
                    <td>{String(h.documentKey ?? '—')}</td>
                    <td>{h.purchasedAt ? new Date(String(h.purchasedAt)).toLocaleDateString() : '—'}</td>
                    <td>{Number(h.totalAmount ?? 0).toLocaleString()}</td>
                    <td>{String(h.currencyKey ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h4>Observaciones</h4>
            <ul>
              {((panel?.notes as Array<Record<string, unknown>>) ?? []).map((n) => (
                <li key={String(n.id)}>{String(n.content)} <em>({n.createdAt ? new Date(String(n.createdAt)).toLocaleString() : ''})</em></li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h4>Visitas recientes</h4>
            <ul>
              {((panel?.visits as Array<Record<string, unknown>>) ?? []).map((v) => (
                <li key={String(v.visitKey)}>{v.visitedAt ? new Date(String(v.visitedAt)).toLocaleString() : '—'} — {String(v.purpose ?? '')} → {String(v.outcome ?? '')}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
