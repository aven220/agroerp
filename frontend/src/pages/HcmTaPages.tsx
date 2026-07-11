import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function HcmTaCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm-ta').then(({ getHcmTaCenter }) => getHcmTaCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de asistencia" subtitle="Marcaciones, turnos, horarios y novedades" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hcm-ta').then(({ seedHcmTa }) => seedHcmTa().then(reload))}>Cargar configuración inicial</button>
          <Link to="/rrhh/asistencia/marcaciones" className="btn">Marcaciones</Link>
          <Link to="/rrhh/asistencia/turnos" className="btn">Turnos</Link>
          <Link to="/rrhh/asistencia/calendario" className="btn">Calendario</Link>
          <Link to="/rrhh/asistencia/novedades" className="btn">Novedades</Link>
          <Link to="/rrhh/asistencia/correcciones" className="btn">Correcciones</Link>
          <Link to="/rrhh/asistencia/dashboard" className="btn">Dashboard</Link>
          <Link to="/rrhh" className="btn">Personal</Link>
        </div>
      } />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Marcaciones hoy</span><span className="kpi-value">{String(center.punchCountToday ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Turnos activos</span><span className="kpi-value">{String(center.shiftCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Horarios</span><span className="kpi-value">{String(center.scheduleCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Correcciones pendientes</span><span className="kpi-value">{String(center.pendingCorrections ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Novedades pendientes</span><span className="kpi-value">{String(center.pendingNovelties ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Intercambios pendientes</span><span className="kpi-value">{String(center.pendingSwaps ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ausencias hoy</span><span className="kpi-value">{String(center.absenceCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Geocercas</span><span className="kpi-value">{String(center.geofenceCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmTaPunchesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/hcm-ta').then(({ listHcmTaPunches }) => listHcmTaPunches().then(setRows as never)); }, []);

  return (
    <>
      <Header title="Marcaciones" subtitle="Entradas, salidas y múltiples eventos por jornada" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Empleado</th><th>Tipo</th><th>Origen</th><th>Fecha/Hora</th><th>Estado</th><th>Retardo</th><th>Ubicación</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={String(p.punchKey)}>
              <td>{String(p.employeeKey)}</td>
              <td>{String(p.punchType)}</td>
              <td>{String(p.punchSource)}</td>
              <td>{String(p.punchedAt).slice(0, 19).replace('T', ' ')}</td>
              <td>{String(p.status)}</td>
              <td>{p.minutesLate ? `${String(p.minutesLate)} min` : '—'}</td>
              <td>{p.locationValid === true ? 'OK' : p.locationValid === false ? 'Fuera' : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTaShiftsPage() {
  const [shifts, setShifts] = useState<Array<Record<string, unknown>>>([]);
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [swaps, setSwaps] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ta').then(({ listHcmTaShifts, listHcmTaAssignments, listHcmTaSwaps }) => {
      listHcmTaShifts().then(setShifts as never);
      listHcmTaAssignments().then(setAssignments as never);
      listHcmTaSwaps('pending').then(setSwaps as never);
    });
  }, []);

  return (
    <>
      <Header title="Administrador de turnos" subtitle="Fijos, rotativos, nocturnos y especiales" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      <section className="panel"><h3>Turnos ({shifts.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Inicio</th><th>Fin</th></tr></thead>
          <tbody>{shifts.map((s) => <tr key={String(s.shiftKey)}><td>{String(s.code)}</td><td>{String(s.name)}</td><td>{String(s.shiftType)}</td><td>{String(s.startTime)}</td><td>{String(s.endTime)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Asignaciones ({assignments.length})</h3>
        <table className="data-table"><thead><tr><th>Empleado</th><th>Turno</th><th>Horario</th><th>Desde</th><th>Modo</th></tr></thead>
          <tbody>{assignments.map((a) => {
            const shift = a.shift as Record<string, unknown> | undefined;
            const schedule = a.schedule as Record<string, unknown> | undefined;
            return <tr key={String(a.assignmentKey)}><td>{String(a.employeeKey)}</td><td>{shift ? String(shift.name) : ''}</td><td>{schedule ? String(schedule.name) : ''}</td><td>{String(a.effectiveFrom).slice(0, 10)}</td><td>{String(a.workMode ?? schedule?.workMode ?? '')}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Intercambios pendientes ({swaps.length})</h3>
        <table className="data-table"><thead><tr><th>Solicitante</th><th>Fecha</th><th>De</th><th>A</th><th>Estado</th></tr></thead>
          <tbody>{swaps.map((s) => <tr key={String(s.swapKey)}><td>{String(s.requesterKey)}</td><td>{String(s.swapDate).slice(0, 10)}</td><td>{String(s.fromShiftKey)}</td><td>{String(s.toShiftKey ?? '')}</td><td>{String(s.status)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTaCalendarPage() {
  const [calendars, setCalendars] = useState<Array<Record<string, unknown>>>([]);
  const [schedules, setSchedules] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm-ta').then(({ listHcmTaCalendars, listHcmTaSchedules }) => {
      listHcmTaCalendars().then(setCalendars as never);
      listHcmTaSchedules().then(setSchedules as never);
    });
  }, []);

  return (
    <>
      <Header title="Calendario laboral" subtitle="Festivos, jornadas y horarios" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      {calendars.map((cal) => {
        const holidays = (cal.holidays ?? []) as Array<Record<string, unknown>>;
        return (
          <section key={String(cal.calendarKey)} className="panel">
            <h3>{String(cal.name)} ({String(cal.year)})</h3>
            <table className="data-table"><thead><tr><th>Festivo</th><th>Fecha</th><th>Remunerado</th></tr></thead>
              <tbody>{holidays.map((h) => <tr key={String(h.holidayKey)}><td>{String(h.name)}</td><td>{String(h.holidayDate).slice(0, 10)}</td><td>{h.isPaid ? 'Sí' : 'No'}</td></tr>)}</tbody>
            </table>
          </section>
        );
      })}
      <section className="panel"><h3>Horarios / Jornadas ({schedules.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Modo</th><th>Horas semana</th><th>Horas día</th><th>Flexible</th></tr></thead>
          <tbody>{schedules.map((s) => <tr key={String(s.scheduleKey)}><td>{String(s.name)}</td><td>{String(s.workMode)}</td><td>{String(s.weeklyHours)}</td><td>{String(s.dailyHours)}</td><td>{s.flexibleStart ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTaNoveltiesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/hcm-ta').then(({ listHcmTaNovelties }) => listHcmTaNovelties().then(setRows as never));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Panel de novedades" subtitle="Horas extras, permisos, vacaciones, incapacidades" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Empleado</th><th>Tipo</th><th>Estado</th><th>Inicio</th><th>Horas</th><th>Recargo</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map((n) => (
            <tr key={String(n.noveltyKey)}>
              <td>{String(n.noveltyKey)}</td>
              <td>{String(n.employeeKey)}</td>
              <td>{String(n.noveltyType)}</td>
              <td>{String(n.status)}</td>
              <td>{String(n.startDate).slice(0, 10)}</td>
              <td>{String(n.hours ?? '—')}</td>
              <td>{String(n.multiplier ?? 1)}x</td>
              <td>
                {n.status === 'pending' ? (
                  <button className="btn btn-sm" onClick={() => import('../api/hcm-ta').then(({ decideHcmTaNovelty }) => decideHcmTaNovelty(String(n.noveltyKey), true, '2026-07').then(reload))}>Aprobar</button>
                ) : null}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTaCorrectionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/hcm-ta').then(({ listHcmTaCorrections }) => listHcmTaCorrections('pending').then(setRows as never));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Aprobación de correcciones" subtitle="Marcaciones manuales y ajustes autorizados" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Empleado</th><th>Tipo solicitado</th><th>Fecha/Hora</th><th>Motivo</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={String(c.correctionKey)}>
              <td>{String(c.employeeKey)}</td>
              <td>{String(c.requestedPunchType)}</td>
              <td>{String(c.requestedAt).slice(0, 19).replace('T', ' ')}</td>
              <td>{String(c.reason)}</td>
              <td className="row-actions">
                <button className="btn btn-sm" onClick={() => import('../api/hcm-ta').then(({ decideHcmTaCorrection }) => decideHcmTaCorrection(String(c.correctionKey), true).then(reload))}>Aprobar</button>
                <button className="btn btn-sm" onClick={() => import('../api/hcm-ta').then(({ decideHcmTaCorrection }) => decideHcmTaCorrection(String(c.correctionKey), false).then(reload))}>Rechazar</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmTaDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { import('../api/hcm-ta').then(({ getHcmTaDashboard }) => getHcmTaDashboard().then(setDash)); }, []);

  const punches = (dash?.punches ?? []) as Array<Record<string, unknown>>;
  const absences = (dash?.absences ?? []) as Array<Record<string, unknown>>;
  const novelties = (dash?.novelties ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Dashboard operativo" subtitle="Asistencia, ausencias y novedades" actions={<Link to="/rrhh/asistencia" className="btn">Asistencia</Link>} />
      <section className="panel"><h3>Marcaciones por día</h3>
        <table className="data-table"><thead><tr><th>Fecha</th><th>Total</th></tr></thead>
          <tbody>{punches.map((p, i) => <tr key={i}><td>{String(p.workDate).slice(0, 10)}</td><td>{String((p._count as Record<string, number>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Ausencias por tipo</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Total</th></tr></thead>
          <tbody>{absences.map((a, i) => <tr key={i}><td>{String(a.absenceType)}</td><td>{String((a._count as Record<string, number>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Novedades</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>{novelties.map((n, i) => <tr key={i}><td>{String(n.noveltyType)}</td><td>{String(n.status)}</td><td>{String((n._count as Record<string, number>)?.id ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
