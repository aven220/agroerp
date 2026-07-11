import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function HcmSsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm-ss').then(({ getHcmSsCenter }) => getHcmSsCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Seguridad y salud laboral" subtitle="Salud, riesgos, EPP, incidentes, inspecciones y bienestar" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hcm-ss').then(({ seedHcmSs }) => seedHcmSs().then(reload))}>Cargar configuración inicial</button>
          <Link to="/rrhh/sst/salud" className="btn">Salud Ocupacional</Link>
          <Link to="/rrhh/sst/riesgos" className="btn">Riesgos</Link>
          <Link to="/rrhh/sst/epp" className="btn">EPP</Link>
          <Link to="/rrhh/sst/incidentes" className="btn">Incidentes</Link>
          <Link to="/rrhh/sst/inspecciones" className="btn">Inspecciones</Link>
          <Link to="/rrhh/sst/dashboard" className="btn">Dashboard</Link>
          <Link to="/rrhh" className="btn">Personal</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Exámenes</span><span className="kpi-value">{String(center.examCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Exámenes vencidos</span><span className="kpi-value">{String(center.overdueExams ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Restricciones activas</span><span className="kpi-value">{String(center.activeRestrictions ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Riesgos altos/críticos</span><span className="kpi-value">{String(center.highRisks ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Incidentes abiertos</span><span className="kpi-value">{String(center.openIncidents ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Inspecciones</span><span className="kpi-value">{String(center.inspectionCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Programas bienestar</span><span className="kpi-value">{String(center.wellbeingPrograms ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">EPP por vencer</span><span className="kpi-value">{String(center.ppeExpiring ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmSsHealthPage() {
  const [exams, setExams] = useState<Array<Record<string, unknown>>>([]);
  const [restrictions, setRestrictions] = useState<Array<Record<string, unknown>>>([]);
  const [followUps, setFollowUps] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ss').then(({ listHcmSsExams, listHcmSsRestrictions, listHcmSsFollowUps }) => {
      listHcmSsExams().then(setExams as never);
      listHcmSsRestrictions().then(setRestrictions as never);
      listHcmSsFollowUps().then(setFollowUps as never);
    });
  }, []);

  return (
    <>
      <Header title="Panel Salud Ocupacional" subtitle="Exámenes, aptitud, restricciones y seguimientos" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Exámenes médicos ({exams.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Estado</th><th>Aptitud</th><th>Programado</th><th>Próximo</th></tr></thead>
          <tbody>{exams.map((e) => <tr key={String(e.examKey)}><td>{String(e.employeeKey)}</td><td>{String(e.examType)}</td><td>{String(e.status)}</td><td>{String(e.fitnessStatus)}</td><td>{String(e.scheduledAt).slice(0, 10)}</td><td>{e.nextDueAt ? String(e.nextDueAt).slice(0, 10) : '—'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Restricciones médicas ({restrictions.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Descripción</th><th>Desde</th><th>Hasta</th><th>Estado</th></tr></thead>
          <tbody>{restrictions.map((r) => <tr key={String(r.restrictionKey)}><td>{String(r.employeeKey)}</td><td>{String(r.description)}</td><td>{String(r.startDate).slice(0, 10)}</td><td>{r.endDate ? String(r.endDate).slice(0, 10) : '—'}</td><td>{String(r.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Seguimientos ({followUps.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Vence</th><th>Completado</th><th>Notas</th></tr></thead>
          <tbody>{followUps.map((f) => <tr key={String(f.followUpKey)}><td>{String(f.employeeKey)}</td><td>{String(f.dueAt).slice(0, 10)}</td><td>{f.isCompleted ? 'Sí' : 'No'}</td><td>{String(f.notes ?? '—')}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmSsRisksPage() {
  const [risks, setRisks] = useState<Array<Record<string, unknown>>>([]);
  const [matrix, setMatrix] = useState<Array<Record<string, unknown>>>([]);
  const [mitigations, setMitigations] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ss').then(({ listHcmSsRisks, getHcmSsRiskMatrix, listHcmSsMitigations }) => {
      listHcmSsRisks().then(setRisks as never);
      getHcmSsRiskMatrix().then(setMatrix as never);
      listHcmSsMitigations().then(setMitigations as never);
    });
  }, []);

  return (
    <>
      <Header title="Administrador de Riesgos" subtitle="Matriz, evaluaciones, controles y mitigación" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Riesgos ({risks.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Área</th><th>Controles</th></tr></thead>
          <tbody>{risks.map((r) => {
            const controls = (r.controls ?? []) as unknown[];
            return <tr key={String(r.riskKey)}><td>{String(r.code)}</td><td>{String(r.name)}</td><td>{String(r.category)}</td><td>{String(r.processArea ?? '—')}</td><td>{controls.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Matriz de riesgos ({matrix.length})</h3>
        <table className="data-table"><thead><tr><th>Riesgo</th><th>Categoría</th><th>Score</th><th>Nivel</th><th>Evaluaciones</th></tr></thead>
          <tbody>{matrix.map((m) => <tr key={String(m.riskKey)}><td>{String(m.name)}</td><td>{String(m.category)}</td><td>{String(m.latestScore)}</td><td>{String(m.latestLevel)}</td><td>{String(m.assessmentCount)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Planes de mitigación ({mitigations.length})</h3>
        <table className="data-table"><thead><tr><th>Título</th><th>Riesgo</th><th>Estado</th><th>Avance</th><th>Vence</th></tr></thead>
          <tbody>{mitigations.map((m) => {
            const risk = m.risk as Record<string, unknown> | undefined;
            return <tr key={String(m.planKey)}><td>{String(m.title)}</td><td>{risk ? String(risk.name) : String(m.riskKey)}</td><td>{String(m.status)}</td><td>{String(m.progressPct)}%</td><td>{m.dueAt ? String(m.dueAt).slice(0, 10) : '—'}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmSsPpePage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);
  const [expiring, setExpiring] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ss').then(({ listHcmSsPpe, listHcmSsPpeAssignments, listHcmSsPpeDeliveries, listHcmSsPpeExpiryAlerts }) => {
      listHcmSsPpe().then(setItems as never);
      listHcmSsPpeAssignments().then(setAssignments as never);
      listHcmSsPpeDeliveries().then(setDeliveries as never);
      listHcmSsPpeExpiryAlerts().then(setExpiring as never);
    });
  }, []);

  return (
    <>
      <Header title="Administrador EPP" subtitle="Catálogo, asignaciones, entregas y vencimientos" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Catálogo EPP ({items.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Vida útil (días)</th></tr></thead>
          <tbody>{items.map((i) => <tr key={String(i.ppeKey)}><td>{String(i.code)}</td><td>{String(i.name)}</td><td>{String(i.category)}</td><td>{String(i.usefulLifeDays ?? '—')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Asignaciones ({assignments.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>EPP</th><th>Cantidad</th><th>Asignado</th></tr></thead>
          <tbody>{assignments.map((a) => {
            const ppe = a.ppe as Record<string, unknown> | undefined;
            return <tr key={String(a.assignmentKey)}><td>{String(a.employeeKey)}</td><td>{ppe ? String(ppe.name) : String(a.ppeKey)}</td><td>{String(a.quantity)}</td><td>{String(a.assignedAt).slice(0, 10)}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Entregas ({deliveries.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>EPP</th><th>Tipo</th><th>Estado</th><th>Firma</th><th>Vence</th></tr></thead>
          <tbody>{deliveries.map((d) => {
            const ppe = d.ppe as Record<string, unknown> | undefined;
            return <tr key={String(d.deliveryKey)}><td>{String(d.employeeKey)}</td><td>{ppe ? String(ppe.name) : String(d.ppeKey)}</td><td>{String(d.deliveryType)}</td><td>{String(d.status)}</td><td>{String(d.signatureName ?? '—')}</td><td>{d.expiresAt ? String(d.expiresAt).slice(0, 10) : '—'}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>EPP por vencer / reponer ({expiring.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>EPP</th><th>Vence</th></tr></thead>
          <tbody>{expiring.map((d) => {
            const ppe = d.ppe as Record<string, unknown> | undefined;
            return <tr key={String(d.deliveryKey)}><td>{String(d.employeeKey)}</td><td>{ppe ? String(ppe.name) : String(d.ppeKey)}</td><td>{d.expiresAt ? String(d.expiresAt).slice(0, 10) : '—'}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmSsIncidentsPage() {
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ss').then(({ listHcmSsIncidents }) => listHcmSsIncidents().then(setIncidents as never));
  }, []);

  return (
    <>
      <Header title="Centro de incidentes" subtitle="Accidentes, incidentes, investigaciones y acciones" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Incidentes ({incidents.length})</h3>
        <table className="data-table"><thead><tr><th>Título</th><th>Tipo</th><th>Severidad</th><th>Estado</th><th>Fecha</th><th>Acciones</th><th>Evidencias</th></tr></thead>
          <tbody>{incidents.map((i) => {
            const actions = (i.actions ?? []) as unknown[];
            const evidences = (i.evidences ?? []) as unknown[];
            return <tr key={String(i.incidentKey)}><td>{String(i.title)}</td><td>{String(i.incidentType)}</td><td>{String(i.severity)}</td><td>{String(i.status)}</td><td>{String(i.occurredAt).slice(0, 19).replace('T', ' ')}</td><td>{actions.length}</td><td>{evidences.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmSsInspectionsPage() {
  const [inspections, setInspections] = useState<Array<Record<string, unknown>>>([]);
  const [programs, setPrograms] = useState<Array<Record<string, unknown>>>([]);
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ss').then(({ listHcmSsInspections, listHcmSsWellbeingPrograms, listHcmSsEmergencyPlans }) => {
      listHcmSsInspections().then(setInspections as never);
      listHcmSsWellbeingPrograms().then(setPrograms as never);
      listHcmSsEmergencyPlans().then(setPlans as never);
    });
  }, []);

  return (
    <>
      <Header title="Panel de inspecciones" subtitle="Inspecciones, bienestar y planes de emergencia" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Inspecciones ({inspections.length})</h3>
        <table className="data-table"><thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Hallazgos</th><th>Acciones</th></tr></thead>
          <tbody>{inspections.map((i) => {
            const findings = (i.findings ?? []) as unknown[];
            const actions = (i.actions ?? []) as unknown[];
            return <tr key={String(i.inspectionKey)}><td>{String(i.title)}</td><td>{String(i.inspectionType)}</td><td>{String(i.status)}</td><td>{findings.length}</td><td>{actions.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Programas de bienestar ({programs.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Actividades</th><th>Encuestas</th></tr></thead>
          <tbody>{programs.map((p) => {
            const activities = (p.activities ?? []) as unknown[];
            const surveys = (p.surveys ?? []) as unknown[];
            return <tr key={String(p.programKey)}><td>{String(p.name)}</td><td>{String(p.programType)}</td><td>{activities.length}</td><td>{surveys.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Planes de emergencia ({plans.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Brigadas</th><th>Simulacros</th><th>Equipos</th></tr></thead>
          <tbody>{plans.map((p) => {
            const brigades = (p.brigades ?? []) as unknown[];
            const drills = (p.drills ?? []) as unknown[];
            const equipments = (p.equipments ?? []) as unknown[];
            return <tr key={String(p.planKey)}><td>{String(p.name)}</td><td>{brigades.length}</td><td>{drills.length}</td><td>{equipments.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmSsDashboardPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { import('../api/hcm-ss').then(({ getHcmSsDashboard }) => getHcmSsDashboard().then(setDashboard)); }, []);

  const examsByType = (dashboard?.examsByType ?? []) as Array<Record<string, unknown>>;
  const risksByLevel = (dashboard?.risksByLevel ?? []) as Array<Record<string, unknown>>;
  const incidentsByType = (dashboard?.incidentsByType ?? []) as Array<Record<string, unknown>>;
  const inspectionsByStatus = (dashboard?.inspectionsByStatus ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard preventivo SST" subtitle="Salud, riesgos, incidentes e inspecciones" actions={<Link to="/rrhh/sst" className="btn">SST</Link>} />
      <section className="panel"><h3>Exámenes por tipo/estado</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>{examsByType.map((e, i) => <tr key={i}><td>{String(e.examType)}</td><td>{String(e.status)}</td><td>{String((e._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Evaluaciones por nivel de riesgo</h3>
        <table className="data-table"><thead><tr><th>Nivel</th><th>Cantidad</th></tr></thead>
          <tbody>{risksByLevel.map((r, i) => <tr key={i}><td>{String(r.riskLevel)}</td><td>{String((r._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Incidentes</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>{incidentsByType.map((d, i) => <tr key={i}><td>{String(d.incidentType)}</td><td>{String(d.status)}</td><td>{String((d._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Inspecciones por estado</h3>
        <table className="data-table"><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>{inspectionsByStatus.map((d, i) => <tr key={i}><td>{String(d.status)}</td><td>{String((d._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
