import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  computeEmfgResourcesCapacity,
  createEmfgResourceCell,
  createEmfgResourceEquipment,
  getEmfgResourcesCapacityPanel,
  getEmfgResourcesCenter,
  getEmfgResourcesIndicators,
  listEmfgResourceEquipment,
  listEmfgResourcesWorkcenters,
  recordEmfgResourceMaintenance,
  syncEmfgResourceMachines,
} from '../api/emfg-resources';

const RES_LINKS = (
  <div className="row-actions">
    <Link to="/manufactura/recursos" className="btn">Centro Recursos</Link>
    <Link to="/manufactura/recursos/centros" className="btn">Centros Trabajo</Link>
    <Link to="/manufactura/recursos/maquinaria" className="btn">Maquinaria</Link>
    <Link to="/manufactura/recursos/capacidad" className="btn">Capacidad</Link>
    <Link to="/manufactura/recursos/dashboard" className="btn">Dashboard</Link>
    <Link to="/manufactura" className="btn">Manufactura</Link>
  </div>
);

export function EmfgResourcesCenterPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgResourcesCenter().then(setData); }, []);
  const ind = data?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Recursos de Producción" subtitle="Máquinas, centros, capacidad y disponibilidad" actions={RES_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Equipos</span><span className="kpi-value">{String(data?.equipmentCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Disponibilidad</span><span className="kpi-value">{ind?.availabilityPct != null ? `${ind.availabilityPct}%` : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Utilización</span><span className="kpi-value">{ind?.avgUtilizationPct != null ? `${ind.avgUtilizationPct}%` : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">MTBF</span><span className="kpi-value">{ind?.mtbf ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">MTTR</span><span className="kpi-value">{ind?.mttr ?? '—'}</span></div>
      </div>
    </>
  );
}

export function EmfgResourcesWorkcentersPage() {
  const [centers, setCenters] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listEmfgResourcesWorkcenters().then((c) => setCenters(c as Array<Record<string, unknown>>)); }, []);

  const addCell = () => {
    const center = centers[0];
    if (!center) return;
    createEmfgResourceCell({
      centerKey: center.centerKey, code: `CELL-${Date.now()}`, name: 'Célula nueva', installedCapacity: 120,
    }).then(() => listEmfgResourcesWorkcenters().then((c) => setCenters(c as Array<Record<string, unknown>>)));
  };

  return (
    <>
      <Header title="Administrador de Centros de Trabajo" subtitle="Centros, líneas, células y horarios" actions={RES_LINKS} />
      <button className="btn" onClick={addCell}>Crear célula</button>
      <section className="card">
        {centers.map((c) => (
          <div key={String(c.centerKey)}>
            <h3>{String(c.name)} ({String(c.code)})</h3>
            <p>Capacidad instalada: {String(c.installedCapacity)} | Disponible: {String(c.availableCapacity)}</p>
          </div>
        ))}
      </section>
    </>
  );
}

export function EmfgResourcesEquipmentPage() {
  const [equipment, setEquipment] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEmfgResourceEquipment().then((e) => setEquipment(e as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const sync = () => syncEmfgResourceMachines().then(reload);
  const addTool = () => createEmfgResourceEquipment({
    equipmentType: 'tool', code: `TL-${Date.now()}`, name: 'Herramienta crítica', serialNumber: 'SN-001',
  }).then(reload);

  return (
    <>
      <Header title="Gestor de Maquinaria" subtitle="Máquinas, equipos auxiliares y herramientas" actions={RES_LINKS} />
      <div className="form-row">
        <button className="btn" onClick={sync}>Sincronizar máquinas</button>
        <button className="btn btn-primary" onClick={addTool}>Agregar herramienta</button>
      </div>
      <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Horas</th></tr></thead>
        <tbody>{equipment.map((e) => (
          <tr key={String(e.equipmentKey)}><td>{String(e.code)}</td><td>{String(e.name)}</td>
            <td>{String(e.equipmentType)}</td><td>{String(e.availabilityStatus)}</td><td>{String(e.operatingHours)}</td></tr>
        ))}</tbody></table>
    </>
  );
}

export function EmfgResourcesCapacityPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const reload = () => getEmfgResourcesCapacityPanel().then(setPanel);
  useEffect(() => { reload(); }, []);

  const compute = () => computeEmfgResourcesCapacity().then(reload);

  const byType = panel?.byType as Record<string, Array<Record<string, unknown>>> | undefined;

  return (
    <>
      <Header title="Panel de Capacidad" subtitle="Utilización, ocioso y cuellos de botella" actions={RES_LINKS} />
      <button className="btn btn-primary" onClick={compute}>Recalcular capacidad</button>
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Utilización promedio</span><span className="kpi-value">{String(panel?.avgUtilizationPct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <h3>Centros de trabajo ({byType?.work_center?.length ?? 0})</h3>
        <table className="data-table"><thead><tr><th>Entidad</th><th>Instalada</th><th>Utilizada</th><th>%</th></tr></thead>
          <tbody>{(byType?.work_center ?? []).slice(0, 20).map((r) => (
            <tr key={String(r.shiftCapKey)}><td>{String(r.entityKey)}</td><td>{String(r.installedMinutes)}</td>
              <td>{String(r.utilizedMinutes)}</td><td>{String(r.utilizationPct)}%</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgResourcesDashboardPage() {
  const [ind, setInd] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgResourcesIndicators().then(setInd); }, []);
  const wcEff = (ind?.workCenterEfficiency as Array<Record<string, unknown>>) ?? [];
  const bottlenecks = (ind?.bottlenecks as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="Dashboard Operativo" subtitle="Disponibilidad, eficiencia y mantenimiento" actions={RES_LINKS} />
      <div className="grid-2">
        <section className="card">
          <h3>Eficiencia por centro</h3>
          <table className="data-table"><thead><tr><th>Centro</th><th>Utilización</th></tr></thead>
            <tbody>{wcEff.map((w) => (
              <tr key={String(w.workCenterKey)}><td>{String(w.name)}</td><td>{String(w.utilizationPct)}%</td></tr>
            ))}</tbody></table>
        </section>
        <section className="card">
          <h3>Cuellos de botella</h3>
          <ul>{bottlenecks.map((b) => (
            <li key={String(b.entityKey)}>{String(b.entityType)} {String(b.entityKey)} — {String(b.utilizationPct)}%</li>
          ))}</ul>
        </section>
      </div>
      <button className="btn" onClick={() => {
        const eq = wcEff[0];
        if (!eq) return;
        recordEmfgResourceMaintenance({ equipmentKey: 'EQ-000001', maintenanceType: 'preventive', technicalNotes: 'Rutina' });
      }}>Registrar mantenimiento demo</button>
    </>
  );
}
