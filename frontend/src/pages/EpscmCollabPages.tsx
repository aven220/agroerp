import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEpscmCollab,
  createEpscmCollabSimulation,
  getEpscmCollabCenter,
  getEpscmCollabCollaboration,
  getEpscmCollabComplianceDashboard,
  getEpscmCollabExecutiveDashboard,
  getEpscmCollabOperatorPortal,
  getEpscmCollabSlaCenter,
  getEpscmCollabSupplierPortal,
  listEpscmCollabPartners,
  listEpscmCollabSimulations,
  listEpscmCollabTasks,
  runEpscmCollabSimulation,
  syncEpscmCollabSupplierOrders,
} from '../api/epscm-collab';

const COLLAB_LINKS = (
  <div className="row-actions">
    <Link to="/cadena-suministro/colaboracion" className="btn">Centro</Link>
    <Link to="/cadena-suministro/colaboracion/proveedores" className="btn">Proveedores</Link>
    <Link to="/cadena-suministro/colaboracion/operadores" className="btn">Operadores</Link>
    <Link to="/cadena-suministro/colaboracion/sla" className="btn">SLA</Link>
    <Link to="/cadena-suministro/colaboracion/colaboracion" className="btn">Colaboración</Link>
    <Link to="/cadena-suministro/colaboracion/ejecutivo" className="btn">Ejecutivo</Link>
    <Link to="/cadena-suministro/colaboracion/cumplimiento" className="btn">Cumplimiento</Link>
    <Link to="/cadena-suministro/colaboracion/simulacion" className="btn">Simulación</Link>
  </div>
);

export function EpscmCollabCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmCollabCenter().then(setCenter); }, []);
  const indicators = center?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Colaboración SCM" subtitle="Ecosistema colaborativo de cadena de suministro" actions={COLLAB_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Socios</span><span className="kpi-value">{((center?.partners as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Nivel servicio</span><span className="kpi-value">{String(indicators?.serviceLevelPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento entregas</span><span className="kpi-value">{String(indicators?.deliveryCompliancePct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA incumplidos</span><span className="kpi-value">{String((center?.sla as Record<string, number>)?.breachedCount ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEpscmCollab().then(() => getEpscmCollabCenter().then(setCenter))}>Inicializar Colaboración</button>
      </section>
    </>
  );
}

