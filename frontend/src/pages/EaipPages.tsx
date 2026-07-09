import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEaip,
  compareEaipSimulation,
  createEaipAssistantSession,
  generateEaipRecommendation,
  getEaipAssistantMessages,
  getEaipCenter,
  getEaipDashboard,
  getEaipProductivity,
  listEaipAssistantSessions,
  listEaipExecutions,
  listEaipModels,
  listEaipPredictions,
  listEaipRecommendations,
  listEaipSimulations,
  listEaipTwins,
  runEaipPrediction,
  runEaipSimulation,
  sendEaipAssistantMessage,
  type EaipCenter,
} from '../api/eaip';

const EAIP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/inteligencia" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/inteligencia/simulacion" className="btn">Simulación</Link>
    <Link to="/plataforma-agritech/inteligencia/modelos" className="btn">Modelos</Link>
    <Link to="/plataforma-agritech/inteligencia/recomendaciones" className="btn">Recomendaciones</Link>
    <Link to="/plataforma-agritech/inteligencia/predictivo" className="btn">Dashboard Predictivo</Link>
    <Link to="/plataforma-agritech/inteligencia/asistente" className="btn">Asistente</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EaipCenterPage() {
  const [center, setCenter] = useState<EaipCenter | null>(null);
  const [twins, setTwins] = useState<unknown[]>([]);
  useEffect(() => {
    getEaipCenter().then(setCenter);
    listEaipTwins().then(setTwins);
  }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Inteligencia Agrícola" subtitle="Recomendaciones, modelos y asistencia agronómica" actions={EAIP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Modelos activos</span><span className="kpi-value">{String(indicators?.activeModels ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Predicciones 30d</span><span className="kpi-value">{String(indicators?.predictions30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Recomendaciones</span><span className="kpi-value">{String(indicators?.recommendationsActive ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Intelligence Score</span><span className="kpi-value">{String(indicators?.intelligenceScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEaip().then(setCenter)}>Inicializar Plataforma IA</button>
      </section>
      <section className="card">
        <p>Modelos: {center?.models.length ?? 0} · Predicciones: {center?.predictions.length ?? 0} · Simulaciones: {center?.simulations.length ?? 0} · Gemelos digitales: {twins.length}</p>
      </section>
    </>
  );
}

export function EaipSimulationPage() {
  const [simulations, setSimulations] = useState<unknown[]>([]);
  const [comparison, setComparison] = useState<unknown>(null);
  useEffect(() => { listEaipSimulations().then(setSimulations); }, []);

  const runSim = () => {
    runEaipSimulation({
      simulationType: 'campaign',
      title: 'Simulación campaña',
      baseScenario: { yieldPerHa: 4500, costPerHa: 1800, areaHa: 25 },
      scenarios: [{ label: 'Base', yieldDeltaPct: 0 }, { label: 'Optimista', yieldDeltaPct: 12 }],
    }).then(() => listEaipSimulations().then(setSimulations));
  };

  const compare = (key: string) => {
    compareEaipSimulation(key).then(setComparison);
  };

  return (
    <>
      <Header title="Centro de Simulación" actions={EAIP_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={runSim}>Ejecutar simulación</button>
      </section>
      <section className="card"><h3>Simulaciones ({simulations.length})</h3>
        <ul>{simulations.slice(0, 10).map((s) => {
          const sim = s as Record<string, unknown>;
          return (
            <li key={String(sim.simulationKey)}>
              {String(sim.title ?? sim.simulationKey)}
              <button className="btn" onClick={() => compare(String(sim.simulationKey))}>Comparar</button>
            </li>
          );
        })}</ul>
      </section>
      {comparison ? <section className="card"><h3>Comparación de escenarios</h3><pre>{JSON.stringify(comparison, null, 2)}</pre></section> : null}
    </>
  );
}

export function EaipModelsPage() {
  const [models, setModels] = useState<unknown[]>([]);
  const [executions, setExecutions] = useState<unknown[]>([]);
  useEffect(() => {
    listEaipModels().then(setModels);
    listEaipExecutions().then(setExecutions);
  }, []);

  return (
    <>
      <Header title="Administrador de Modelos" actions={EAIP_LINKS} />
      <section className="card"><h3>Modelos registrados ({models.length})</h3></section>
      <section className="card"><h3>Historial de ejecuciones ({executions.length})</h3></section>
    </>
  );
}

export function EaipRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<unknown[]>([]);
  useEffect(() => { listEaipRecommendations().then(setRecommendations); }, []);

  const generate = () => {
    generateEaipRecommendation({
      category: 'irrigation',
      fieldLotRef: 'LOT-001',
      context: { phenology: 0.7, climate: 0.6, soil: 0.8, waterAvailability: 0.5 },
    }).then(() => listEaipRecommendations().then(setRecommendations));
  };

  return (
    <>
      <Header title="Centro de Recomendaciones" actions={EAIP_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={generate}>Generar recomendación</button>
      </section>
      <section className="card"><h3>Recomendaciones activas ({recommendations.length})</h3></section>
    </>
  );
}

export function EaipPredictiveDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [predictions, setPredictions] = useState<unknown[]>([]);
  const [productivity, setProductivity] = useState<unknown>(null);
  useEffect(() => {
    getEaipDashboard().then(setDashboard);
    listEaipPredictions().then(setPredictions);
    getEaipProductivity().then(setProductivity);
  }, []);

  const indicators = (dashboard as { indicators?: Record<string, unknown> })?.indicators;
  const prod = productivity as Record<string, unknown>;

  const runPred = () => {
    runEaipPrediction({ serviceType: 'yield', fieldLotRef: 'LOT-001', inputPayload: { areaHa: 10 } })
      .then(() => listEaipPredictions().then(setPredictions));
  };

  return (
    <>
      <Header title="Dashboard Predictivo" actions={EAIP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Simulaciones 30d</span><span className="kpi-value">{String(indicators?.simulations30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas inteligentes</span><span className="kpi-value">{String(indicators?.intelligentAlerts ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Productividad</span><span className="kpi-value">{String(prod?.productivityIndex ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Rentabilidad lote</span><span className="kpi-value">{String(prod?.lotProfitabilityIndex ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={runPred}>Ejecutar predicción rendimiento</button>
      </section>
      <section className="card"><h3>Predicciones ({predictions.length})</h3></section>
    </>
  );
}

export function EaipAssistantPage() {
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => { listEaipAssistantSessions().then(setSessions); }, []);

  const startSession = () => {
    createEaipAssistantSession('Consulta agronómica').then((s) => {
      const session = s as Record<string, unknown>;
      const key = String(session.sessionKey);
      setActiveSession(key);
      listEaipAssistantSessions().then(setSessions);
    });
  };

  const send = () => {
    if (!activeSession || !input.trim()) return;
    sendEaipAssistantMessage(activeSession, input.trim()).then(() => {
      setInput('');
      getEaipAssistantMessages(activeSession).then(setMessages);
    });
  };

  return (
    <>
      <Header title="Panel del Asistente Agronómico" actions={EAIP_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={startSession}>Nueva sesión</button>
        <p>Sesiones: {sessions.length}</p>
      </section>
      <section className="card">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} style={{ width: '100%' }} placeholder="Pregunta agronómica..." />
        <button className="btn" onClick={send} disabled={!activeSession}>Enviar</button>
        <ul>{messages.map((m, i) => {
          const msg = m as Record<string, unknown>;
          return <li key={i}><strong>{String(msg.role)}:</strong> {String(msg.content)}</li>;
        })}</ul>
      </section>
    </>
  );
}
