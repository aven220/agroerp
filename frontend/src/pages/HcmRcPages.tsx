import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function HcmRcCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm-rc').then(({ getHcmRcCenter }) => getHcmRcCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Reclutamiento y Selección — HCM"
        subtitle="Vacantes, candidatos, pipeline y contratación"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/hcm-rc').then(({ seedHcmRc }) => seedHcmRc().then(reload))}>Sembrar RC</button>
            <Link to="/rrhh/reclutamiento/vacantes" className="btn">Vacantes</Link>
            <Link to="/rrhh/reclutamiento/candidatos" className="btn">Candidatos</Link>
            <Link to="/rrhh/reclutamiento/portal" className="btn">Portal vacantes</Link>
            <Link to="/rrhh/reclutamiento/entrevistas" className="btn">Entrevistas</Link>
            <Link to="/rrhh/reclutamiento/ofertas" className="btn">Ofertas</Link>
            <Link to="/rrhh/reclutamiento/onboarding" className="btn">Onboarding</Link>
            <Link to="/rrhh" className="btn">HCM</Link>
          </div>
        }
      />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Vacantes</span><span className="kpi-value">{String(center.vacancyCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Abiertas</span><span className="kpi-value">{String(center.openVacancies ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Candidatos</span><span className="kpi-value">{String(center.candidateCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Aplicaciones</span><span className="kpi-value">{String(center.applicationCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Entrevistas programadas</span><span className="kpi-value">{String(center.interviewCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ofertas pendientes</span><span className="kpi-value">{String(center.pendingOffers ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Onboarding activo</span><span className="kpi-value">{String(center.activeOnboarding ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmRcVacanciesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/hcm-rc').then(({ listHcmRcVacancies }) => listHcmRcVacancies().then(setRows as never));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de vacantes" subtitle="Solicitudes, aprobación y publicación" actions={
        <div className="row-actions">
          <Link to="/rrhh/reclutamiento" className="btn">RC</Link>
          <Link to="/rrhh/reclutamiento/pipeline" className="btn">Pipeline</Link>
        </div>
      } />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Requisición</th><th>Título</th><th>Estado</th><th>Ubicación</th><th>Meta</th><th>Aplicaciones</th><th></th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={String(v.vacancyKey)}>
                <td>{String(v.requisitionNumber)}</td>
                <td>{String(v.title)}</td>
                <td><span className="badge">{String(v.status)}</span></td>
                <td>{String(v.location ?? '')}</td>
                <td>{v.targetHireDate ? String(v.targetHireDate).slice(0, 10) : ''}</td>
                <td>{String((v._count as Record<string, number>)?.applications ?? 0)}</td>
                <td><Link to={`/rrhh/reclutamiento/vacantes/${encodeURIComponent(String(v.vacancyKey))}`} className="btn btn-sm">Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcVacancyDetailPage() {
  const { vacancyKey } = useParams();
  const [vacancy, setVacancy] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!vacancyKey) return;
    import('../api/hcm-rc').then(({ getHcmRcVacancy }) => getHcmRcVacancy(vacancyKey).then(setVacancy as never));
  }, [vacancyKey]);

  const competencies = (vacancy?.competencies ?? []) as Array<Record<string, unknown>>;
  const approvals = (vacancy?.approvals ?? []) as Array<Record<string, unknown>>;
  const stages = (vacancy?.stages ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title={String(vacancy?.title ?? 'Vacante')} subtitle={String(vacancy?.requisitionNumber ?? '')} actions={
        <div className="row-actions">
          <Link to="/rrhh/reclutamiento/vacantes" className="btn">Vacantes</Link>
          {vacancyKey ? (
            <button className="btn" onClick={() => import('../api/hcm-rc').then(({ computeHcmRcRanking }) => computeHcmRcRanking(vacancyKey).then(() => window.location.reload()))}>Calcular ranking</button>
          ) : null}
        </div>
      } />
      {vacancy ? (
        <>
          <section className="panel"><h3>Perfil</h3><p>{String(vacancy.jobProfile ?? '')}</p>
            <p>Salario: {String(vacancy.salaryMin ?? '')} — {String(vacancy.salaryMax ?? '')} {String(vacancy.currencyKey ?? 'COP')}</p>
            <p>Contrato: {String(vacancy.contractType ?? '')} · Ubicación: {String(vacancy.location ?? '')}</p>
          </section>
          <section className="panel"><h3>Competencias ({competencies.length})</h3>
            <table className="data-table"><thead><tr><th>Nombre</th><th>Categoría</th><th>Peso</th><th>Mínimo</th></tr></thead>
              <tbody>{competencies.map((c) => <tr key={String(c.competencyKey)}><td>{String(c.name)}</td><td>{String(c.category)}</td><td>{String(c.weight)}</td><td>{String(c.minScore)}</td></tr>)}</tbody>
            </table>
          </section>
          <section className="panel"><h3>Aprobaciones</h3>
            <table className="data-table"><thead><tr><th>Nivel</th><th>Estado</th><th>Comentarios</th></tr></thead>
              <tbody>{approvals.map((a) => <tr key={String(a.approvalKey)}><td>{String(a.approvalLevel)}</td><td>{String(a.status)}</td><td>{String(a.comments ?? '')}</td></tr>)}</tbody>
            </table>
          </section>
          <section className="panel"><h3>Etapas de selección</h3>
            <ol>{stages.map((s) => <li key={String(s.stageKey)}>{String(s.stageOrder)}. {String(s.name)} ({String(s.stageType)})</li>)}</ol>
          </section>
        </>
      ) : null}
    </>
  );
}

export function HcmRcCandidatesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcCandidates }) => listHcmRcCandidates().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Portal de candidatos" subtitle="Base de talentos y hojas de vida" actions={
        <div className="row-actions">
          <Link to="/rrhh/reclutamiento" className="btn">RC</Link>
          <Link to="/rrhh/reclutamiento/talento" className="btn">Base talentos</Link>
        </div>
      } />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Origen</th><th>Teléfono</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={String(c.candidateKey)}>
              <td>{String(c.firstName)} {String(c.lastName)}</td>
              <td>{String(c.email)}</td>
              <td>{String(c.status)}</td>
              <td>{String(c.source)}</td>
              <td>{String(c.phone ?? '')}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcPortalPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcPublishedVacancies }) => listHcmRcPublishedVacancies().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Centro de vacantes publicadas" subtitle="Publicación interna y externa" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      <div className="card-grid">
        {rows.map((v) => (
          <article key={String(v.vacancyKey)} className="panel">
            <h3>{String(v.title)}</h3>
            <p>{String(v.location ?? '')}</p>
            <p>{String(v.contractType ?? '')} · {String(v.salaryMin ?? '')}–{String(v.salaryMax ?? '')}</p>
            <Link to={`/rrhh/reclutamiento/vacantes/${encodeURIComponent(String(v.vacancyKey))}`} className="btn btn-sm">Detalle</Link>
          </article>
        ))}
      </div>
    </>
  );
}

export function HcmRcPipelinePage() {
  const [vacancies, setVacancies] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState('');
  const [pipeline, setPipeline] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    import('../api/hcm-rc').then(({ listHcmRcVacancies }) => listHcmRcVacancies().then((rows) => {
      setVacancies(rows as Array<Record<string, unknown>>);
      if (rows.length && !selected) setSelected(String((rows[0] as Record<string, unknown>).vacancyKey));
    }));
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    import('../api/hcm-rc').then(({ getHcmRcPipeline }) => getHcmRcPipeline(selected).then(setPipeline as never));
  }, [selected]);

  return (
    <>
      <Header title="Pipeline de selección" subtitle="Aplicaciones por etapa" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      <section className="panel">
        <label>Vacante{' '}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {vacancies.map((v) => <option key={String(v.vacancyKey)} value={String(v.vacancyKey)}>{String(v.title)}</option>)}
          </select>
        </label>
        <table className="data-table">
          <thead><tr><th>Candidato</th><th>Estado</th><th>Match</th><th>Email</th></tr></thead>
          <tbody>{pipeline.map((a) => {
            const c = a.candidate as Record<string, unknown> | undefined;
            return (
              <tr key={String(a.applicationKey)}>
                <td>{c ? `${String(c.firstName)} ${String(c.lastName)}` : ''}</td>
                <td>{String(a.status)}</td>
                <td>{String(a.matchScore ?? '')}%</td>
                <td>{c ? String(c.email) : ''}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcInterviewsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcInterviews }) => listHcmRcInterviews({ upcoming: 'true' }).then(setRows as never)); }, []);

  return (
    <>
      <Header title="Agenda de entrevistas" subtitle="Programación y evaluación" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Candidato</th><th>Estado</th><th>Ubicación</th><th>Rating</th></tr></thead>
          <tbody>{rows.map((i) => {
            const c = i.candidate as Record<string, unknown> | undefined;
            return (
              <tr key={String(i.interviewKey)}>
                <td>{String(i.scheduledAt).slice(0, 16).replace('T', ' ')}</td>
                <td>{c ? `${String(c.firstName)} ${String(c.lastName)}` : ''}</td>
                <td>{String(i.status)}</td>
                <td>{String(i.location ?? i.meetingUrl ?? '')}</td>
                <td>{String(i.rating ?? '—')}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcOffersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/hcm-rc').then(({ listHcmRcOffers }) => listHcmRcOffers().then(setRows as never));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Gestor de ofertas" subtitle="Ofertas laborales y firmas" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Oferta</th><th>Candidato</th><th>Estado</th><th>Salario</th><th>Inicio</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map((o) => {
            const c = o.candidate as Record<string, unknown> | undefined;
            return (
              <tr key={String(o.offerKey)}>
                <td>{String(o.offerKey)}</td>
                <td>{c ? `${String(c.firstName)} ${String(c.lastName)}` : ''}</td>
                <td>{String(o.status)}</td>
                <td>{String(o.salary)} {String(o.currencyKey ?? 'COP')}</td>
                <td>{String(o.startDate).slice(0, 10)}</td>
                <td className="row-actions">
                  {o.status === 'draft' ? (
                    <button className="btn btn-sm" onClick={() => import('../api/hcm-rc').then(({ sendHcmRcOffer }) => sendHcmRcOffer(String(o.offerKey)).then(reload))}>Enviar</button>
                  ) : null}
                  {o.status === 'sent' ? (
                    <button className="btn btn-sm" onClick={() => import('../api/hcm-rc').then(({ acceptHcmRcOffer }) => acceptHcmRcOffer(String(o.offerKey)).then(reload))}>Aceptar</button>
                  ) : null}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcOnboardingPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcOnboarding }) => listHcmRcOnboarding().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Panel de onboarding" subtitle="Actividades de ingreso" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      {rows.map((plan) => {
        const tasks = (plan.tasks ?? []) as Array<Record<string, unknown>>;
        return (
          <section key={String(plan.planKey)} className="panel">
            <h3>Plan {String(plan.planKey)} — {String(plan.completionPct ?? 0)}% completado</h3>
            <p>Empleado: {String(plan.employeeKey ?? 'Pendiente')} · Inicio: {String(plan.startDate).slice(0, 10)}</p>
            <table className="data-table">
              <thead><tr><th>#</th><th>Tarea</th><th>Categoría</th><th>Estado</th><th></th></tr></thead>
              <tbody>{tasks.map((t) => (
                <tr key={String(t.taskKey)}>
                  <td>{String(t.taskOrder)}</td>
                  <td>{String(t.title)}</td>
                  <td>{String(t.category)}</td>
                  <td>{String(t.status)}</td>
                  <td>
                    {t.status !== 'completed' ? (
                      <button className="btn btn-sm" onClick={() => import('../api/hcm-rc').then(({ updateHcmRcOnboardingTask }) => updateHcmRcOnboardingTask(String(t.taskKey), 'completed').then(() => window.location.reload()))}>Completar</button>
                    ) : null}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}

export function HcmRcTalentPoolPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcTalentPool }) => listHcmRcTalentPool().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Base de talentos" subtitle="Candidatos en reserva" actions={<Link to="/rrhh/reclutamiento/candidatos" className="btn">Candidatos</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Candidato</th><th>Tags</th><th>Notas</th><th>Agregado</th></tr></thead>
          <tbody>{rows.map((e) => {
            const c = e.candidate as Record<string, unknown> | undefined;
            return (
              <tr key={String(e.poolKey)}>
                <td>{c ? `${String(c.firstName)} ${String(c.lastName)}` : ''}</td>
                <td>{JSON.stringify(e.tags)}</td>
                <td>{String(e.notes ?? '')}</td>
                <td>{String(e.addedAt).slice(0, 10)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmRcAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-rc').then(({ listHcmRcAudit }) => listHcmRcAudit().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Auditoría reclutamiento" subtitle="Vacantes, evaluaciones, ofertas y contrataciones" actions={<Link to="/rrhh/reclutamiento" className="btn">RC</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Entidad</th><th>Clave</th><th>Acción</th><th>Usuario</th></tr></thead>
          <tbody>{rows.map((l) => (
            <tr key={String(l.id)}>
              <td>{String(l.createdAt).slice(0, 19).replace('T', ' ')}</td>
              <td>{String(l.entityType)}</td>
              <td>{String(l.entityKey)}</td>
              <td>{String(l.action)}</td>
              <td>{String(l.userId ?? '')}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
