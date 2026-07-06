import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEpscmTms,
  createEpscmTmsRoute,
  getEpscmTmsCenter,
  getEpscmTmsCostDashboard,
  getEpscmTmsLogisticsDashboard,
  listEpscmTmsCosts,
  listEpscmTmsDeliveries,
  listEpscmTmsDrivers,
  listEpscmTmsPods,
  listEpscmTmsRoutes,
  listEpscmTmsTrips,
  listEpscmTmsVehicles,
  optimizeEpscmTmsRoute,
  recordEpscmTmsCost,
  scheduleEpscmTmsTrip,
  startEpscmTmsTrip,
} from '../api/epscm-tms';

const TMS_LINKS = (
  <div className="row-actions">
    <Link to="/cadena-suministro/tms" className="btn">Centro TMS</Link>
    <Link to="/cadena-suministro/tms/flotas" className="btn">Flotas</Link>
    <Link to="/cadena-suministro/tms/conductores" className="btn">Conductores</Link>
    <Link to="/cadena-suministro/tms/rutas" className="btn">Rutas</Link>
    <Link to="/cadena-suministro/tms/viajes" className="btn">Viajes</Link>
    <Link to="/cadena-suministro/tms/pod" className="btn">POD</Link>
    <Link to="/cadena-suministro/tms/logistica" className="btn">Logística</Link>
    <Link to="/cadena-suministro/tms/costos" className="btn">Costos</Link>
    <Link to="/cadena-suministro/colaboracion" className="btn">Colaboración</Link>
  </div>
);

