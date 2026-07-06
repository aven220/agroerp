import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEapp,
  getEappCenter,
  getEappDashboard,
  getEappMapContext,
  listEappDroneFlights,
  listEappDroneMissions,
  listEappIndices,
  listEappLayers,
  listEappSatelliteProviders,
  listEappTelemetryDevices,
  listEappThematicMaps,
  type EappCenter,
} from '../api/eapp';

const EAPP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/precision" className="btn">Centro GIS</Link>
    <Link to="/plataforma-agritech/precision/mapa" className="btn">Mapa Agrícola</Link>
    <Link to="/plataforma-agritech/precision/capas" className="btn">Capas</Link>
    <Link to="/plataforma-agritech/precision/drones" className="btn">Drones</Link>
    <Link to="/plataforma-agritech/precision/telemetria" className="btn">Telemetría</Link>
    <Link to="/plataforma-agritech/precision/dashboard" className="btn">Dashboard</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
    <Link to="/plataforma-agritech/riego" className="btn">Riego</Link>
    <Link to="/gis" className="btn">EGSIP</Link>
  </div>
);

export function EappCenterPage() {
  const [center, setCenter] = useState<EappCenter | null>(null);
  useEffect(() => { getEappCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro GIS" subtitle="Agricultura de Precisión — Sprint 2" actions={EAPP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Capas</span><span className="kpi-value">{String(indicators?.layers ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Polígonos lote</span><span className="kpi-value">{String(indicators?.lotPolygons ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Telemetría</span><span className="kpi-value">{String(indicators?.telemetryDevices ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Geo Score</span><span className="kpi-value">{String(indicators?.geoScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEapp().then(setCenter)}>Inicializar Precisión</button>
      </section>
      <section className="card">
        <p>POIs: {center?.pois.length ?? 0} · Misiones: {center?.missions.length ?? 0} · Índices: {center?.indices.length ?? 0}</p>
      </section>
    </>
  );
}

export function EappMapPage() {
  const [mapCtx, setMapCtx] = useState<unknown>(null);
  useEffect(() => { getEappMapContext().then(setMapCtx); }, []);

  return (
    <>
      <Header title="Mapa Agrícola" subtitle="Polígonos, marcadores y mediciones" actions={EAPP_LINKS} />
      <section className="card">
        <pre>{JSON.stringify(mapCtx, null, 2).slice(0, 8000)}</pre>
      </section>
    </>
  );
}

export function EappLayersPage() {
  const [layers, setLayers] = useState<unknown[]>([]);
  useEffect(() => { listEappLayers().then(setLayers); }, []);

  return (
    <>
      <Header title="Administrador de Capas" actions={EAPP_LINKS} />
      <section className="card">
        <h3>Capas ({layers.length})</h3>
        <ul>{layers.slice(0, 30).map((l: unknown, i) => {
          const row = l as Record<string, string>;
          return <li key={i}>{row.layerCode} — {row.layerName} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EappDronesPage() {
  const [missions, setMissions] = useState<unknown[]>([]);
  const [flights, setFlights] = useState<unknown[]>([]);
  useEffect(() => {
    listEappDroneMissions().then(setMissions);
    listEappDroneFlights().then(setFlights);
  }, []);

  return (
    <>
      <Header title="Panel de Drones" actions={EAPP_LINKS} />
      <section className="card"><h3>Misiones ({missions.length})</h3></section>
      <section className="card"><h3>Vuelos ({flights.length})</h3></section>
    </>
  );
}

export function EappTelemetryPage() {
  const [devices, setDevices] = useState<unknown[]>([]);
  const [providers, setProviders] = useState<unknown[]>([]);
  useEffect(() => {
    listEappTelemetryDevices().then(setDevices);
    listEappSatelliteProviders().then(setProviders);
  }, []);

  return (
    <>
      <Header title="Centro de Telemetría" subtitle="Sensores + satélite" actions={EAPP_LINKS} />
      <section className="card"><h3>Dispositivos ({devices.length})</h3></section>
      <section className="card"><h3>Proveedores satelitales ({providers.length})</h3></section>
    </>
  );
}

export function EappDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [thematic, setThematic] = useState<unknown[]>([]);
  const [indices, setIndices] = useState<unknown[]>([]);
  useEffect(() => {
    getEappDashboard().then(setDashboard);
    listEappThematicMaps().then(setThematic);
    listEappIndices().then(setIndices);
  }, []);

  return (
    <>
      <Header title="Dashboard Geoespacial" actions={EAPP_LINKS} />
      <section className="card">
        <pre>{JSON.stringify(dashboard, null, 2).slice(0, 6000)}</pre>
      </section>
      <section className="card">
        <p>Mapas temáticos: {thematic.length} · Índices: {indices.length}</p>
      </section>
    </>
  );
}
