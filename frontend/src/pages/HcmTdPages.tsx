import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function HcmTdCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm-td').then(({ getHcmTdCenter }) => getHcmTdCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de capacitación" subtitle="Formación, competencias, desempeño y desarrollo del talento" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hcm-td').then(({ seedHcmTd }) => seedHcmTd().then(reload))}>Cargar configuración inicial</button>
          <Link to="/rrhh/talento/cursos" className="btn">Cursos</Link>
          <Link to="/rrhh/talento/evaluaciones" className="btn">Evaluaciones</Link>
          <Link to="/rrhh/talento/competencias" className="btn">Competencias</Link>
          <Link to="/rrhh/talento/objetivos" className="btn">Objetivos</Link>
          <Link to="/rrhh/talento/dashboard" className="btn">Dashboard</Link>
          <Link to="/rrhh" className="btn">Personal</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Cursos</span><span className="kpi-value">{String(center.courseCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Planes formación</span><span className="kpi-value">{String(center.planCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Inscripciones</span><span className="kpi-value">{String(center.enrollmentCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Certificaciones</span><span className="kpi-value">{String(center.certificationCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Competencias</span><span className="kpi-value">{String(center.competencyCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Evaluaciones pendientes</span><span className="kpi-value">{String(center.pendingEvaluations ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Objetivos activos</span><span className="kpi-value">{String(center.objectiveCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Planes de carrera</span><span className="kpi-value">{String(center.careerPlanCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmTdCoursesPage() {
  const [courses, setCourses] = useState<Array<Record<string, unknown>>>([]);
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [enrollments, setEnrollments] = useState<Array<Record<string, unknown>>>([]);
  const [certifications, setCertifications] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-td').then(({ listHcmTdCourses, listHcmTdPlans, listHcmTdEnrollments, listHcmTdCertifications }) => {
      listHcmTdCourses().then(setCourses as never);
      listHcmTdPlans().then(setPlans as never);
      listHcmTdEnrollments().then(setEnrollments as never);
      listHcmTdCertifications().then(setCertifications as never);
    });
  }, []);

  return (
    <>
      <Header title="Gestor de cursos" subtitle="Catálogo, planes, inscripciones y certificaciones" actions={<Link to="/rrhh/talento" className="btn">Talento</Link>} />
      <section className="panel"><h3>Cursos ({courses.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Origen</th><th>Modalidad</th><th>Horas</th></tr></thead>
          <tbody>{courses.map((c) => <tr key={String(c.courseKey)}><td>{String(c.code)}</td><td>{String(c.title)}</td><td>{String(c.courseType)}</td><td>{String(c.courseOrigin)}</td><td>{String(c.modality)}</td><td>{String(c.durationHours)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Planes de formación ({plans.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Año</th><th>Cursos</th></tr></thead>
          <tbody>{plans.map((p) => <tr key={String(p.planKey)}><td>{String(p.name)}</td><td>{String(p.year ?? '')}</td><td>{((p.courseKeys ?? []) as unknown[]).length}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Inscripciones ({enrollments.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Curso</th><th>Estado</th><th>Asistencia</th></tr></thead>
          <tbody>{enrollments.map((e) => {
            const course = e.course as Record<string, unknown> | undefined;
            return <tr key={String(e.enrollmentKey)}><td>{String(e.employeeKey)}</td><td>{course ? String(course.title) : String(e.courseKey)}</td><td>{String(e.status)}</td><td>{String(e.attendancePct ?? 0)}%</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Certificaciones ({certifications.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Nombre</th><th>Emisor</th><th>Vence</th><th>Estado</th></tr></thead>
          <tbody>{certifications.map((c) => <tr key={String(c.certificationKey)}><td>{String(c.employeeKey)}</td><td>{String(c.name)}</td><td>{String(c.issuer ?? '—')}</td><td>{c.expiresAt ? String(c.expiresAt).slice(0, 10) : '—'}</td><td>{String(c.status)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTdEvaluationsPage() {
  const [cycles, setCycles] = useState<Array<Record<string, unknown>>>([]);
  const [evaluations, setEvaluations] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-td').then(({ listHcmTdCycles, listHcmTdEvaluations }) => {
      listHcmTdCycles().then(setCycles as never);
      listHcmTdEvaluations().then(setEvaluations as never);
    });
  }, []);

  return (
    <>
      <Header title="Centro de evaluaciones" subtitle="Autoevaluación, jefe, 180°, 360°, competencias y objetivos" actions={<Link to="/rrhh/talento" className="btn">Talento</Link>} />
      <section className="panel"><h3>Ciclos ({cycles.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Año</th><th>Inicio</th><th>Fin</th><th>Evaluaciones</th></tr></thead>
          <tbody>{cycles.map((c) => {
            const evals = (c.evaluations ?? []) as unknown[];
            return <tr key={String(c.cycleKey)}><td>{String(c.name)}</td><td>{String(c.year)}</td><td>{String(c.startDate).slice(0, 10)}</td><td>{String(c.endDate).slice(0, 10)}</td><td>{evals.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Evaluaciones ({evaluations.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Evaluador</th><th>Calificación</th><th>Estado</th></tr></thead>
          <tbody>{evaluations.map((e) => <tr key={String(e.evaluationKey)}><td>{String(e.employeeKey)}</td><td>{String(e.evaluationType)}</td><td>{String(e.evaluatorKey ?? '—')}</td><td>{e.overallScore != null ? String(e.overallScore) : '—'}</td><td>{String(e.status)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTdCompetenciesPage() {
  const [competencies, setCompetencies] = useState<Array<Record<string, unknown>>>([]);
  const [matrix, setMatrix] = useState<Array<Record<string, unknown>>>([]);
  const [employeeLevels, setEmployeeLevels] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-td').then(({ listHcmTdCompetencies, getHcmTdSkillMatrix, listHcmTdEmployeeCompetencies }) => {
      listHcmTdCompetencies().then(setCompetencies as never);
      getHcmTdSkillMatrix().then(setMatrix as never);
      listHcmTdEmployeeCompetencies().then(setEmployeeLevels as never);
    });
  }, []);

  return (
    <>
      <Header title="Matriz de competencias" subtitle="Técnicas, blandas, niveles y brechas" actions={<Link to="/rrhh/talento" className="btn">Talento</Link>} />
      <section className="panel"><h3>Competencias ({competencies.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th></tr></thead>
          <tbody>{competencies.map((c) => <tr key={String(c.competencyKey)}><td>{String(c.code)}</td><td>{String(c.name)}</td><td>{String(c.competencyType)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Brechas por empleado ({employeeLevels.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Competencia</th><th>Actual</th><th>Meta</th><th>Brecha</th></tr></thead>
          <tbody>{employeeLevels.map((l) => {
            const comp = l.competency as Record<string, unknown> | undefined;
            return <tr key={String(l.recordKey)}><td>{String(l.employeeKey)}</td><td>{comp ? String(comp.name) : String(l.competencyKey)}</td><td>{String(l.currentLevel)}</td><td>{String(l.targetLevel)}</td><td>{String(l.gapScore)}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Matriz ({matrix.length} competencias)</h3>
        <table className="data-table"><thead><tr><th>Competencia</th><th>Tipo</th><th>Empleados evaluados</th></tr></thead>
          <tbody>{matrix.map((m) => {
            const emps = (m.employees ?? []) as unknown[];
            return <tr key={String(m.competencyKey)}><td>{String(m.name)}</td><td>{String(m.competencyType)}</td><td>{emps.length}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTdObjectivesPage() {
  const [objectives, setObjectives] = useState<Array<Record<string, unknown>>>([]);
  const [careerPlans, setCareerPlans] = useState<Array<Record<string, unknown>>>([]);
  const [highPotential, setHighPotential] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-td').then(({ listHcmTdObjectives, listHcmTdCareerPlans, listHcmTdHighPotential }) => {
      listHcmTdObjectives().then(setObjectives as never);
      listHcmTdCareerPlans().then(setCareerPlans as never);
      listHcmTdHighPotential().then(setHighPotential as never);
    });
  }, []);

  return (
    <>
      <Header title="Panel de objetivos" subtitle="OKR, KPI, metas, planes de carrera y sucesión" actions={<Link to="/rrhh/talento" className="btn">Talento</Link>} />
      <section className="panel"><h3>Objetivos ({objectives.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Título</th><th>Meta</th><th>Actual</th><th>Estado</th></tr></thead>
          <tbody>{objectives.map((o) => <tr key={String(o.objectiveKey)}><td>{String(o.employeeKey)}</td><td>{String(o.objectiveType)}</td><td>{String(o.title)}</td><td>{o.targetValue != null ? `${String(o.targetValue)} ${String(o.unit ?? '')}` : '—'}</td><td>{String(o.currentValue)}</td><td>{String(o.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Planes de carrera ({careerPlans.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Tipo</th><th>Preparación</th><th>Alto potencial</th></tr></thead>
          <tbody>{careerPlans.map((p) => <tr key={String(p.careerKey)}><td>{String(p.employeeKey)}</td><td>{String(p.planType)}</td><td>{String(p.readinessScore)}%</td><td>{p.isHighPotential ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Alto potencial ({highPotential.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Preparación</th><th>Posición objetivo</th></tr></thead>
          <tbody>{highPotential.map((p) => <tr key={String(p.careerKey)}><td>{String(p.employeeKey)}</td><td>{String(p.readinessScore)}%</td><td>{String(p.targetPositionKey ?? '—')}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTdDashboardPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { import('../api/hcm-td').then(({ getHcmTdDashboard }) => getHcmTdDashboard().then(setDashboard)); }, []);

  const enrollments = (dashboard?.enrollmentsByStatus ?? []) as Array<Record<string, unknown>>;
  const evaluations = (dashboard?.evaluationsByType ?? []) as Array<Record<string, unknown>>;
  const gaps = (dashboard?.gaps ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard de talento" subtitle="Formación, evaluaciones, brechas y alto potencial" actions={<Link to="/rrhh/talento" className="btn">Talento</Link>} />
      <section className="panel"><h3>Inscripciones por estado</h3>
        <table className="data-table"><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>{enrollments.map((e, i) => <tr key={i}><td>{String(e.status)}</td><td>{String((e._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Evaluaciones</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>{evaluations.map((e, i) => <tr key={i}><td>{String(e.evaluationType)}</td><td>{String(e.status)}</td><td>{String((e._count as Record<string, unknown>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Principales brechas ({gaps.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Competencia</th><th>Brecha</th></tr></thead>
          <tbody>{gaps.map((g) => {
            const comp = g.competency as Record<string, unknown> | undefined;
            return <tr key={String(g.recordKey)}><td>{String(g.employeeKey)}</td><td>{comp ? String(comp.name) : ''}</td><td>{String(g.gapScore)}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </>
  );
}
