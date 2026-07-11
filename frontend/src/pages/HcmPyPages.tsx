import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

function fmtMoney(v: unknown) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export function HcmPyCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm-py').then(({ getHcmPyCenter }) => getHcmPyCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de nómina" subtitle="Motor de nómina, prestaciones y beneficios" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hcm-py').then(({ seedHcmPy }) => seedHcmPy().then(reload))}>Cargar configuración inicial</button>
          <Link to="/rrhh/nomina/conceptos" className="btn">Conceptos</Link>
          <Link to="/rrhh/nomina/liquidaciones" className="btn">Liquidaciones</Link>
          <Link to="/rrhh/nomina/beneficios" className="btn">Beneficios</Link>
          <Link to="/rrhh/nomina/historial" className="btn">Historial</Link>
          <Link to="/rrhh/nomina/dashboard" className="btn">Dashboard</Link>
          <Link to="/rrhh" className="btn">Personal</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Configuraciones</span><span className="kpi-value">{String(center.configCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Conceptos</span><span className="kpi-value">{String(center.conceptCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Fondos</span><span className="kpi-value">{String(center.fundCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Períodos</span><span className="kpi-value">{String(center.periodCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Procesos</span><span className="kpi-value">{String(center.runCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Desprendibles</span><span className="kpi-value">{String(center.payslipCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Pendientes aprobación</span><span className="kpi-value">{String(center.pendingRuns ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Beneficios activos</span><span className="kpi-value">{String(center.benefitCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmPyConceptsPage() {
  const [concepts, setConcepts] = useState<Array<Record<string, unknown>>>([]);
  const [funds, setFunds] = useState<Array<Record<string, unknown>>>([]);
  const [configs, setConfigs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-py').then(({ listHcmPyConcepts, listHcmPyFunds, listHcmPyConfigs }) => {
      listHcmPyConcepts().then(setConcepts as never);
      listHcmPyFunds().then(setFunds as never);
      listHcmPyConfigs().then(setConfigs as never);
    });
  }, []);

  return (
    <>
      <Header title="Administrador de conceptos" subtitle="Conceptos salariales, deducciones, fondos y configuración" actions={<Link to="/rrhh/nomina" className="btn">Nómina</Link>} />
      <section className="panel"><h3>Configuraciones ({configs.length})</h3>
        <table className="data-table"><thead><tr><th>Empresa</th><th>Nombre</th><th>Periodicidad</th><th>SMMLV</th><th>Transporte</th></tr></thead>
          <tbody>{configs.map((c) => <tr key={String(c.configKey)}><td>{String(c.companyKey)}</td><td>{String(c.name)}</td><td>{String(c.periodicity)}</td><td>{fmtMoney(c.smmlv)}</td><td>{fmtMoney(c.transportAllowance)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Conceptos ({concepts.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Categoría</th><th>Tasa</th></tr></thead>
          <tbody>{concepts.map((c) => <tr key={String(c.conceptKey)}><td>{String(c.code)}</td><td>{String(c.name)}</td><td>{String(c.kind)}</td><td>{String(c.category)}</td><td>{c.rate ? `${Number(c.rate) * 100}%` : '—'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Fondos / Seguridad social ({funds.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Empleado</th><th>Empleador</th></tr></thead>
          <tbody>{funds.map((f) => <tr key={String(f.fundKey)}><td>{String(f.code)}</td><td>{String(f.name)}</td><td>{String(f.fundType)}</td><td>{Number(f.employeeRate) * 100}%</td><td>{Number(f.employerRate) * 100}%</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmPySettlementsPage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [periods, setPeriods] = useState<Array<Record<string, unknown>>>([]);
  const [payslips, setPayslips] = useState<Array<Record<string, unknown>>>([]);
  const [settlements, setSettlements] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-py').then(({ listHcmPyRuns, listHcmPyPeriods, listHcmPyPayslips, listHcmPySettlements }) => {
      listHcmPyRuns().then(setRuns as never);
      listHcmPyPeriods().then(setPeriods as never);
      listHcmPyPayslips().then(setPayslips as never);
      listHcmPySettlements().then(setSettlements as never);
    });
  }, []);

  return (
    <>
      <Header title="Gestor de liquidaciones" subtitle="Procesos de nómina, desprendibles y liquidaciones finales" actions={<Link to="/rrhh/nomina" className="btn">Nómina</Link>} />
      <section className="panel"><h3>Períodos ({periods.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Empresa</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead>
          <tbody>{periods.map((p) => <tr key={String(p.periodKey)}><td>{String(p.periodCode)}</td><td>{String(p.companyKey)}</td><td>{String(p.startDate).slice(0, 10)}</td><td>{String(p.endDate).slice(0, 10)}</td><td>{String(p.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Procesos de nómina ({runs.length})</h3>
        <table className="data-table"><thead><tr><th>Proceso</th><th>Período</th><th>Empleados</th><th>Neto total</th><th>Estado</th></tr></thead>
          <tbody>{runs.map((r) => <tr key={String(r.runKey)}><td>{String(r.runKey)}</td><td>{String(r.periodKey)}</td><td>{String(r.employeeCount)}</td><td>{fmtMoney(r.totalNet)}</td><td>{String(r.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Desprendibles ({payslips.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Período</th><th>Devengado</th><th>Deducciones</th><th>Neto</th><th>Estado</th></tr></thead>
          <tbody>{payslips.map((p) => <tr key={String(p.payslipKey)}><td>{String(p.employeeKey)}</td><td>{String(p.periodCode)}</td><td>{fmtMoney(p.totalEarnings)}</td><td>{fmtMoney(p.totalDeductions)}</td><td>{fmtMoney(p.netPay)}</td><td>{String(p.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Liquidaciones finales ({settlements.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Retiro</th><th>Neto</th><th>Estado</th></tr></thead>
          <tbody>{settlements.map((s) => <tr key={String(s.settlementKey)}><td>{String(s.employeeKey)}</td><td>{String(s.settlementType)}</td><td>{String(s.terminationDate).slice(0, 10)}</td><td>{fmtMoney(s.totalNet)}</td><td>{String(s.status)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmPyBenefitsPage() {
  const [benefits, setBenefits] = useState<Array<Record<string, unknown>>>([]);
  const [provisions, setProvisions] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-py').then(({ listHcmPyBenefits, listHcmPyProvisions }) => {
      listHcmPyBenefits().then(setBenefits as never);
      listHcmPyProvisions().then(setProvisions as never);
    });
  }, []);

  return (
    <>
      <Header title="Panel de beneficios" subtitle="Bonos, incentivos, bienestar y prestaciones sociales" actions={<Link to="/rrhh/nomina" className="btn">Nómina</Link>} />
      <section className="panel"><h3>Beneficios ({benefits.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Nombre</th><th>Monto</th><th>Desde</th></tr></thead>
          <tbody>{benefits.map((b) => <tr key={String(b.benefitKey)}><td>{String(b.employeeKey)}</td><td>{String(b.benefitType)}</td><td>{String(b.name)}</td><td>{fmtMoney(b.amount)}</td><td>{String(b.startDate).slice(0, 10)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Prestaciones sociales ({provisions.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Período</th><th>Base</th><th>Provisión</th><th>Saldo</th></tr></thead>
          <tbody>{provisions.map((p) => <tr key={String(p.provisionKey)}><td>{String(p.employeeKey)}</td><td>{String(p.provisionType)}</td><td>{String(p.periodCode)}</td><td>{fmtMoney(p.baseAmount)}</td><td>{fmtMoney(p.provisionAmount)}</td><td>{fmtMoney(p.balance)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmPyHistoryPage() {
  const [employeeKey, setEmployeeKey] = useState('');
  const [history, setHistory] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    import('../api/hcm-py').then(({ listHcmPyDocuments }) => listHcmPyDocuments().then(setDocuments as never));
  }, []);

  const loadHistory = () => {
    if (!employeeKey.trim()) return;
    import('../api/hcm-py').then(({ getHcmPySalaryHistory }) => getHcmPySalaryHistory(employeeKey.trim()).then(setHistory));
  };

  const payslips = (history?.payslips ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Historial salarial" subtitle="Desprendibles, certificados y evolución salarial" actions={<Link to="/rrhh/nomina" className="btn">Nómina</Link>} />
      <section className="panel">
        <div className="row-actions">
          <input className="input" placeholder="Clave empleado" value={employeeKey} onChange={(e) => setEmployeeKey(e.target.value)} />
          <button className="btn" onClick={loadHistory}>Consultar</button>
        </div>
      </section>
      {history ? (
        <section className="panel"><h3>Desprendibles ({payslips.length})</h3>
          <table className="data-table"><thead><tr><th>Período</th><th>Devengado</th><th>Deducciones</th><th>Neto</th><th>Estado</th></tr></thead>
            <tbody>{payslips.map((p) => <tr key={String(p.payslipKey)}><td>{String(p.periodCode)}</td><td>{fmtMoney(p.totalEarnings)}</td><td>{fmtMoney(p.totalDeductions)}</td><td>{fmtMoney(p.netPay)}</td><td>{String(p.status)}</td></tr>)}</tbody>
          </table>
        </section>
      ) : null}
      <section className="panel"><h3>Documentos ({documents.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Título</th><th>Período</th><th>Emitido</th></tr></thead>
          <tbody>{documents.map((d) => <tr key={String(d.documentKey)}><td>{String(d.employeeKey)}</td><td>{String(d.documentType)}</td><td>{String(d.title)}</td><td>{String(d.periodCode ?? '—')}</td><td>{String(d.issuedAt).slice(0, 10)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmPyDashboardPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { import('../api/hcm-py').then(({ getHcmPyDashboard }) => getHcmPyDashboard().then(setDashboard)); }, []);

  const byStatus = (dashboard?.byStatus ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard de nómina" subtitle="Procesos, prestaciones y métricas operativas" actions={<Link to="/rrhh/nomina" className="btn">Nómina</Link>} />
      <section className="panel"><h3>Procesos por estado</h3>
        <table className="data-table"><thead><tr><th>Estado</th><th>Cantidad</th><th>Neto acumulado</th></tr></thead>
          <tbody>{byStatus.map((s, i) => <tr key={i}><td>{String(s.status)}</td><td>{String((s._count as Record<string, unknown>)?.id ?? 0)}</td><td>{fmtMoney((s._sum as Record<string, unknown>)?.totalNet)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
