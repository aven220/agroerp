import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  closeEmfgQmsNc, completeEmfgQmsInspection, createEmfgQmsCapa, createEmfgQmsInspection,
  createEmfgQmsNc, createEmfgQmsPlan, decideEmfgQmsRelease, getEmfgQmsDashboard,
  listEmfgQmsCapa, listEmfgQmsInspections, listEmfgQmsNc, listEmfgQmsPlans, listEmfgQmsReleases,
} from '../api/emfg-qms';

const QMS_LINKS = (
  <div className="row-actions">
    <Link to="/manufactura/calidad" className="btn">Centro Calidad</Link>
    <Link to="/manufactura/calidad/inspecciones" className="btn">Inspecciones</Link>
    <Link to="/manufactura/calidad/nc" className="btn">No Conformidades</Link>
    <Link to="/manufactura/calidad/capa" className="btn">CAPA</Link>
    <Link to="/manufactura/calidad/liberacion" className="btn">Liberación Lotes</Link>
    <Link to="/manufactura/calidad/dashboard" className="btn">Dashboard</Link>
    <Link to="/manufactura" className="btn">Manufactura</Link>
  </div>
);

export function EmfgQmsCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgQmsDashboard().then(setDash); }, []);
  const ind = dash?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Calidad QMS" subtitle="Inspecciones, NC, CAPA y liberación de lotes" actions={QMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">% Rechazo</span><span className="kpi-value">{ind?.rejectionPct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">% Aprobación lotes</span><span className="kpi-value">{ind?.approvalPct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">NC abiertas</span><span className="kpi-value">{String(ind?.openNcCount ?? dash?.openCapas ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Lotes pendientes</span><span className="kpi-value">{String(dash?.pendingReleases ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cierre promedio (días)</span><span className="kpi-value">{ind?.avgClosureDays ?? '—'}</span></div>
      </div>
    </>
  );
}

export function EmfgQmsInspectionsPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [inspections, setInspections] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => {
    listEmfgQmsPlans().then((p) => setPlans(p as Array<Record<string, unknown>>));
    listEmfgQmsInspections().then((i) => setInspections(i as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  const createPlan = () => createEmfgQmsPlan({
    name: 'Plan recepción MP', scope: 'raw_material', frequency: 'each_lot',
    criteria: [{ name: 'Humedad %', unit: '%', minValue: 8, maxValue: 14 }],
  }).then(reload);

  const createInspection = () => createEmfgQmsInspection({
    inspectionType: 'reception', planKey: plans[0]?.planKey as string, itemKey: 'MAT-001',
  }).then(reload);

  return (
    <>
      <Header title="Gestor de Inspecciones" subtitle="Recepción, proceso, final y extraordinarias" actions={QMS_LINKS} />
      <div className="form-row">
        <button className="btn" onClick={createPlan}>Crear plan</button>
        <button className="btn btn-primary" onClick={createInspection}>Nueva inspección</button>
      </div>
      <section className="card">
        <h3>Inspecciones ({inspections.length})</h3>
        <table className="data-table"><thead><tr><th>Clave</th><th>Tipo</th><th>Resultado</th><th>Lote</th></tr></thead>
          <tbody>{inspections.slice(0, 30).map((i) => (
            <tr key={String(i.inspectionKey)}>
              <td>{String(i.inspectionKey)}</td><td>{String(i.inspectionType)}</td>
              <td>{String(i.result)}</td><td>{String(i.lotKey ?? '—')}</td>
            </tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgQmsNcPage() {
  const [ncs, setNcs] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEmfgQmsNc().then((n) => setNcs(n as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const createNc = () => createEmfgQmsNc({
    classification: 'material', severity: 'major', origin: 'inspection',
    description: 'Material fuera de especificación', itemKey: 'MAT-001',
  }).then(reload);

  return (
    <>
      <Header title="Gestor de No Conformidades" subtitle="Registro, clasificación, severidad y seguimiento" actions={QMS_LINKS} />
      <button className="btn btn-primary" onClick={createNc}>Registrar NC</button>
      <section className="card">
        <table className="data-table"><thead><tr><th>Clave</th><th>Severidad</th><th>Estado</th><th>Origen</th><th></th></tr></thead>
          <tbody>{ncs.map((n) => (
            <tr key={String(n.ncKey)}>
              <td>{String(n.ncKey)}</td><td>{String(n.severity)}</td><td>{String(n.status)}</td>
              <td>{String(n.origin)}</td>
              <td>{n.status !== 'closed' && <button className="btn" onClick={() => closeEmfgQmsNc(String(n.ncKey)).then(reload)}>Cerrar</button>}</td>
            </tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgQmsCapaPage() {
  const [capas, setCapas] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEmfgQmsCapa().then((c) => setCapas(c as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const createCapa = () => createEmfgQmsCapa({
    capaType: 'corrective', title: 'Ajuste proceso', actionPlan: 'Recalibrar equipo de medición',
    responsibleKey: 'QC-001',
  }).then(reload);

  return (
    <>
      <Header title="Centro CAPA" subtitle="Acciones correctivas, preventivas y verificación" actions={QMS_LINKS} />
      <button className="btn btn-primary" onClick={createCapa}>Nueva CAPA</button>
      <section className="card">
        <table className="data-table"><thead><tr><th>Clave</th><th>Tipo</th><th>Estado</th><th>Título</th></tr></thead>
          <tbody>{capas.map((c) => (
            <tr key={String(c.capaKey)}><td>{String(c.capaKey)}</td><td>{String(c.capaType)}</td>
              <td>{String(c.status)}</td><td>{String(c.title)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgQmsReleasePage() {
  const [releases, setReleases] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEmfgQmsReleases().then((r) => setReleases(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const decide = (releaseKey: string, action: string) =>
    decideEmfgQmsRelease(releaseKey, { action }).then(reload);

  return (
    <>
      <Header title="Panel de Liberación de Lotes" subtitle="Pendientes, aprobados, rechazados y retenidos" actions={QMS_LINKS} />
      <section className="card">
        <table className="data-table"><thead><tr><th>Lote</th><th>Ítem</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{releases.map((r) => (
            <tr key={String(r.releaseKey)}>
              <td>{String(r.lotCode)}</td><td>{String(r.itemKey)}</td><td>{String(r.status)}</td>
              <td>{r.status === 'pending' && (
                <span className="row-actions">
                  <button className="btn" onClick={() => decide(String(r.releaseKey), 'approve')}>Aprobar</button>
                  <button className="btn" onClick={() => decide(String(r.releaseKey), 'reject')}>Rechazar</button>
                  <button className="btn" onClick={() => decide(String(r.releaseKey), 'hold')}>Retener</button>
                </span>
              )}</td>
            </tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgQmsDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgQmsDashboard(90).then(setDash); }, []);
  const ind = dash?.indicators as Record<string, unknown> | undefined;
  const bySupplier = (ind?.bySupplier as Array<Record<string, unknown>>) ?? [];
  const byLine = (ind?.byLine as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Dashboard de Calidad" subtitle="Indicadores por proveedor y línea de producción" actions={QMS_LINKS} />
      <div className="grid-2">
        <section className="card">
          <h3>Calidad por proveedor</h3>
          <table className="data-table"><thead><tr><th>Proveedor</th><th>% Rechazo</th></tr></thead>
            <tbody>{bySupplier.map((s) => (
              <tr key={String(s.supplierKey)}><td>{String(s.supplierKey)}</td><td>{String(s.rejectionPct)}%</td></tr>
            ))}</tbody></table>
        </section>
        <section className="card">
          <h3>Calidad por línea</h3>
          <table className="data-table"><thead><tr><th>Línea</th><th>% Rechazo</th></tr></thead>
            <tbody>{byLine.map((l) => (
              <tr key={String(l.lineKey)}><td>{String(l.lineKey)}</td><td>{String(l.rejectionPct)}%</td></tr>
            ))}</tbody></table>
        </section>
      </div>
    </>
  );
}
