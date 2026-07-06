import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeeProducer, listCoffeeFarms, listCoffeeLots, searchCoffeeProducers } from '../api/coffee';

export function CoffeeLookupsPage() {
  const [q, setQ] = useState('');
  const [producers, setProducers] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [farms, setFarms] = useState<Array<Record<string, unknown>>>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);

  const search = async () => {
    const rows = await searchCoffeeProducers(q);
    setProducers(rows as Array<Record<string, unknown>>);
  };

  const openProducer = async (id: string) => {
    const p = await getCoffeeProducer(id) as Record<string, unknown>;
    setDetail(p);
    const f = await listCoffeeFarms(id);
    setFarms(f as Array<Record<string, unknown>>);
    setLots([]);
  };

  const openFarm = async (farmId: string) => {
    const l = await listCoffeeLots(farmId);
    setLots(l as Array<Record<string, unknown>>);
  };

  return (
    <>
      <Header title="Consultas" subtitle="Productor, finca, lotes e historial" actions={<Link to="/compras" className="btn">Centro</Link>} />
      <section className="panel">
        <div className="row-actions">
          <input placeholder="Buscar productor" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="btn" onClick={search}>Buscar</button>
        </div>
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Código</th><th>Nombre</th><th>Documento</th><th></th></tr></thead>
          <tbody>
            {producers.map((p) => (
              <tr key={String(p.id)}>
                <td>{String(p.producerCode)}</td>
                <td>{String(p.producerName)}</td>
                <td>{String(p.identityDoc ?? '')}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => openProducer(String(p.id))}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail && (
        <section className="panel">
          <h3>Historial productor</h3>
          <pre className="code-block">{JSON.stringify(detail.purchaseHistory, null, 2)}</pre>
        </section>
      )}
      <section className="panel">
        <h3>Fincas</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th></th></tr></thead>
          <tbody>
            {farms.map((f) => (
              <tr key={String(f.id)}>
                <td>{String(f.farmCode)}</td>
                <td>{String(f.farmName)}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => openFarm(String(f.id))}>Lotes</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Lotes</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Estado</th></tr></thead>
          <tbody>
            {lots.map((l) => (
              <tr key={String(l.id)}>
                <td>{String(l.lotCode)}</td>
                <td>{String(l.lotName)}</td>
                <td>{String(l.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
