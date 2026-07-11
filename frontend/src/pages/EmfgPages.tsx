import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function EmfgCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/emfg').then(({ getEmfgCenter }) => getEmfgCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  const capacity = center?.capacity as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Centro de Producción" subtitle="Plan maestro, órdenes, BOM, rutas y programación" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/emfg').then(({ seedEmfg }) => seedEmfg().then(reload))}>Cargar configuración inicial</button>
          <Link to="/manufactura/plan-maestro" className="btn">Plan Maestro</Link>
          <Link to="/manufactura/bom" className="btn">BOM</Link>
          <Link to="/manufactura/rutas" className="btn">Rutas</Link>
          <Link to="/manufactura/ordenes" className="btn">Órdenes</Link>
          <Link to="/manufactura/programador" className="btn">Programador</Link>
          <Link to="/manufactura/mes" className="btn btn-primary">MES Ejecución</Link>
          <Link to="/manufactura/calidad" className="btn btn-primary">QMS Calidad</Link>
          <Link to="/manufactura/recursos" className="btn btn-primary">Recursos</Link>
          <Link to="/manufactura/costos" className="btn btn-primary">Costos</Link>
          <Link to="/manufactura/inteligencia" className="btn btn-primary">Inteligencia</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Órdenes abiertas</span><span className="kpi-value">{String(center.openOrders ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Total órdenes</span><span className="kpi-value">{String(center.orderCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">BOM activos</span><span className="kpi-value">{String(center.bomCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Rutas activas</span><span className="kpi-value">{String(center.routingCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Planes activos</span><span className="kpi-value">{String(center.planCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Conflictos</span><span className="kpi-value">{String(center.conflictCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Centros prod.</span><span className="kpi-value">{String(center.centerCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Utilización</span><span className="kpi-value">{String(capacity?.utilizationPct ?? 0)}%</span></div>
        </div>
      ) : null}
    </>
  );
}

export function EmfgMasterPlanPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/emfg').then(({ listEmfgMasterPlans }) => listEmfgMasterPlans().then(setPlans as never)); }, []);

  return (
    <>
      <Header title="Plan Maestro de Producción" subtitle="Horizonte, capacidad y generación de órdenes" actions={<Link to="/manufactura" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Plan</th><th>Estado</th><th>Horizonte</th><th>Inicio</th><th>Fin</th><th>Líneas</th></tr></thead>
          <tbody>{plans.map((p) => (
            <tr key={String(p.planKey)}>
              <td>{String(p.name)}</td>
              <td>{String(p.status)}</td>
              <td>{String(p.horizonDays)} días</td>
              <td>{String(p.horizonStart).slice(0, 10)}</td>
              <td>{String(p.horizonEnd).slice(0, 10)}</td>
              <td>{Array.isArray(p.lines) ? p.lines.length : 0}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function EmfgBomPage() {
  const [boms, setBoms] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/emfg').then(({ listEmfgBoms }) => listEmfgBoms().then(setBoms as never)); }, []);

  return (
    <>
      <Header title="Administrador BOM" subtitle="Materias primas, versiones, sustituciones y rendimientos" actions={<Link to="/manufactura" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Nombre</th><th>Versión</th><th>Rendimiento</th><th>Merma</th><th>Componentes</th></tr></thead>
          <tbody>{boms.map((b) => (
            <tr key={String(b.bomKey)}>
              <td>{String(b.itemKey)}</td>
              <td>{String(b.name)}</td>
              <td>{String(b.version)}</td>
              <td>{String(b.yieldPct)}%</td>
              <td>{String(b.scrapPct)}%</td>
              <td>{Array.isArray(b.lines) ? b.lines.length : 0}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function EmfgRoutingPage() {
  const [routings, setRoutings] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/emfg').then(({ listEmfgRoutings }) => listEmfgRoutings().then(setRoutings as never)); }, []);

  return (
    <>
      <Header title="Administrador de Rutas" subtitle="Operaciones, secuencias, tiempos y recursos" actions={<Link to="/manufactura" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Nombre</th><th>Versión</th><th>Operaciones</th></tr></thead>
          <tbody>{routings.map((r) => (
            <tr key={String(r.routingKey)}>
              <td>{String(r.itemKey)}</td>
              <td>{String(r.name)}</td>
              <td>{String(r.version)}</td>
              <td>{Array.isArray(r.operations) ? r.operations.length : 0}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function EmfgOrdersPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/emfg').then(({ listEmfgOrders }) => listEmfgOrders().then(setOrders as never)); }, []);

  return (
    <>
      <Header title="Órdenes de Producción" subtitle="Manuales, automáticas, estados y responsables" actions={<Link to="/manufactura" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Número</th><th>Item</th><th>Estado</th><th>Prioridad</th><th>Cantidad</th><th>Producido</th><th>Centro</th><th>Origen</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={String(o.orderKey)}>
              <td>{String(o.orderNumber)}</td>
              <td>{String(o.itemKey)}</td>
              <td>{String(o.status)}</td>
              <td>{String(o.priority)}</td>
              <td>{String(o.plannedQty)}</td>
              <td>{String(o.producedQty)}</td>
              <td>{String(o.centerKey)}</td>
              <td>{String(o.origin)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function EmfgSchedulerPage() {
  const [schedule, setSchedule] = useState<Array<Record<string, unknown>>>([]);
  const [conflicts, setConflicts] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/emfg').then(({ listEmfgSchedule, listEmfgConflicts }) => {
      listEmfgSchedule().then(setSchedule as never);
      listEmfgConflicts().then(setConflicts as never);
    });
  }, []);

  return (
    <>
      <Header title="Programador de Producción" subtitle="Programación manual/automática, conflictos y reprogramación" actions={<Link to="/manufactura" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Programación</h3>
        <table className="data-table">
          <thead><tr><th>Orden</th><th>Centro trabajo</th><th>Modo</th><th>Inicio</th><th>Fin</th><th>Carga min</th></tr></thead>
          <tbody>{schedule.map((s) => (
            <tr key={String(s.scheduleKey)}>
              <td>{String(s.orderKey)}</td>
              <td>{String(s.workCenterKey)}</td>
              <td>{String(s.mode)}</td>
              <td>{String(s.startAt).slice(0, 16).replace('T', ' ')}</td>
              <td>{String(s.endAt).slice(0, 16).replace('T', ' ')}</td>
              <td>{String(s.loadMinutes)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Conflictos</h3>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Centro</th><th>Severidad</th><th>Mensaje</th><th>Detectado</th></tr></thead>
          <tbody>{conflicts.map((c) => (
            <tr key={String(c.conflictKey)}>
              <td>{String(c.conflictType)}</td>
              <td>{String(c.workCenterKey ?? '—')}</td>
              <td>{String(c.severity)}</td>
              <td>{String(c.message)}</td>
              <td>{String(c.detectedAt).slice(0, 16).replace('T', ' ')}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
