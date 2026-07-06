import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

function MiniBars({ rows, valueKey = 'value' }: { rows: Array<Record<string, unknown>>; valueKey?: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] ?? r.count ?? 0)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
      {rows.map((r, i) => {
        const value = Number(r[valueKey] ?? r.count ?? 0);
        const h = Math.max(4, Math.round((value / max) * 90));
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }} title={`${String(r.month ?? r.key ?? r.label ?? '')}: ${value}`}>
            <div style={{ width: '100%', height: h, background: '#2563eb', borderRadius: 2 }} />
            <span style={{ fontSize: '0.65rem' }}>{String(r.month ?? r.key ?? '').slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HpaPersonalDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/hpa').then(({ getHpaPersonalDashboard }) => getHpaPersonalDashboard().then(setData));
  }, []);

  const summary = (data?.summary ?? {}) as Record<string, unknown>;
  const courses = (data?.upcomingCourses ?? []) as Array<Record<string, unknown>>;
  const evaluations = (data?.pendingEvaluations ?? []) as Array<Record<string, unknown>>;
  const objectives = (data?.activeObjectives ?? []) as Array<Record<string, unknown>>;
  const payslips = (data?.latestPayslips ?? []) as Array<Record<string, unknown>>;
  const notifications = (data?.notifications ?? []) as Array<Record<string, unknown>>;
  const pendingRequests = (data?.pendingRequests ?? []) as Array<Record<string, unknown>>;
  const pendingApprovals = (data?.pendingApprovals ?? []) as Array<Record<string, unknown>>;
  const position = (summary.position ?? null) as Record<string, unknown> | null;

  return (
    <>
      <Header title="Dashboard del colaborador" subtitle="Resumen laboral, vacaciones, cursos, evaluaciones y solicitudes" actions={
        <div className="row-actions">
          <Link to="/portal" className="btn">Portal</Link>
          <Link to="/portal/analytics/indicadores" className="btn">Indicadores RRHH</Link>
        </div>
      } />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Colaborador</span><span className="kpi-value" style={{ fontSize: '1rem' }}>{String(summary.fullName ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cargo</span><span className="kpi-value" style={{ fontSize: '1rem' }}>{position ? String(position.name) : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Vacaciones disponibles</span><span className="kpi-value">{String(data?.vacationsAvailable ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Solicitudes pendientes</span><span className="kpi-value">{String(pendingRequests.length)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Aprobaciones en curso</span><span className="kpi-value">{String(pendingApprovals.length)}</span></div>
      </div>
      <section className="panel"><h3>Notificaciones</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Título</th><th>Mensaje</th></tr></thead>
          <tbody>{notifications.slice(0, 10).map((n) => <tr key={String(n.notificationKey)}><td>{String(n.notificationType)}</td><td>{String(n.title)}</td><td>{String(n.message)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Próximos cursos</h3>
        <table className="data-table"><thead><tr><th>Curso</th><th>Estado</th></tr></thead>
          <tbody>{courses.map((c) => <tr key={String(c.enrollmentKey)}><td>{String(c.courseTitle ?? c.courseKey)}</td><td>{String(c.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Evaluaciones pendientes</h3>
        <table className="data-table"><thead><tr><th>Evaluación</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>{evaluations.map((e) => <tr key={String(e.evaluationKey)}><td>{String(e.evaluationKey)}</td><td>{String(e.evaluationType)}</td><td>{String(e.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Objetivos activos</h3>
        <table className="data-table"><thead><tr><th>Objetivo</th><th>Avance</th><th>Meta</th><th>Vence</th></tr></thead>
          <tbody>{objectives.map((o) => <tr key={String(o.objectiveKey)}><td>{String(o.title)}</td><td>{String(o.currentValue)}</td><td>{String(o.targetValue ?? '—')}</td><td>{String(o.dueDate).slice(0, 10)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Últimos desprendibles</h3>
        <table className="data-table"><thead><tr><th>Período</th><th>Neto</th><th>Estado</th></tr></thead>
          <tbody>{payslips.map((p) => <tr key={String(p.payslipKey)}><td>{String(p.periodCode)}</td><td>{String(p.netPay)}</td><td>{String(p.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Solicitudes y aprobaciones</h3>
        <table className="data-table"><thead><tr><th>Solicitud</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>{pendingRequests.map((r) => <tr key={String(r.requestKey)}><td>{String(r.title)}</td><td>{String(r.requestType)}</td><td>{String(r.status)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HpaKpisPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departmentKey, setDepartmentKey] = useState('');
  const [branchKey, setBranchKey] = useState('');
  const reload = () => {
    import('../api/hpa').then(({ getHpaKpis }) => getHpaKpis({
      from: from || undefined, to: to || undefined,
      departmentKey: departmentKey || undefined, branchKey: branchKey || undefined,
    }).then(setData));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de indicadores RRHH" subtitle="KPIs estratégicos por sede, área y cargo" actions={
        <div className="row-actions">
          <Link to="/rrhh/dashboard-ejecutivo" className="btn">Dashboard ejecutivo</Link>
          <Link to="/portal/analytics" className="btn">Analítica</Link>
        </div>
      } />
      <section className="panel">
        <div className="row-actions">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <input className="input" placeholder="Área" value={departmentKey} onChange={(e) => setDepartmentKey(e.target.value)} />
          <input className="input" placeholder="Sede" value={branchKey} onChange={(e) => setBranchKey(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
        </div>
      </section>
      {data ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Rotación %</span><span className="kpi-value">{String(data.rotation ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ausentismo %</span><span className="kpi-value">{String(data.absenteeism ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Antigüedad promedio (años)</span><span className="kpi-value">{String(data.averageTenureYears ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Tiempo contratación (días)</span><span className="kpi-value">{String(data.averageTimeToHireDays ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Horas extras</span><span className="kpi-value">{String(data.overtimeHours ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Capacitación / empleado</span><span className="kpi-value">{String(data.trainingPerEmployee ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Evaluaciones realizadas</span><span className="kpi-value">{String(data.evaluationsCompleted ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cumplimiento objetivos %</span><span className="kpi-value">{String(data.objectivesCompliance ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Vacaciones pendientes (días)</span><span className="kpi-value">{String(data.pendingVacationsDays ?? 0)}</span></div>
        </div>
      ) : null}
      <section className="panel"><h3>Por sede</h3><MiniBars rows={((data?.byBranch ?? []) as Array<Record<string, unknown>>)} valueKey="count" /></section>
      <section className="panel"><h3>Por área</h3><MiniBars rows={((data?.byArea ?? []) as Array<Record<string, unknown>>)} valueKey="count" /></section>
      <section className="panel"><h3>Por cargo</h3><MiniBars rows={((data?.byPosition ?? []) as Array<Record<string, unknown>>)} valueKey="count" /></section>
    </>
  );
}

export function HpaAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const reload = () => {
    import('../api/hpa').then(({ getHpaAnalyticsCenter }) => getHpaAnalyticsCenter({
      from: from || undefined, to: to || undefined,
    }).then(setData));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de analítica RRHH" subtitle="Series históricas y distribución del personal" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hpa').then(({ exportHpaAnalytics }) =>
            exportHpaAnalytics({ from: from || undefined, to: to || undefined }).then((r) => {
              const blob = new Blob([JSON.stringify(r.content, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = String(r.fileName ?? 'analytics.json');
              a.click();
              setMessage('Exportación generada');
            }))}>Exportar</button>
          <Link to="/portal/analytics/ia" className="btn">Panel IA</Link>
        </div>
      } />
      {message ? <section className="panel"><p>{message}</p></section> : null}
      <section className="panel">
        <div className="row-actions">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
        </div>
      </section>
      <section className="panel"><h3>Rotación histórica</h3><MiniBars rows={((data?.historicalRotation ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Ausentismo histórico</h3><MiniBars rows={((data?.historicalAbsenteeism ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Horas extras</h3><MiniBars rows={((data?.overtime ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Desempeño</h3><MiniBars rows={((data?.performance ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Capacitación</h3><MiniBars rows={((data?.training ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Contrataciones</h3><MiniBars rows={((data?.hires ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Retiros</h3><MiniBars rows={((data?.terminations ?? []) as Array<Record<string, unknown>>)} /></section>
      <section className="panel"><h3>Pirámide organizacional</h3>
        <MiniBars rows={((data?.orgPyramid ?? []) as Array<Record<string, unknown>>).map((r) => ({ ...r, key: r.level }))} valueKey="count" />
      </section>
    </>
  );
}

export function HpaAiPanelPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/hpa').then(({ getHpaAiPanel }) => getHpaAiPanel().then(setData));
  }, []);
  const architecture = (data?.architecture ?? {}) as Record<string, unknown>;
  const insights = (data?.insights ?? []) as Array<Record<string, unknown>>;
  const providers = (data?.providers ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Panel IA de talento" subtitle="Arquitectura desacoplada para modelos externos" actions={
        <Link to="/portal/analytics" className="btn">Analítica</Link>
      } />
      <section className="panel">
        <p>Estado: {String(architecture.architecture ?? 'external-provider-ready')}</p>
        <p>Capacidades: {((architecture.capabilities ?? []) as string[]).join(', ')}</p>
        <p>Adaptadores: {((architecture.adapters ?? []) as string[]).join(', ')}</p>
      </section>
      <section className="panel"><h3>Proveedores configurados ({providers.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>URL</th><th>Activo</th></tr></thead>
          <tbody>{providers.map((p) => <tr key={String(p.configKey)}><td>{String(p.providerName)}</td><td>{String(p.baseUrl ?? '—')}</td><td>{p.isActive ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Insights preparados</h3>
        <table className="data-table"><thead><tr><th>Capacidad</th><th>Proveedor</th><th>Estado</th><th>Score</th></tr></thead>
          <tbody>{insights.map((i, idx) => <tr key={idx}><td>{String(i.capability)}</td><td>{String(i.providerName)}</td><td>{String(i.status)}</td><td>{i.score == null ? 'N/D' : String(i.score)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
