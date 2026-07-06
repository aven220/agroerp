import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEamCmms,
  computeEamCmmsIndicators,
  getEamCmmsCalendar,
  getEamCmmsCenter,
  getEamCmmsComplianceDashboard,
  getEamCmmsCostDashboard,
  getEamCmmsDashboard,
  getEamCmmsWorkOrder,
  listEamCmmsIncidents,
  listEamCmmsPlans,
  listEamCmmsTechnicians,
  listEamCmmsWorkOrders,
} from '../api/eam-cmms';

const CMMS_LINKS = (
  <div className="row-actions">
    <Link to="/gestion-activos/mantenimiento" className="btn">Centro</Link>
    <Link to="/gestion-activos/mantenimiento/cmms" className="btn">CMMS</Link>
    <Link to="/gestion-activos/mantenimiento/ordenes" className="btn">Órdenes</Link>
    <Link to="/gestion-activos/mantenimiento/planificador" className="btn">Planificador</Link>
    <Link to="/gestion-activos/mantenimiento/calendario" className="btn">Calendario</Link>
    <Link to="/gestion-activos/mantenimiento/incidentes" className="btn">Incidentes</Link>
    <Link to="/gestion-activos/mantenimiento/tecnicos" className="btn">Técnicos</Link>
    <Link to="/gestion-activos/mantenimiento/costos" className="btn">Costos</Link>
    <Link to="/gestion-activos/mantenimiento/cumplimiento" className="btn">Cumplimiento</Link>
  </div>
);

export function EamCmmsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamCmmsCenter().then(setCenter); }, []);
  const indicators = center?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Mantenimiento" subtitle="CMMS / EAM empresarial" actions={CMMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Planes activos</span><span className="kpi-value">{((center?.plans as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Órdenes abiertas</span><span className="kpi-value">{((center?.openOrders as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Incidentes</span><span className="kpi-value">{((center?.incidents as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(indicators?.completionPct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEamCmms().then(() => getEamCmmsCenter().then(setCenter))}>Inicializar CMMS</button>
      </section>
    </>
  );
}

export function EamCmmsPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    listEamCmmsPlans().then((p) => setPlans(p as Array<Record<string, unknown>>));
    getEamCmmsDashboard().then(setDash);
  }, []);

  return (
    <>
      <Header title="CMMS" subtitle="Planes y operación de mantenimiento" actions={CMMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Órdenes abiertas</span><span className="kpi-value">{String(dash?.openWorkOrders ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA cumplido</span><span className="kpi-value">{String(dash?.slaCompliancePct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Plan</th><th>Activo</th><th>Tipo</th><th>Frecuencia</th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={String(p.planKey)}><td>{String(p.name)}</td><td>{String(p.assetKey)}</td><td>{String(p.planType)}</td><td>{String(p.frequencyValue)} {String(p.frequencyUnit)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsWorkOrdersPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    listEamCmmsWorkOrders().then((o) => {
      const list = o as Array<Record<string, unknown>>;
      setOrders(list);
      if (list[0]) setSelected(String(list[0].workOrderKey));
    });
  }, []);

  useEffect(() => {
    if (selected) getEamCmmsWorkOrder(selected).then(setDetail);
  }, [selected]);

  return (
    <>
      <Header title="Gestor de Órdenes" subtitle="Creación, programación y cierre" actions={CMMS_LINKS} />
      <section className="card">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {orders.map((o) => <option key={String(o.workOrderKey)} value={String(o.workOrderKey)}>{String(o.title)}</option>)}
        </select>
        {detail && (
          <div className="kpi-grid">
            <div className="kpi-card"><span className="kpi-label">Estado</span><span className="kpi-value">{String(detail.status)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Prioridad</span><span className="kpi-value">{String(detail.priority)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Costo</span><span className="kpi-value">{String(detail.totalCost)}</span></div>
          </div>
        )}
        <table className="data-table">
          <thead><tr><th>Orden</th><th>Activo</th><th>Estado</th><th>Prioridad</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={String(o.workOrderKey)}><td>{String(o.title)}</td><td>{String(o.assetKey)}</td><td>{String(o.status)}</td><td>{String(o.priority)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsPlannerPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEamCmmsPlans().then((p) => setPlans(p as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Planificador" subtitle="Planes preventivos y por condición" actions={CMMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Plan</th><th>Tipo</th><th>Prioridad</th><th>Actividades</th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={String(p.planKey)}><td>{String(p.name)}</td><td>{String(p.planType)}</td><td>{String(p.priority)}</td><td>{((p.activities as unknown[]) ?? []).length}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsCalendarPage() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getEamCmmsCalendar('week').then((e) => setEntries(e as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Calendario Técnico" subtitle="Agenda semanal y conflictos" actions={CMMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Orden</th><th>Técnico</th><th>Inicio</th><th>Fin</th><th>Conflicto</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={String(e.entryKey)}><td>{String(e.workOrderKey)}</td><td>{String(e.technicianKey ?? '—')}</td><td>{String(e.startsAt)}</td><td>{String(e.endsAt)}</td><td>{e.hasConflict ? 'Sí' : 'No'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsIncidentsPage() {
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEamCmmsIncidents(true).then((i) => setIncidents(i as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Centro de Incidentes" subtitle="Averías, fallas y emergencias" actions={CMMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Incidente</th><th>Activo</th><th>Tipo</th><th>Severidad</th><th>Estado</th></tr></thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={String(i.incidentKey)}><td>{String(i.title)}</td><td>{String(i.assetKey)}</td><td>{String(i.incidentType)}</td><td>{String(i.severity)}</td><td>{i.resolvedAt ? 'Resuelto' : 'Abierto'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsTechniciansPage() {
  const [technicians, setTechnicians] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEamCmmsTechnicians().then((t) => setTechnicians(t as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Panel de Técnicos" subtitle="Cuadrillas, disponibilidad y carga" actions={CMMS_LINKS} />
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Técnico</th><th>Especialidad</th><th>Disponible</th><th>Carga (h)</th></tr></thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={String(t.technicianKey)}><td>{String(t.name)}</td><td>{String(t.specialtyKey ?? '—')}</td><td>{t.isAvailable ? 'Sí' : 'No'}</td><td>{String(t.workloadHours)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EamCmmsCostDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamCmmsCostDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard de Costos" subtitle="Mano de obra, repuestos y servicios" actions={CMMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Costo anual</span><span className="kpi-value">{String(dash?.annualTotal ?? '—')}</span></div>
      </div>
    </>
  );
}

export function EamCmmsComplianceDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEamCmmsComplianceDashboard().then(setDash);
    getEamCmmsDashboard().then(setOps);
  }, []);

  return (
    <>
      <Header title="Dashboard de Cumplimiento" subtitle="SLA y operación" actions={CMMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">SLA cumplidos</span><span className="kpi-value">{String(dash?.compliant ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA incumplidos</span><span className="kpi-value">{String(dash?.breached ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(dash?.compliancePct ?? ops?.slaCompliancePct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => computeEamCmmsIndicators().then(setOps)}>Recalcular</button>
      </section>
    </>
  );
}
