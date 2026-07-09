import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

const PERIOD_KEY = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

export function EfmFoCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-fo').then(({ getEfmFoCenter }) => getEfmFoCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Centro de Operaciones Financieras"
        subtitle="Estados financieros, cierres, KPIs y analítica"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm-fo').then(({ seedEfmFo }) => seedEfmFo().then(reload))}>Sembrar FOC</button>
            <Link to="/finanzas/foc/estados" className="btn">Estados financieros</Link>
            <Link to="/finanzas/foc/cierres" className="btn">Cierres</Link>
            <Link to="/finanzas/foc/kpis" className="btn">Indicadores</Link>
            <Link to="/finanzas/foc/analitica" className="btn">Analítica</Link>
            <Link to="/finanzas/foc/reportes" className="btn">Reportes</Link>
            <Link to="/finanzas/foc/dashboard" className="btn">Dashboard ejecutivo</Link>
            <Link to="/finanzas/foc/alertas" className="btn">Alertas</Link>
            <Link to="/finanzas/foc/ia" className="btn">IA financiera</Link>
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Estados generados</span><span className="kpi-value">{String(center.statementCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cierres</span><span className="kpi-value">{String(center.closingRuns ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cierres activos</span><span className="kpi-value">{String(center.activeClosings ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">KPIs período</span><span className="kpi-value">{String(center.kpiSnapshots ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Alertas abiertas</span><span className="kpi-value">{String(center.openAlerts ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Insights IA</span><span className="kpi-value">{String(center.aiInsights ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Reportes custom</span><span className="kpi-value">{String(center.customReports ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Período</span><span className="kpi-value">{String(center.periodKey ?? PERIOD_KEY)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function EfmFoStatementsPage() {
  const [statements, setStatements] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-fo').then(({ listEfmFoStatements }) =>
    listEfmFoStatements({ periodKey: PERIOD_KEY }).then((r) => setStatements(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, []);

  const generate = (statementType: string) => {
    import('../api/efm-fo').then(({ generateEfmFoStatement }) =>
      generateEfmFoStatement({ statementType, periodKey: PERIOD_KEY }).then(reload));
  };

  return (
    <>
      <Header
        title="Estados financieros"
        subtitle="Balance, resultados, flujo de efectivo y patrimonio"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => generate('balance_sheet')}>Balance</button>
            <button className="btn" onClick={() => generate('income_statement')}>Resultados</button>
            <button className="btn" onClick={() => generate('cash_flow')}>Flujo efectivo</button>
            <button className="btn" onClick={() => generate('equity_changes')}>Patrimonio</button>
            <button className="btn" onClick={() => generate('consolidated')}>Consolidado</button>
            <Link to="/finanzas/foc" className="btn">FOC</Link>
          </div>
        }
      />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Estado</th><th>Tipo</th><th>Período</th><th>Activos</th><th>Pasivos</th><th>Utilidad</th><th>Acción</th></tr></thead>
          <tbody>
            {statements.map((s) => (
              <tr key={String(s.statementKey)}>
                <td>{String(s.statementKey)}</td>
                <td>{String(s.statementType)}</td>
                <td>{String(s.periodKey)}</td>
                <td>{Number(s.totalAssets ?? 0).toLocaleString()}</td>
                <td>{Number(s.totalLiabilities ?? 0).toLocaleString()}</td>
                <td>{Number(s.netIncome ?? 0).toLocaleString()}</td>
                <td><button className="btn btn-sm" onClick={() => setSelected(s)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected ? (
        <section className="panel">
          <h3>{String(selected.statementKey)} — {String(selected.statementType)}</h3>
          <table className="data-table">
            <thead><tr><th>Sección</th><th>Código</th><th>Línea</th><th>Monto</th><th>Comparativo</th><th>Variación</th></tr></thead>
            <tbody>
              {((selected.lines ?? []) as Array<Record<string, unknown>>).map((l) => (
                <tr key={String(l.lineKey)}>
                  <td>{String(l.sectionKey)}</td>
                  <td>{String(l.lineCode)}</td>
                  <td>{String(l.lineName)}</td>
                  <td>{Number(l.amount ?? 0).toLocaleString()}</td>
                  <td>{l.compareAmount != null ? Number(l.compareAmount).toLocaleString() : '—'}</td>
                  <td>{l.variance != null ? Number(l.variance).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Notas</h4>
          <ul>
            {((selected.notes ?? []) as Array<Record<string, unknown>>).map((n) => (
              <li key={String(n.noteKey)}><strong>{String(n.title)}</strong>: {String(n.content)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export function EfmFoClosingPage() {
  const [closings, setClosings] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm-fo').then(({ listEfmFoClosings }) =>
    listEfmFoClosings().then((r) => setClosings(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, []);

  const start = () => {
    import('../api/efm-fo').then(({ startEfmFoClosing }) =>
      startEfmFoClosing({ periodKey: PERIOD_KEY, closingType: 'monthly' }).then(reload));
  };

  return (
    <>
      <Header title="Centro de cierres" subtitle="Cierre mensual, trimestral y anual" actions={
        <div className="row-actions">
          <button className="btn" onClick={start}>Iniciar cierre</button>
          <Link to="/finanzas/foc" className="btn">FOC</Link>
        </div>
      } />
      <table className="data-table panel">
        <thead><tr><th>Cierre</th><th>Tipo</th><th>Período</th><th>Estado</th><th>Validación</th><th>Inicio</th><th>Fin</th></tr></thead>
        <tbody>
          {closings.map((c) => (
            <tr key={String(c.closingKey)}>
              <td>{String(c.closingKey)}</td>
              <td>{String(c.closingType)}</td>
              <td>{String(c.periodKey)}</td>
              <td>{String(c.status)}</td>
              <td>{c.validationPassed ? 'Aprobada' : 'Pendiente'}</td>
              <td>{c.startedAt ? String(c.startedAt).slice(0, 10) : '—'}</td>
              <td>{c.completedAt ? String(c.completedAt).slice(0, 10) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {closings[0] ? (
        <section className="panel">
          <h3>Checklist — {String(closings[0].closingKey)}</h3>
          <table className="data-table">
            <thead><tr><th>Ítem</th><th>Estado</th><th>Resultado</th></tr></thead>
            <tbody>
              {((closings[0].checklists ?? []) as Array<Record<string, unknown>>).map((ch) => (
                <tr key={String(ch.checklistKey)} style={String(ch.status) === 'failed' ? { color: 'crimson' } : undefined}>
                  <td>{String(ch.itemName)}</td>
                  <td>{String(ch.status)}</td>
                  <td>{String(ch.resultMessage ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Bitácora</h4>
          <ul>
            {((closings[0].logs ?? []) as Array<Record<string, unknown>>).map((log) => (
              <li key={String(log.logKey)}>{String(log.createdAt).slice(0, 19)} — {String(log.action)}: {String(log.message)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export function EfmFoKpiPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-fo').then(({ getEfmFoKpiDashboard, calculateEfmFoKpis }) =>
    calculateEfmFoKpis(PERIOD_KEY).then(() => getEfmFoKpiDashboard(PERIOD_KEY).then(setDashboard as never)));
  useEffect(() => { reload(); }, []);

  const categories = (dashboard?.categories ?? []) as Array<{ category: string; items: Array<Record<string, unknown>> }>;

  return (
    <>
      <Header title="Panel de indicadores" subtitle="Liquidez, rentabilidad, rotación y presupuesto" actions={
        <div className="row-actions">
          <button className="btn" onClick={reload}>Recalcular</button>
          <Link to="/finanzas/foc" className="btn">FOC</Link>
        </div>
      } />
      {categories.map((cat) => (
        <section className="panel" key={cat.category}>
          <h3>{cat.category}</h3>
          <div className="kpi-grid">
            {cat.items.map((k) => (
              <div className="kpi-card" key={String(k.kpiCode)}>
                <span className="kpi-label">{String(k.kpiName)}</span>
                <span className="kpi-value">{Number(k.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {String(k.unit)}</span>
                {k.target != null ? <span className="kpi-meta">Meta: {Number(k.target)}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function EfmFoAnalyticsPage() {
  const [trend, setTrend] = useState<Record<string, unknown> | null>(null);
  const [projection, setProjection] = useState<Array<Record<string, unknown>>>([]);
  const [scenarios, setScenarios] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fo').then(({ getEfmFoAnalyticsTrend, getEfmFoAnalyticsProjection, listEfmFoScenarios }) => {
      getEfmFoAnalyticsTrend('MARGIN_NET').then(setTrend as never);
      getEfmFoAnalyticsProjection(12).then((r) => setProjection(r as Array<Record<string, unknown>>));
      listEfmFoScenarios().then((r) => setScenarios(r as Array<Record<string, unknown>>));
    });
  }, []);

  const simulate = () => {
    import('../api/efm-fo').then(({ simulateEfmFoScenario, listEfmFoScenarios }) =>
      simulateEfmFoScenario({
        name: `Escenario ${new Date().toISOString().slice(0, 10)}`,
        basePeriodKey: PERIOD_KEY,
        horizonMonths: 12,
        revenueGrowthPct: 8,
        expenseGrowthPct: 4,
      }).then(() => listEfmFoScenarios().then((r) => setScenarios(r as Array<Record<string, unknown>>))));
  };

  return (
    <>
      <Header title="Analítica financiera" subtitle="Tendencias, proyecciones y escenarios" actions={
        <div className="row-actions">
          <button className="btn" onClick={simulate}>Simular escenario</button>
          <Link to="/finanzas/foc" className="btn">FOC</Link>
        </div>
      } />
      <section className="panel">
        <h3>Tendencia margen neto</h3>
        <p>Dirección: {String(trend?.direction ?? '—')} · Cambio: {String(trend?.changePct ?? 0)}%</p>
        <table className="data-table">
          <thead><tr><th>Período</th><th>Valor</th></tr></thead>
          <tbody>
            {((trend?.points ?? []) as Array<Record<string, unknown>>).map((p) => (
              <tr key={String(p.periodKey)}><td>{String(p.periodKey)}</td><td>{Number(p.value ?? 0).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Proyección financiera (12 meses)</h3>
        <table className="data-table">
          <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Utilidad</th></tr></thead>
          <tbody>
            {projection.map((p) => (
              <tr key={String(p.month)}><td>{String(p.month)}</td><td>{Number(p.revenue ?? 0).toLocaleString()}</td><td>{Number(p.expenses ?? 0).toLocaleString()}</td><td>{Number(p.netIncome ?? 0).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Escenarios guardados</h3>
        <table className="data-table">
          <thead><tr><th>Escenario</th><th>Base</th><th>Horizonte</th><th>Creado</th></tr></thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={String(s.scenarioKey)}><td>{String(s.name)}</td><td>{String(s.basePeriodKey)}</td><td>{String(s.horizonMonths)} meses</td><td>{String(s.createdAt).slice(0, 10)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmFoReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [customReports, setCustomReports] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm-fo').then(({ listEfmFoReports, listEfmFoCustomReports }) => {
    listEfmFoReports().then((r) => setReports(r as Array<Record<string, unknown>>));
    listEfmFoCustomReports().then((r) => setCustomReports(r as Array<Record<string, unknown>>));
  });
  useEffect(() => { reload(); }, []);

  const generate = (reportType: string, category: string, name: string) => {
    import('../api/efm-fo').then(({ generateEfmFoReport }) =>
      generateEfmFoReport({ name, category, reportType, periodKey: PERIOD_KEY }).then(reload));
  };

  const exportReport = (reportKey: string, format: string) => {
    import('../api/efm-fo').then(({ exportEfmFoReport }) => exportEfmFoReport(reportKey, format));
  };

  return (
    <>
      <Header title="Centro de reportes" subtitle="Financieros, tributarios, gerenciales y presupuestales" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => generate('financial_statements', 'financial', 'Estados financieros')}>Estados</button>
          <button className="btn" onClick={() => generate('kpi_dashboard', 'management', 'Dashboard KPIs')}>KPIs</button>
          <button className="btn" onClick={() => generate('tax_base', 'tax', 'Base tributaria')}>Tributario</button>
          <button className="btn" onClick={() => generate('budget', 'budget', 'Presupuestal')}>Presupuesto</button>
          <Link to="/finanzas/foc" className="btn">FOC</Link>
        </div>
      } />
      <section className="panel">
        <h3>Reportes generados</h3>
        <table className="data-table">
          <thead><tr><th>Reporte</th><th>Categoría</th><th>Tipo</th><th>Período</th><th>Exportar</th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={String(r.reportKey)}>
                <td>{String(r.name)}</td>
                <td>{String(r.category)}</td>
                <td>{String(r.reportType)}</td>
                <td>{String(r.periodKey ?? '—')}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => exportReport(String(r.reportKey), 'csv')}>CSV</button>
                  <button className="btn btn-sm" onClick={() => exportReport(String(r.reportKey), 'excel')}>Excel</button>
                  <button className="btn btn-sm" onClick={() => exportReport(String(r.reportKey), 'pdf')}>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Constructor — reportes personalizados</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Descripción</th></tr></thead>
          <tbody>
            {customReports.map((cr) => (
              <tr key={String(cr.customReportKey)}>
                <td>{String(cr.customReportKey)}</td>
                <td>{String(cr.name)}</td>
                <td>{String(cr.description ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmFoDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-fo').then(({ getEfmFoExecutiveDashboard }) => getEfmFoExecutiveDashboard(PERIOD_KEY).then(setDash as never));
  }, []);

  const kpiDashboard = dash?.kpiDashboard as Record<string, unknown> | undefined;
  const categories = (kpiDashboard?.categories ?? []) as Array<{ category: string; items: Array<Record<string, unknown>> }>;
  const center = dash?.center as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Dashboard financiero ejecutivo" subtitle="Vista consolidada para alta dirección" actions={<Link to="/finanzas/foc" className="btn">FOC</Link>} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Estados</span><span className="kpi-value">{String(center?.statementCount ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas</span><span className="kpi-value">{String(center?.openAlerts ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">KPIs</span><span className="kpi-value">{String(kpiDashboard?.totals ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Insights IA</span><span className="kpi-value">{((dash?.insights ?? []) as unknown[]).length}</span></div>
      </div>
      {categories.slice(0, 3).map((cat) => (
        <section className="panel" key={cat.category}>
          <h3>{cat.category}</h3>
          <div className="kpi-grid">
            {cat.items.slice(0, 4).map((k) => (
              <div className="kpi-card" key={String(k.kpiCode)}>
                <span className="kpi-label">{String(k.kpiName)}</span>
                <span className="kpi-value">{Number(k.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function EfmFoAlertsPage() {
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-fo').then(({ listEfmFoAlerts }) => listEfmFoAlerts(true).then((r) => setAlerts(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Alertas financieras" subtitle="Notificaciones de cierre, liquidez y presupuesto" actions={<Link to="/finanzas/foc" className="btn">FOC</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Alerta</th><th>Tipo</th><th>Severidad</th><th>Período</th><th>Mensaje</th></tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={String(a.alertKey)} style={String(a.severity) === 'critical' ? { color: 'crimson' } : undefined}>
              <td>{String(a.alertKey)}</td>
              <td>{String(a.alertType)}</td>
              <td>{String(a.severity)}</td>
              <td>{String(a.periodKey ?? '')}</td>
              <td>{String(a.message)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmFoAiPage() {
  const [insights, setInsights] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm-fo').then(({ listEfmFoAiInsights, generateEfmFoAiInsights }) =>
    generateEfmFoAiInsights(PERIOD_KEY).then(() => listEfmFoAiInsights().then((r) => setInsights(r as Array<Record<string, unknown>>))));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Inteligencia financiera (IA)" subtitle="Predicciones, anomalías y recomendaciones" actions={
        <div className="row-actions">
          <button className="btn" onClick={reload}>Regenerar insights</button>
          <Link to="/finanzas/foc" className="btn">FOC</Link>
        </div>
      } />
      <div className="panel-grid">
        {insights.map((i) => (
          <section className="panel" key={String(i.insightKey)}>
            <h3>{String(i.title)}</h3>
            <p>{String(i.summary)}</p>
            <small>Tipo: {String(i.insightType)} · Confianza: {Math.round(Number(i.confidence ?? 0) * 100)}%</small>
          </section>
        ))}
      </div>
    </>
  );
}