export function EpscmCollabSupplierPage() {
  const [partners, setPartners] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [portal, setPortal] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    listEpscmCollabPartners().then((p) => {
      const suppliers = (p as Array<Record<string, unknown>>).filter((x) => x.partnerType === 'supplier');
      setPartners(suppliers);
      if (suppliers[0]) setSelected(String(suppliers[0].partnerKey));
    });
  }, []);

  useEffect(() => {
    if (selected) getEpscmCollabSupplierPortal(selected).then(setPortal);
  }, [selected]);

  const orders = (portal?.orders as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Portal de Proveedores" subtitle="Órdenes, facturas y certificados" actions={COLLAB_LINKS} />
      <section className="card">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {partners.map((p) => <option key={String(p.partnerKey)} value={String(p.partnerKey)}>{String(p.name)}</option>)}
        </select>
        <button className="btn" onClick={() => syncEpscmCollabSupplierOrders(selected).then(() => getEpscmCollabSupplierPortal(selected).then(setPortal))}>Sincronizar órdenes</button>
        <table className="data-table">
          <thead><tr><th>Orden</th><th>Item</th><th>Cantidad</th><th>Estado</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={String(o.linkKey)}><td>{String(o.purchaseKey)}</td><td>{String(o.itemKey ?? '—')}</td><td>{String(o.quantity)}</td><td>{String(o.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmCollabOperatorPage() {
  const [partners, setPartners] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [portal, setPortal] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    listEpscmCollabPartners().then((p) => {
      const ops = (p as Array<Record<string, unknown>>).filter((x) => x.partnerType === 'operator');
      setPartners(ops);
      if (ops[0]) setSelected(String(ops[0].partnerKey));
    });
  }, []);

  useEffect(() => {
    if (selected) getEpscmCollabOperatorPortal(selected).then(setPortal);
  }, [selected]);

  const assignments = (portal?.assignments as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Portal de Operadores" subtitle="Viajes, entregas y evidencias" actions={COLLAB_LINKS} />
      <section className="card">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {partners.map((p) => <option key={String(p.partnerKey)} value={String(p.partnerKey)}>{String(p.name)}</option>)}
        </select>
        <table className="data-table">
          <thead><tr><th>Asignación</th><th>Viaje</th><th>Estado</th></tr></thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={String(a.assignmentKey)}><td>{String(a.assignmentKey)}</td><td>{String(a.tripKey)}</td><td>{String(a.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmCollabSlaPage() {
  const [sla, setSla] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmCollabSlaCenter().then(setSla); }, []);
  const contracts = (sla?.contracts as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Centro de SLA" subtitle="Contratos, cumplimiento y penalizaciones" actions={COLLAB_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Incumplidos</span><span className="kpi-value">{String(sla?.breachedCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">En riesgo</span><span className="kpi-value">{String(sla?.atRiskCount ?? '—')}</span></div>
      </div>
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Contrato</th><th>Socio</th><th>Estado</th><th>SLAs</th></tr></thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={String(c.contractKey)}><td>{String(c.name)}</td><td>{String(c.partnerKey)}</td><td>{String(c.status)}</td><td>{((c.slas as unknown[]) ?? []).length}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmCollabCollaborationPage() {
  const [collab, setCollab] = useState<Record<string, unknown> | null>(null);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    getEpscmCollabCollaboration().then(setCollab);
    listEpscmCollabTasks().then((t) => setTasks(t as Array<Record<string, unknown>>));
  }, []);

  const threads = (collab?.threads as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Centro de Colaboración" subtitle="Mensajes, tareas y seguimiento" actions={COLLAB_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Hilos</span><span className="kpi-value">{threads.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Tareas abiertas</span><span className="kpi-value">{((collab?.openTasks as unknown[]) ?? []).length}</span></div>
      </div>
      <section className="card">
        <table className="data-table">
          <thead><tr><th>Tarea</th><th>Título</th><th>Estado</th></tr></thead>
          <tbody>
            {tasks.slice(0, 15).map((t) => (
              <tr key={String(t.taskKey)}><td>{String(t.taskKey)}</td><td>{String(t.title)}</td><td>{String(t.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EpscmCollabExecutivePage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmCollabExecutiveDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard Logístico Ejecutivo" subtitle="Indicadores integrados" actions={COLLAB_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Costo logístico</span><span className="kpi-value">{String(dash?.logisticCostTotal ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo/cliente</span><span className="kpi-value">{String(dash?.costPerCustomer ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Rotación inventario</span><span className="kpi-value">{String(dash?.inventoryRotation ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ocupación bodega</span><span className="kpi-value">{String(dash?.warehouseOccupancyPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento proveedor</span><span className="kpi-value">{String(dash?.supplierCompliancePct ?? '—')}%</span></div>
      </div>
    </>
  );
}

export function EpscmCollabCompliancePage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmCollabComplianceDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard de Cumplimiento" subtitle="SLA y entregas" actions={COLLAB_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">SLA cumplidos</span><span className="kpi-value">{String(dash?.compliantSlas ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA incumplidos</span><span className="kpi-value">{String(dash?.breachedSlas ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Nivel servicio</span><span className="kpi-value">{String((dash?.indicators as Record<string, number>)?.serviceLevelPct ?? '—')}%</span></div>
      </div>
    </>
  );
}

export function EpscmCollabSimulationPage() {
  const [sims, setSims] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEpscmCollabSimulations().then((s) => setSims(s as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const createAndRun = () => {
    createEpscmCollabSimulation({ name: 'Escenario rutas', simulationType: 'route_change' })
      .then((s) => {
        const key = String((s as Record<string, unknown>).simulationKey);
        return runEpscmCollabSimulation(key);
      })
      .then(reload);
  };

  return (
    <>
      <Header title="Centro de Simulación" subtitle="Escenarios logísticos" actions={COLLAB_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={createAndRun}>Crear y ejecutar simulación</button>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>
            {sims.map((s) => (
              <tr key={String(s.simulationKey)}><td>{String(s.simulationKey)}</td><td>{String(s.name)}</td><td>{String(s.simulationType)}</td><td>{String(s.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
