import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { validateCoffeeReception } from '../api/coffee';

export function CoffeeValidationsPage() {
  const [humidityPct, setHumidityPct] = useState(11.5);
  const [factor, setFactor] = useState(92);
  const [result, setResult] = useState<{ valid: boolean; violations: string[] } | null>(null);

  return (
    <>
      <Header title="Panel de validaciones" subtitle="Reglas de recepción en tiempo real" actions={<Link to="/compras/config" className="btn">Config</Link>} />
      <section className="panel">
        <div className="row-actions">
          <label>Humedad <input type="number" value={humidityPct} onChange={(e) => setHumidityPct(Number(e.target.value))} /></label>
          <label>Factor <input type="number" value={factor} onChange={(e) => setFactor(Number(e.target.value))} /></label>
          <button type="button" className="btn" onClick={() => validateCoffeeReception({ humidityPct, factor }).then(setResult)}>Validar</button>
        </div>
        {result && (
          <div style={{ marginTop: 16 }}>
            <strong>{result.valid ? 'Válido' : 'Con violaciones'}</strong>
            <ul>
              {result.violations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
