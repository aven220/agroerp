import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeeKpis, getCoffeeStatistics } from '../api/coffee';

export function CoffeeStatsPage() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [days, setDays] = useState('30');

  const reload = () => {
    getCoffeeKpis(Number(days)).then(setKpis);
    getCoffeeStatistics().then(setStats);
  };
  useEffect(() => { reload(); }, []);

  const byProducer = (kpis?.byProducer ?? {}) as Record<string, number>;
  const byFarm = (kpis?.byFarm ?? {}) as Record<string, number>;
  const byOperator = (kpis?.byOperator ?? {}) as Record<string, number>;
  const byCenter = (kpis?.byCenter ?? {}) as Record<string, number>;

  return (
    <>
      <Header
        title="KPIs de compras"
        subtitle="Kilogramos, valor, calidad y desgloses"
        actions={
          <>
            <Link to="/compras/ops" className="btn">Operations</Link>
            <Link to="/compras/ops/ejecutivo" className="btn">Ejecutivo</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />
      <section className="panel">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={days} onChange={(e) => setDays(e.target.value)} />
          <button className="btn" onClick={reload}>Actualizar</button>
        </div>
      </section>
      {kpis ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card"><span className="kpi-label">Kg</span><span className="kpi-value">{Number(kpis.kgTotal ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Valor</span><span className="kpi-value">{Number(kpis.amountTotal ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Precio prom.</span><span className="kpi-value">{Number(kpis.avgPricePerKg ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Humedad</span><span className="kpi-value">{Number(kpis.avgHumidity ?? 0).toFixed(1)}%</span></div>
          <div className="kpi-card"><span className="kpi-label">Factor</span><span className="kpi-value">{Number(kpis.avgFactor ?? 0).toFixed(1)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Rechazo</span><span className="kpi-value">{Number(kpis.rejectRate ?? 0).toFixed(1)}%</span></div>
          <div className="kpi-card"><span className="kpi-label">Bonos</span><span className="kpi-value">{Number(kpis.bonusesTotal ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Castigos</span><span className="kpi-value">{Number(kpis.penaltiesTotal ?? 0).toLocaleString()}</span></div>
        </div>
      ) : null}

      <section className="panel">
        <h3>Por productor</h3>
        <ul>{Object.entries(byProducer).slice(0, 20).map(([k, v]) => <li key={k}>{k}: {v.toLocaleString()} kg</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Por finca / municipio</h3>
        <ul>{Object.entries(byFarm).slice(0, 20).map(([k, v]) => <li key={k}>{k}: {v.toLocaleString()} kg</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Por operador</h3>
        <ul>{Object.entries(byOperator).slice(0, 20).map(([k, v]) => <li key={k}>{k}: {v.toLocaleString()}</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Por centro</h3>
        <ul>{Object.entries(byCenter).slice(0, 20).map(([k, v]) => <li key={k}>{k}: {v.toLocaleString()} kg</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Estadísticas hoy / semana / mes / año</h3>
        <pre className="code-block">{JSON.stringify(stats, null, 2)}</pre>
      </section>
    </>
  );
}
