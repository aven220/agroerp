import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

function BarList({ rows, labelKey = 'label', valueKey = 'count' }: {
  rows: Array<Record<string, unknown>>;
  labelKey?: string;
  valueKey?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] ?? 0)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.slice(0, 8).map((r, i) => {
        const value = Number(r[valueKey] ?? 0);
        const pct = Math.round((value / max) * 100);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>{String(r[labelKey] ?? r.key ?? '')}</span>
              <span>{value}</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8 }}>
              <div style={{ width: `${pct}%`, background: '#2563eb', height: 8, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ rows, valueKey }: { rows: Array<Record<string, unknown>>; valueKey: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] ?? 0)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
      {rows.map((r, i) => {
        const value = Number(r[valueKey] ?? 0);
        const h = Math.max(4, Math.round((value / max) * 100));
        return (
          <div key={i} title={`${String(r.month)}: ${value}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: h, background: '#0f766e', borderRadius: 2 }} />
            <span style={{ fontSize: '0.65rem' }}>{String(r.month).slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HedDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departmentKey, setDepartmentKey] = useState('');
  const [branchKey, setBranchKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const reload = () => {
    import('../api/hed').then(({ getHedDashboard }) => {
      getHedDashboard({
        from: from || undefined,
        to: to || undefined,
        departmentKey: departmentKey || undefined,
        branchKey: branchKey || undefined,
      }).then(setData);
    });
  };

  useEffect(() => { reload(); }, []);

  const kpis = (data?.kpis ?? {}) as Record<string, unknown>;
  const attendance = (data?.attendance ?? {}) as Record<string, unknown>;
  const training = (data?.training ?? {}) as Record<string, unknown>;
  const performance = (data?.performance ?? {}) as Record<string, unknown>;
  const charts = (data?.charts ?? {}) as Record<string, unknown>;
  const rotation = (charts.monthlyRotation ?? []) as Array<Record<string, unknown>>;
  const evolution = (charts.headcountEvolution ?? []) as Array<Record<string, unknown>>;
  const byArea = (charts.byArea ?? []) as Array<Record<string, unknown>>;
  const byPosition = (charts.byPosition ?? []) as Array<Record<string, unknown>>;
  const byBranch = (charts.byBranch ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard Ejecutivo RRHH" subtitle="Indicadores en tiempo real a partir de datos existentes del ERP" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hed').then(({ exportHedDashboard }) =>
            exportHedDashboard({
              from: from || undefined,
              to: to || undefined,
              departmentKey: departmentKey || undefined,
              branchKey: branchKey || undefined,
            }).then((r) => {
              const blob = new Blob([JSON.stringify(r.content, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = String(r.fileName ?? 'hr-dashboard.json');
              a.click();
              setMessage('Exportación generada');
            }))}>Exportar</button>
          <Link to="/rrhh" className="btn">HCM</Link>
        </div>
      } />
      {message ? <section className="panel"><p>{message}</p></section> : null}
      <section className="panel">
        <div className="row-actions">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <input className="input" placeholder="Área (departmentKey)" value={departmentKey} onChange={(e) => setDepartmentKey(e.target.value)} />
          <input className="input" placeholder="Sede (branchKey)" value={branchKey} onChange={(e) => setBranchKey(e.target.value)} />
          <button className="btn" onClick={reload}>Aplicar filtros</button>
        </div>
      </section>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Total empleados</span><span className="kpi-value">{String(kpis.totalEmployees ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(kpis.activeEmployees ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Inactivos</span><span className="kpi-value">{String(kpis.inactiveEmployees ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Nuevas contrataciones</span><span className="kpi-value">{String(kpis.newHires ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Retiros</span><span className="kpi-value">{String(kpis.terminations ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Vacantes abiertas</span><span className="kpi-value">{String(kpis.openVacancies ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Vacantes cerradas</span><span className="kpi-value">{String(kpis.closedVacancies ?? 0)}</span></div>
      </div>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Ausentismo</span><span className="kpi-value">{String(attendance.absenteeism ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Tardanzas</span><span className="kpi-value">{String(attendance.lateArrivals ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Horas extras</span><span className="kpi-value">{String(attendance.overtimeHours ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Incapacidades</span><span className="kpi-value">{String(attendance.medicalLeaves ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Vacaciones activas</span><span className="kpi-value">{String(attendance.activeVacations ?? 0)}</span></div>
      </div>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Cursos pendientes</span><span className="kpi-value">{String(training.pendingCourses ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cursos aprobados</span><span className="kpi-value">{String(training.approvedCourses ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Certificaciones por vencer</span><span className="kpi-value">{String(training.certificationsExpiring ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento plan capacitación</span><span className="kpi-value">{String(training.planCompliance ?? 0)}%</span></div>
      </div>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Evaluaciones pendientes</span><span className="kpi-value">{String(performance.pendingEvaluations ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Promedio desempeño</span><span className="kpi-value">{String(performance.averagePerformance ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Objetivos cumplidos</span><span className="kpi-value">{String(performance.objectivesCompleted ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Planes de mejora activos</span><span className="kpi-value">{String(performance.activeImprovementPlans ?? 0)}</span></div>
      </div>

      <section className="panel"><h3>Rotación mensual (%)</h3>
        <LineChart rows={rotation} valueKey="rate" />
      </section>
      <section className="panel"><h3>Evolución de personal</h3>
        <LineChart rows={evolution} valueKey="headcount" />
      </section>
      <section className="panel"><h3>Distribución por áreas</h3>
        <BarList rows={byArea} />
      </section>
      <section className="panel"><h3>Distribución por cargos</h3>
        <BarList rows={byPosition} />
      </section>
      <section className="panel"><h3>Distribución por sedes</h3>
        <BarList rows={byBranch} />
      </section>
    </>
  );
}
