import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

function downloadPdf(fileName: string, pdfBase64: string) {
  const a = document.createElement('a');
  a.href = `data:application/pdf;base64,${pdfBase64}`;
  a.download = fileName;
  a.click();
}

function fmt(v: unknown) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v ?? 0));
}

export function PortalDocumentsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/portal').then(({ getPortalDocumentsCenter }) => getPortalDocumentsCenter().then(setCenter));
  }, []);

  return (
    <>
      <Header title="Centro de documentos" subtitle="Nómina, certificados y expediente personal" actions={
        <div className="row-actions">
          <Link to="/portal/nomina/desprendibles" className="btn">Desprendibles</Link>
          <Link to="/portal/nomina/historial" className="btn">Historial salarial</Link>
          <Link to="/portal/nomina/aportes" className="btn">Aportes</Link>
          <Link to="/portal/documentos/certificados" className="btn">Certificados</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Desprendibles</span><span className="kpi-value">{String(center.payslipCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Certificados</span><span className="kpi-value">{String(center.certificateCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Documentos personales</span><span className="kpi-value">{String(center.personalDocumentCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Contratos</span><span className="kpi-value">{String(center.contractCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Offline</span><span className="kpi-value">{String(center.offlineCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function PortalPayslipsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [periodCode, setPeriodCode] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = () => {
    import('../api/portal').then(({ listPortalPayslips }) => {
      listPortalPayslips({
        periodCode: periodCode || undefined,
        periodFrom: periodFrom || undefined,
        periodTo: periodTo || undefined,
      }).then(setRows as never);
    });
  };

  useEffect(() => { reload(); }, []);

  const toggle = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  return (
    <>
      <Header title="Centro de desprendibles" subtitle="Consulta, vista previa y descarga PDF" actions={
        <div className="row-actions">
          <Link to="/portal/documentos" className="btn">Documentos</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      {message ? <section className="panel"><p>{message}</p></section> : null}
      <section className="panel">
        <div className="row-actions">
          <input className="input" placeholder="Período exacto (YYYY-MM)" value={periodCode} onChange={(e) => setPeriodCode(e.target.value)} />
          <input className="input" placeholder="Desde" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
          <input className="input" placeholder="Hasta" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
          <button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalPayslipsBulk }) =>
            downloadPortalPayslipsBulk(selected).then((r) => {
              const files = (r.files ?? []) as Array<Record<string, unknown>>;
              files.forEach((f) => downloadPdf(String(f.fileName), String(f.pdfBase64)));
              setMessage(`Descargados ${files.length} PDF`);
            }))} disabled={!selected.length}>Descarga múltiple</button>
        </div>
      </section>
      <section className="panel"><h3>Desprendibles ({rows.length})</h3>
        <table className="data-table">
          <thead><tr><th></th><th>Período</th><th>Neto</th><th>Devengado</th><th>Deducciones</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={String(p.payslipKey)}>
              <td><input type="checkbox" checked={selected.includes(String(p.payslipKey))} onChange={() => toggle(String(p.payslipKey))} /></td>
              <td>{String(p.periodCode)}</td>
              <td>{fmt(p.netPay)}</td>
              <td>{fmt(p.totalEarnings)}</td>
              <td>{fmt(p.totalDeductions)}</td>
              <td>{String(p.status)}</td>
              <td>
                <div className="row-actions">
                  <button className="btn" onClick={() => import('../api/portal').then(({ previewPortalPayslip }) => previewPortalPayslip(String(p.payslipKey)).then(setPreview))}>Vista previa</button>
                  <button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalPayslip }) => downloadPortalPayslip(String(p.payslipKey)).then((d) => {
                    downloadPdf(String(d.fileName), String(d.pdfBase64));
                    return import('../api/portal').then(({ savePortalOfflineDoc }) => savePortalOfflineDoc({
                      sourceType: 'payslip', sourceKey: String(p.payslipKey), title: `Desprendible ${String(p.periodCode)}`,
                      fileName: String(d.fileName), pdfBase64: String(d.pdfBase64), periodCode: String(p.periodCode),
                    }));
                  }))}>PDF</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      {preview ? (
        <section className="panel"><h3>Vista previa {String(preview.payslipKey)}</h3>
          <p>Período {String(preview.periodCode)} · Neto {fmt(preview.netPay)}</p>
          <table className="data-table">
            <thead><tr><th>Concepto</th><th>Tipo</th><th>Monto</th></tr></thead>
            <tbody>{((preview.lines ?? []) as Array<Record<string, unknown>>).map((l) => (
              <tr key={String(l.lineKey)}><td>{String(l.conceptName)}</td><td>{String(l.kind)}</td><td>{fmt(l.amount)}</td></tr>
            ))}</tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}

export function PortalSalaryHistoryPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/portal').then(({ getPortalSalaryHistory }) => getPortalSalaryHistory().then(setData));
  }, []);
  const events = (data?.events ?? []) as Array<Record<string, unknown>>;
  const contracts = (data?.contracts ?? []) as Array<Record<string, unknown>>;
  const trend = (data?.payslipTrend ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Consulta salarial" subtitle="Cambios salariales, cargo, fechas y motivos" actions={
        <div className="row-actions">
          <Link to="/portal/documentos" className="btn">Documentos</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      <section className="panel"><h3>Historial de cambios</h3>
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Evento</th><th>Cargo</th><th>Salario</th><th>Motivo</th></tr></thead>
          <tbody>{events.map((e) => (
            <tr key={String(e.historyKey)}>
              <td>{String(e.effectiveDate).slice(0, 10)}</td>
              <td>{String(e.eventType)}</td>
              <td>{String(e.positionKey ?? '—')}</td>
              <td>{e.salary != null ? fmt(e.salary) : '—'}</td>
              <td>{String(e.reason ?? '—')}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Contratos</h3>
        <table className="data-table">
          <thead><tr><th>Contrato</th><th>Tipo</th><th>Cargo</th><th>Salario</th><th>Desde</th><th>Estado</th></tr></thead>
          <tbody>{contracts.map((c) => (
            <tr key={String(c.contractKey)}>
              <td>{String(c.contractKey)}</td>
              <td>{String(c.contractType)}</td>
              <td>{String(c.positionKey ?? '—')}</td>
              <td>{c.salary != null ? fmt(c.salary) : '—'}</td>
              <td>{String(c.startDate).slice(0, 10)}</td>
              <td>{String(c.status)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Tendencia por desprendible</h3>
        <table className="data-table">
          <thead><tr><th>Período</th><th>Base</th><th>Neto</th></tr></thead>
          <tbody>{trend.map((t) => (
            <tr key={String(t.payslipKey)}><td>{String(t.periodCode)}</td><td>{fmt(t.baseSalary)}</td><td>{fmt(t.netPay)}</td></tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function PortalContributionsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [periodCode, setPeriodCode] = useState('');
  const reload = () => {
    import('../api/portal').then(({ getPortalContributions }) =>
      getPortalContributions({ periodCode: periodCode || undefined }).then(setData));
  };
  useEffect(() => { reload(); }, []);
  const groups = (data?.groups ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Consulta de aportes" subtitle="Salud, pensión, ARL, caja y parafiscales" actions={
        <div className="row-actions">
          <Link to="/portal/documentos" className="btn">Documentos</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      <section className="panel">
        <div className="row-actions">
          <input className="input" placeholder="Período" value={periodCode} onChange={(e) => setPeriodCode(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
        </div>
      </section>
      {groups.map((g) => {
        const items = (g.items ?? []) as Array<Record<string, unknown>>;
        return (
          <section className="panel" key={String(g.category)}>
            <h3>{String(g.category)} — {fmt(g.total)}</h3>
            <table className="data-table">
              <thead><tr><th>Concepto</th><th>Período</th><th>Tipo</th><th>Monto</th></tr></thead>
              <tbody>{items.map((i, idx) => (
                <tr key={idx}><td>{String(i.conceptName)}</td><td>{String(i.periodCode)}</td><td>{String(i.kind)}</td><td>{fmt(i.amount)}</td></tr>
              ))}</tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}

export function PortalPersonalDocsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [certs, setCerts] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/portal').then(({ getPortalPersonalDocuments, listPortalAllCertificates }) => {
      getPortalPersonalDocuments().then(setData);
      listPortalAllCertificates().then(setCerts);
    });
  }, []);
  const documents = (data?.documents ?? []) as Array<Record<string, unknown>>;
  const contracts = (data?.contracts ?? []) as Array<Record<string, unknown>>;
  const evaluations = (data?.signedEvaluations ?? []) as Array<Record<string, unknown>>;
  const portalCerts = (certs?.portal ?? []) as Array<Record<string, unknown>>;
  const payrollCerts = (certs?.payroll ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Documentos personales" subtitle="Contratos, evaluaciones, expediente y certificados" actions={
        <div className="row-actions">
          <Link to="/portal/documentos" className="btn">Centro</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      <section className="panel"><h3>Expediente ({documents.length})</h3>
        <table className="data-table">
          <thead><tr><th>Título</th><th>Tipo</th><th>Versión</th><th>Descarga</th></tr></thead>
          <tbody>{documents.map((d) => (
            <tr key={String(d.documentKey)}>
              <td>{String(d.title)}</td>
              <td>{String(d.documentType)}</td>
              <td>{String(d.currentVersion)}</td>
              <td><button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalPersonalDocument }) =>
                downloadPortalPersonalDocument(String(d.documentKey)).then((f) => downloadPdf(String(f.fileName), String(f.pdfBase64))))}>PDF</button></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Contratos / Otrosí ({contracts.length})</h3>
        <table className="data-table">
          <thead><tr><th>Contrato</th><th>Tipo</th><th>Renovaciones</th><th>Estado</th></tr></thead>
          <tbody>{contracts.map((c) => (
            <tr key={String(c.contractKey)}>
              <td>{String(c.contractKey)}</td>
              <td>{String(c.contractType)}</td>
              <td>{((c.renewals ?? []) as unknown[]).length}</td>
              <td>{String(c.status)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Evaluaciones firmadas ({evaluations.length})</h3>
        <table className="data-table">
          <thead><tr><th>Evaluación</th><th>Tipo</th><th>Calificación</th><th>Fecha</th></tr></thead>
          <tbody>{evaluations.map((e) => (
            <tr key={String(e.evaluationKey)}>
              <td>{String(e.evaluationKey)}</td>
              <td>{String(e.evaluationType)}</td>
              <td>{e.overallScore != null ? String(e.overallScore) : '—'}</td>
              <td>{e.completedAt ? String(e.completedAt).slice(0, 10) : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Certificados</h3>
        <table className="data-table">
          <thead><tr><th>Origen</th><th>Título</th><th>Tipo</th><th>PDF</th></tr></thead>
          <tbody>
            {portalCerts.map((c) => (
              <tr key={`p-${String(c.certificateKey)}`}>
                <td>Portal</td><td>{String(c.title)}</td><td>{String(c.certificateType)}</td>
                <td><button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalDocCertificate }) =>
                  downloadPortalDocCertificate(String(c.certificateKey), 'portal').then((f) => downloadPdf(String(f.fileName), String(f.pdfBase64))))}>PDF</button></td>
              </tr>
            ))}
            {payrollCerts.map((c) => (
              <tr key={`n-${String(c.documentKey)}`}>
                <td>Nómina</td><td>{String(c.title)}</td><td>{String(c.documentType)}</td>
                <td><button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalDocCertificate }) =>
                  downloadPortalDocCertificate(String(c.documentKey), 'payroll').then((f) => downloadPdf(String(f.fileName), String(f.pdfBase64))))}>PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
