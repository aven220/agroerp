import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeePurchaseCenters, listCoffeeReceptionRules, upsertCoffeePurchaseCenter, upsertCoffeeReceptionRule } from '../api/coffee';

export function CoffeeCentersPage() {
  const [centers, setCenters] = useState<Array<Record<string, unknown>>>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => {
    listCoffeePurchaseCenters(true).then((r) => setCenters(r as Array<Record<string, unknown>>));
    listCoffeeReceptionRules().then((r) => setRules(r as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centros de compra y balanzas" subtitle="Centros, acopio y reglas por centro" actions={<Link to="/compras/config" className="btn">Config</Link>} />
      <section className="panel">
        <button
          type="button"
          className="btn"
          onClick={() => upsertCoffeePurchaseCenter({ centerKey: `centro_${Date.now()}`, name: 'Nuevo centro', reason: 'UI create' }).then(reload)}
        >
          Nuevo centro
        </button>
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Key</th><th>Nombre</th><th>Tipo</th><th>Activo</th></tr></thead>
          <tbody>
            {centers.map((c) => (
              <tr key={String(c.id)}>
                <td>{String(c.centerKey)}</td>
                <td>{String(c.name)}</td>
                <td>{String(c.centerType)}</td>
                <td>{String(c.isActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Reglas de recepción</h3>
        <button
          type="button"
          className="btn"
          onClick={() => upsertCoffeeReceptionRule({
            ruleKey: `rule_${Date.now()}`,
            name: 'Regla horaria',
            openTime: '06:00',
            closeTime: '18:00',
            maxHumidityPct: 12.5,
            minFactor: 85,
            reason: 'UI create',
          }).then(reload)}
        >
          Nueva regla
        </button>
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Key</th><th>Nombre</th><th>Horario</th><th>Humedad max</th><th>Activa</th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.ruleKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.openTime ?? '—')}-{String(r.closeTime ?? '—')}</td>
                <td>{String(r.maxHumidityPct ?? '—')}</td>
                <td>{String(r.isActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