export function EpscmTmsCenterPage() {
  const [logistics, setLogistics] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEpscmTmsLogisticsDashboard().then(setLogistics);
  }, []);

  return (
    <>
      <Header title="Centro TMS" subtitle="Transportation Management System" actions={TMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Vehículos</span><span className="kpi-value">{String(logistics?.vehicleCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Conductores</span><span className="kpi-value">{String(logistics?.driverCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Viajes activos</span><span className="kpi-value">{String(logistics?.activeTrips ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Entregas pendientes</span><span className="kpi-value">{String(logistics?.pendingDeliveries ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo prom./entrega</span><span className="kpi-value">{String(logistics?.avgCostPerDelivery ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEpscmTms().then(() => getEpscmTmsLogisticsDashboard().then(setLogistics))}>
          Inicializar TMS
        </button>
      </section>
    </>
  );
}

export function EpscmTmsFleetPage() {
  const [vehicles, setVehicles] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEpscmTmsVehicles().then((d) => setVehicles(d as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Administrador de Flotas" subtitle="Vehículos propios y tercerizados" actions={TMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Placa</th><th>Propiedad</th><th>Estado</th><th>Peso máx.</th></tr></thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={String(v.vehicleKey)}>
                <td>{String(v.vehicleKey)}</td>
                <td>{String(v.plateNumber)}</td>
                <td>{String(v.ownership)}</td>
                <td>{String(v.status)}</td>
                <td>{String(v.maxWeight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmTmsDriverPage() {
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEpscmTmsDrivers().then((d) => setDrivers(d as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Administrador de Conductores" subtitle="Licencias, asignaciones y disponibilidad" actions={TMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Licencias</th></tr></thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={String(d.driverKey)}>
                <td>{String(d.driverKey)}</td>
                <td>{String(d.fullName)}</td>
                <td>{String(d.driverType)}</td>
                <td>{String(d.status)}</td>
                <td>{((d.licenses as unknown[]) ?? []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmTmsRoutePage() {
  const [routes, setRoutes] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => listEpscmTmsRoutes().then((d) => setRoutes(d as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const createRoute = () => {
    createEpscmTmsRoute({ code: `R-${Date.now()}`, name: 'Ruta manual', optimizationMode: 'distance' })
      .then((r) => {
        const key = String((r as Record<string, unknown>).routeKey);
        return optimizeEpscmTmsRoute(key, { mode: 'distance' });
      })
      .then(reload);
  };

  return (
    <>
      <Header title="Planificador de Rutas" subtitle="Optimización y paradas múltiples" actions={TMS_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={createRoute}>Crear y optimizar ruta</button>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Estado</th><th>Distancia km</th><th>Paradas</th></tr></thead>
          <tbody>
            {routes.map((r) => (
              <tr key={String(r.routeKey)}>
                <td>{String(r.routeKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.totalDistance)}</td>
                <td>{((r.stops as unknown[]) ?? []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmTmsTripPage() {
  const [trips, setTrips] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEpscmTmsTrips().then((d) => setTrips(d as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const schedule = () => scheduleEpscmTmsTrip({ scheduledAt: new Date().toISOString() }).then(reload);

  return (
    <>
      <Header title="Centro de Viajes" subtitle="Programación, asignación y cierre" actions={TMS_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={schedule}>Programar viaje</button>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Estado</th><th>Vehículo</th><th>Conductor</th><th>Pedidos</th></tr></thead>
          <tbody>
            {trips.map((t) => (
              <tr key={String(t.tripKey)}>
                <td>{String(t.tripKey)}</td>
                <td>{String(t.status)}</td>
                <td>{String((t.vehicle as Record<string, unknown>)?.plateNumber ?? '—')}</td>
                <td>{String((t.driver as Record<string, unknown>)?.fullName ?? '—')}</td>
                <td>{((t.orders as unknown[]) ?? []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmTmsPodPage() {
  const [pods, setPods] = useState<Array<Record<string, unknown>>>([]);
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    listEpscmTmsPods().then((d) => setPods(d as Array<Record<string, unknown>>));
    listEpscmTmsDeliveries().then((d) => setDeliveries(d as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Panel POD" subtitle="Firma, foto y geolocalización" actions={TMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">POD registrados</span><span className="kpi-value">{pods.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Entregas</span><span className="kpi-value">{deliveries.length}</span></div>
      </div>
      <section className="card">
        <table className="data-table">
          <thead><tr><th>POD</th><th>Entrega</th><th>Firmado por</th><th>Fecha</th></tr></thead>
          <tbody>
            {pods.map((p) => (
              <tr key={String(p.podKey)}>
                <td>{String(p.podKey)}</td>
                <td>{String(p.deliveryKey)}</td>
                <td>{String(p.signedBy ?? '—')}</td>
                <td>{String(p.capturedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmTmsLogisticsPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmTmsLogisticsDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard Logístico" subtitle="Operación de transporte en tiempo real" actions={TMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Entregas completadas</span><span className="kpi-value">{String(dash?.completedDeliveries ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Incidencias abiertas</span><span className="kpi-value">{String(dash?.openIncidents ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo total</span><span className="kpi-value">{String(dash?.totalCost ?? '—')}</span></div>
      </div>
    </>
  );
}

export function EpscmTmsCostPage() {
  const [costs, setCosts] = useState<Record<string, unknown> | null>(null);
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getEpscmTmsCostDashboard().then(setCosts);
    listEpscmTmsCosts().then((d) => setEntries(d as Array<Record<string, unknown>>));
  }, []);

  const addFuel = () => {
    recordEpscmTmsCost({ category: 'fuel', amount: 150000, description: 'Combustible' })
      .then(() => {
        getEpscmTmsCostDashboard().then(setCosts);
        listEpscmTmsCosts().then((d) => setEntries(d as Array<Record<string, unknown>>));
      });
  };

  const byCategory = (costs?.byCategory as Record<string, number>) ?? {};

  return (
    <>
      <Header title="Dashboard de Costos" subtitle="Rentabilidad logística" actions={TMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Costo total</span><span className="kpi-value">{String(costs?.totalCost ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Margen %</span><span className="kpi-value">{String(costs?.marginPct ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Por entrega</span><span className="kpi-value">{String(costs?.costPerDelivery ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={addFuel}>Registrar combustible</button>
        <p>Combustible: {byCategory.fuel ?? 0} | Peajes: {byCategory.toll ?? 0}</p>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Categoría</th><th>Monto</th><th>Descripción</th></tr></thead>
          <tbody>
            {entries.slice(0, 20).map((e) => (
              <tr key={String(e.costKey)}>
                <td>{String(e.costKey)}</td>
                <td>{String(e.category)}</td>
                <td>{String(e.amount)}</td>
                <td>{String(e.description ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
