import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEacc,
  getEaccCenter,
  getEaccDashboard,
  listEaccAlerts,
  listEaccAuditPlans,
  listEaccAudits,
  listEaccCertifications,
  listEaccChecklists,
  listEaccDocuments,
  listEaccEsgIndicators,
  listEaccEsgObjectives,
  listEaccEvidences,
  listEaccFindings,
  listEaccFootprintConfigs,
  listEaccFrameworks,
  listEaccRequirements,
  listEaccSafetyIncidents,
  listEaccSustainabilityIndicators,
  type EaccCenter,
} from '../api/eacc';

const EACC_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/cumplimiento" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/cumplimiento/certificaciones" className="btn">Certificaciones</Link>
    <Link to="/plataforma-agritech/cumplimiento/auditorias" className="btn">Auditorías</Link>
    <Link to="/plataforma-agritech/cumplimiento/cumplimiento" className="btn">Cumplimiento</Link>
    <Link to="/plataforma-agritech/cumplimiento/esg" className="btn">ESG</Link>
    <Link to="/plataforma-agritech/cumplimiento/sostenibilidad" className="btn">Sostenibilidad</Link>
    <Link to="/plataforma-agritech/cumplimiento/evidencias" className="btn">Evidencias</Link>
    <Link to="/plataforma-agritech/cumplimiento/hallazgos" className="btn">Hallazgos</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EaccCenterPage() {
  const [center, setCenter] = useState<EaccCenter | null>(null);
  useEffect(() => { getEaccCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Certificaciones" subtitle="Sprint 6 — EACC" actions={EACC_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Certificaciones</span><span className="kpi-value">{String(indicators?.activeCertifications ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(indicators?.complianceRate ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Hallazgos</span><span className="kpi-value">{String(indicators?.openFindings ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Compliance Score</span><span className="kpi-value">{String(indicators?.complianceScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEacc().then(setCenter)}>Inicializar Cumplimiento</button>
      </section>
      <section className="card">
        <p>Marcos: {center?.frameworks.length ?? 0} · Certificaciones: {center?.certifications.length ?? 0} · Alertas: {center?.activeAlerts.length ?? 0}</p>
      </section>
    </>
  );
}

export function EaccCertificationsPage() {
  const [frameworks, setFrameworks] = useState<unknown[]>([]);
  const [certifications, setCertifications] = useState<unknown[]>([]);
  useEffect(() => {
    listEaccFrameworks().then(setFrameworks);
    listEaccCertifications().then(setCertifications);
  }, []);

  return (
    <>
      <Header title="Centro de Certificaciones" actions={EACC_LINKS} />
      <section className="card"><h3>Marcos normativos ({frameworks.length})</h3></section>
      <section className="card"><h3>Certificaciones activas ({certifications.length})</h3></section>
    </>
  );
}

export function EaccAuditsPage() {
  const [plans, setPlans] = useState<unknown[]>([]);
  const [audits, setAudits] = useState<unknown[]>([]);
  useEffect(() => {
    listEaccAuditPlans().then(setPlans);
    listEaccAudits().then(setAudits);
  }, []);

  return (
    <>
      <Header title="Centro de Auditorías" actions={EACC_LINKS} />
      <section className="card"><h3>Planes de auditoría ({plans.length})</h3></section>
      <section className="card"><h3>Auditorías ({audits.length})</h3></section>
    </>
  );
}

export function EaccCompliancePage() {
  const [requirements, setRequirements] = useState<unknown[]>([]);
  const [checklists, setChecklists] = useState<unknown[]>([]);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  useEffect(() => {
    listEaccRequirements().then(setRequirements);
    listEaccChecklists().then(setChecklists);
    listEaccAlerts().then(setAlerts);
  }, []);

  return (
    <>
      <Header title="Centro de Cumplimiento" actions={EACC_LINKS} />
      <section className="card"><h3>Requisitos ({requirements.length})</h3></section>
      <section className="card"><h3>Listas de verificación ({checklists.length})</h3></section>
      <section className="card"><h3>Alertas ({alerts.length})</h3></section>
    </>
  );
}

export function EaccEsgPage() {
  const [indicators, setIndicators] = useState<unknown[]>([]);
  const [objectives, setObjectives] = useState<unknown[]>([]);
  const [footprint, setFootprint] = useState<unknown[]>([]);
  useEffect(() => {
    listEaccEsgIndicators().then(setIndicators);
    listEaccEsgObjectives().then(setObjectives);
    listEaccFootprintConfigs().then(setFootprint);
  }, []);

  return (
    <>
      <Header title="Centro ESG" actions={EACC_LINKS} />
      <section className="card"><h3>Indicadores ESG ({indicators.length})</h3></section>
      <section className="card"><h3>Objetivos ({objectives.length})</h3></section>
      <section className="card"><h3>Huella ambiental ({footprint.length})</h3></section>
    </>
  );
}

export function EaccSustainabilityDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [indicators, setIndicators] = useState<unknown[]>([]);
  const [incidents, setIncidents] = useState<unknown[]>([]);
  useEffect(() => {
    getEaccDashboard().then(setDashboard);
    listEaccSustainabilityIndicators().then(setIndicators);
    listEaccSafetyIncidents().then(setIncidents);
  }, []);
  const ind = (dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Dashboard de Sostenibilidad" actions={EACC_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Registros 30d</span><span className="kpi-value">{String(ind?.sustainabilityRecords30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Objetivos ESG</span><span className="kpi-value">{String(ind?.esgObjectives ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Incidentes</span><span className="kpi-value">{incidents.length}</span></div>
      </div>
      <section className="card"><h3>Indicadores ({indicators.length})</h3></section>
    </>
  );
}

export function EaccEvidencesPage() {
  const [evidences, setEvidences] = useState<unknown[]>([]);
  const [documents, setDocuments] = useState<unknown[]>([]);
  useEffect(() => {
    listEaccEvidences().then(setEvidences);
    listEaccDocuments().then(setDocuments);
  }, []);

  return (
    <>
      <Header title="Administrador de Evidencias" actions={EACC_LINKS} />
      <section className="card"><h3>Evidencias ({evidences.length})</h3></section>
      <section className="card"><h3>Documentos vinculados ({documents.length})</h3></section>
    </>
  );
}

export function EaccFindingsPage() {
  const [findings, setFindings] = useState<unknown[]>([]);
  useEffect(() => { listEaccFindings().then(setFindings); }, []);

  return (
    <>
      <Header title="Panel de Hallazgos" actions={EACC_LINKS} />
      <section className="card"><h3>Hallazgos abiertos ({findings.length})</h3></section>
    </>
  );
}
