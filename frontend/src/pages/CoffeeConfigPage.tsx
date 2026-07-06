import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeePrices, upsertCoffeePrice } from '../api/coffee';

export function CoffeeConfigPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [price, setPrice] = useState(12000);
  const reload = () => listCoffeePrices().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Configuración de precios" subtitle="Precio base, bonificaciones, descuentos, impuestos, retenciones" actions={<Link to="/compras/config" className="btn">Config</Link>} />

      <section className="panel">
        <div className="row-actions">
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <button
            type="button"
            className="btn"
            onClick={() => upsertCoffeePrice({ configKey: 'default', name: 'Precio estándar', basePricePerKg: price, withholdingPct: 1.5 }).then(reload)}
          >
            Guardar precio
          </button>
        </div>
        <table className="data-table" style={{ marginTop: 16 }}>
          <thead><tr><th>Clave</th><th>Nombre</th><th>Precio/kg</th><th>Retención %</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.configKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.basePricePerKg)}</td>
                <td>{String(r.withholdingPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
