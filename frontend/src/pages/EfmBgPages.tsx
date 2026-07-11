import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function EfmBgCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-bg').then(({ getEfmBgCenter }) => getEfmBgCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Centro de Presupuestos"
        subtitle="Planificación, control y validación presupuestal"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm-bg').then(({ seedEfmBg }) => seedEfmBg().then(reload))}>Cargar configuración inicial</button>
            <Link to="/finanzas/presupuestos/centros-costo" className="btn">Centros de costo</Link>
            <Link to="/finanzas/presupuestos/ejecucion" className="btn">Ejecución</Link>
            <Link to="/finanzas/presupuestos/comparativos" className="btn">Comparativos</Link>
            <Link to="/finanzas/presupuestos/dashboard" className="btn">Dashboard</Link>
            <Link to="/finanzas/presupuestos/alertas" className="btn">Alertas</Link>
            <Link to="/finanzas" className="btn">EFM</Link>
          </div>
        }
      />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Presupuesto activo</span><span className="kpi-value">{Number(center.totalBudgetAmount ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Presupuestos</span><span className="kpi-value">{String(center.budgetCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(center.activeBudgets ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Comprometido</span><span className="kpi-value">{Number(center.totalCommitted ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ejecutado</span><span className="kpi-value">{Number(center.totalExecuted ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(center.compliancePct ?? 0)}%</span></div>
          <div className="kpi-card"><span className="kpi-label">Excepciones pend.</span><span className="kpi-value">{String(center.pendingExceptions ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Alertas</span><span className="kpi-value">{String(center.openAlerts ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function EfmBgCostCentersPage() {
  const [hierarchy, setHierarchy] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-bg').then(({ getEfmBgHierarchy }) => getEfmBgHierarchy().then(setHierarchy as never));
  }, []);
  const costCenters = (hierarchy?.costCenters ?? []) as Array<Record<string, unknown>>;
  const nodes = (hierarchy?.dimensionNodes ?? []) as Array<Record<string, unknown>>;
  const projects = (hierarchy?.projects ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Administrador de centros de costo" subtitle="Jerarquías, proyectos y unidades de negocio" actions={<Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>} />
      <section className="panel">
        <h3>Centros de costo ({costCenters.length})</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Empresa</th><th>Padre</th></tr></thead>
          <tbody>
            {costCenters.map((c) => (
              <tr key={String(c.costCenterKey)}>
                <td>{String(c.code)}</td>
                <td>{String(c.name)}</td>
                <td>{String(c.companyKey ?? '')}</td>
                <td>{String(c.parentKey ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Dimensiones ({nodes.length})</h3>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Código</th><th>Nombre</th><th>Padre</th></tr></thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={String(n.nodeKey)}>
                <td>{String(n.dimensionType)}</td>
                <td>{String(n.code)}</td>
                <td>{String(n.name)}</td>
                <td>{String(n.parentKey ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Proyectos ({projects.length})</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Centro costo</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={String(p.projectKey)}>
                <td>{String(p.code)}</td>
                <td>{String(p.name)}</td>
                <td>{String(p.costCenterKey ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmBgExecutionPage() {
  const [budgets, setBudgets] = useState<Array<Record<string, unknown>>>([]);
  const [commitments, setCommitments] = useState<Array<Record<string, unknown>>>([]);
  const [executions, setExecutions] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-bg').then(({ listEfmBgBudgets, listEfmBgCommitments, listEfmBgExecutions }) => {
      listEfmBgBudgets({ status: 'active' }).then((r) => setBudgets(r as Array<Record<string, unknown>>));
      listEfmBgCommitments().then((r) => setCommitments(r as Array<Record<string, unknown>>));
      listEfmBgExecutions().then((r) => setExecutions(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Panel de ejecución" subtitle="Compromisos, obligaciones y ejecución" actions={<Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>} />
      <section className="panel">
        <h3>Presupuestos activos</h3>
        <table className="data-table">
          <thead><tr><th>Presupuesto</th><th>Nombre</th><th>Año</th><th>Escenario</th><th>Monto</th><th>Estado</th></tr></thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={String(b.budgetKey)}>
                <td>{String(b.budgetKey)}</td>
                <td>{String(b.name)}</td>
                <td>{String(b.fiscalYear)}</td>
                <td>{String(b.scenario)}</td>
                <td>{Number(b.totalAmount ?? 0).toLocaleString()}</td>
                <td>{String(b.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Compromisos recientes</h3>
        <table className="data-table">
          <thead><tr><th>Compromiso</th><th>Período</th><th>Cuenta</th><th>Monto</th><th>Origen</th></tr></thead>
          <tbody>
            {commitments.slice(0, 50).map((c) => (
              <tr key={String(c.commitmentKey)}>
                <td>{String(c.commitmentKey)}</td>
                <td>{String(c.periodKey)}</td>
                <td>{String(c.accountKey)}</td>
                <td>{Number(c.amount ?? 0).toLocaleString()}</td>
                <td>{String(c.sourceDocumentKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Ejecución</h3>
        <table className="data-table">
          <thead><tr><th>Ejecución</th><th>Período</th><th>Monto</th><th>Contabilidad</th></tr></thead>
          <tbody>
            {executions.slice(0, 50).map((e) => (
              <tr key={String(e.executionKey)}>
                <td>{String(e.executionKey)}</td>
                <td>{String(e.periodKey)}</td>
                <td>{Number(e.amount ?? 0).toLocaleString()}</td>
                <td>{String(e.accountingRef ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmBgComparativesPage() {
  const [budgetKey, setBudgetKey] = useState('');
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [byCc, setByCc] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-bg').then(({ listEfmBgBudgets }) =>
      listEfmBgBudgets({ status: 'active' }).then((rows) => {
        const list = rows as Array<Record<string, unknown>>;
        if (list[0]) {
          const key = String(list[0].budgetKey);
          setBudgetKey(key);
          import('../api/efm-bg').then(({ getEfmBgBudgetVsExecuted, getEfmBgByCostCenter }) => {
            getEfmBgBudgetVsExecuted(key).then(setReport as never);
            getEfmBgByCostCenter(key).then((r) => setByCc(r as Array<Record<string, unknown>>));
          });
        }
      }));
  }, []);
  const lines = (report?.lines ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Comparativos presupuestales" subtitle="Presupuesto vs ejecutado y variaciones" actions={<Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>} />
      <section className="panel">
        <div>Presupuesto: {budgetKey} · Total presupuesto: {Number((report?.totals as Record<string, unknown>)?.budget ?? 0).toLocaleString()} · Ejecutado: {Number((report?.totals as Record<string, unknown>)?.executed ?? 0).toLocaleString()}</div>
        <table className="data-table">
          <thead><tr><th>Período</th><th>Cuenta</th><th>Presupuesto</th><th>Ejecutado</th><th>Variación</th><th>Cumplimiento</th></tr></thead>
          <tbody>
            {lines.slice(0, 100).map((l) => (
              <tr key={String(l.lineKey)}>
                <td>{String(l.periodKey)}</td>
                <td>{String(l.accountKey)}</td>
                <td>{Number(l.budget ?? 0).toLocaleString()}</td>
                <td>{Number(l.executed ?? 0).toLocaleString()}</td>
                <td>{Number(l.variance ?? 0).toLocaleString()}</td>
                <td>{String(l.compliancePct ?? 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Por centro de costo</h3>
        <table className="data-table">
          <thead><tr><th>Centro</th><th>Presupuesto</th><th>Ejecutado</th><th>Variación</th></tr></thead>
          <tbody>
            {byCc.map((r) => (
              <tr key={String(r.costCenterKey)}>
                <td>{String(r.costCenterKey)}</td>
                <td>{Number(r.budget ?? 0).toLocaleString()}</td>
                <td>{Number(r.executed ?? 0).toLocaleString()}</td>
                <td>{Number(r.variance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmBgDashboardPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [projection, setProjection] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-bg').then(async ({ getEfmBgCenter, listEfmBgBudgets, getEfmBgClosingProjection }) => {
      const c = await getEfmBgCenter();
      setCenter(c);
      const budgets = await listEfmBgBudgets({ status: 'active' });
      const list = budgets as Array<Record<string, unknown>>;
      if (list[0]) getEfmBgClosingProjection(String(list[0].budgetKey)).then(setProjection as never);
    });
  }, []);
  return (
    <>
      <Header title="Dashboard financiero" subtitle="Indicadores y proyección de cierre" actions={<Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Ejecutado YTD</span><span className="kpi-value">{Number(center?.totalExecuted ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(center?.compliancePct ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Proyección cierre</span><span className="kpi-value">{Number((projection?.projection as Record<string, unknown>)?.projectedExecution ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Variación proj.</span><span className="kpi-value">{Number((projection?.projection as Record<string, unknown>)?.projectedVariance ?? 0).toLocaleString()}</span></div>
      </div>
    </>
  );
}

export function EfmBgAlertsPage() {
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-bg').then(({ listEfmBgAlerts }) =>
      listEfmBgAlerts(false).then((r) => setAlerts(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Alertas presupuestales" subtitle="Sobre-ejecución y umbrales" actions={<Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Alerta</th><th>Tipo</th><th>Severidad</th><th>Presupuesto</th><th>Período</th><th>Mensaje</th></tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={String(a.alertKey)} style={String(a.severity) === 'critical' ? { color: 'crimson' } : undefined}>
              <td>{String(a.alertKey)}</td>
              <td>{String(a.alertType)}</td>
              <td>{String(a.severity)}</td>
              <td>{String(a.budgetKey ?? '')}</td>
              <td>{String(a.periodKey ?? '')}</td>
              <td>{String(a.message)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
