import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

const REQUEST_TYPES = [
  { value: 'vacation', label: 'Vacaciones' },
  { value: 'permission_paid', label: 'Permiso remunerado' },
  { value: 'permission_unpaid', label: 'Permiso no remunerado' },
  { value: 'permission_hours', label: 'Permiso por horas' },
  { value: 'permission_days', label: 'Permiso por días' },
  { value: 'leave_maternity', label: 'Licencia maternidad' },
  { value: 'leave_paternity', label: 'Licencia paternidad' },
  { value: 'leave_special', label: 'Licencia especial' },
  { value: 'leave_custom', label: 'Licencia configurable' },
  { value: 'certificate_labor', label: 'Certificado laboral' },
  { value: 'certificate_income', label: 'Certificado de ingresos' },
  { value: 'certificate_custom', label: 'Constancia configurable' },
];

export function PortalRequestsCenterPage() {
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [vacations, setVacations] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = () => {
    import('../api/portal').then(({ listPortalRequests, getPortalVacationSummary }) => {
      listPortalRequests().then(setRequests as never);
      getPortalVacationSummary().then(setVacations);
    });
  };

  useEffect(() => { reload(); }, []);

  const balance = (vacations?.balance ?? {}) as Record<string, unknown>;

  return (
    <>
      <Header title="Centro de solicitudes" subtitle="Autoservicio de vacaciones, permisos, licencias y certificados" actions={
        <div className="row-actions">
          <Link to="/portal/solicitudes/nueva" className="btn">Nueva solicitud</Link>
          <Link to="/portal/solicitudes/historial" className="btn">Historial</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      {message ? <section className="panel"><p>{message}</p></section> : null}
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Disponibles</span><span className="kpi-value">{String(balance.availableDays ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Disfrutadas</span><span className="kpi-value">{String(balance.takenDays ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Programadas/pendientes</span><span className="kpi-value">{String(balance.pendingDays ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Solicitudes</span><span className="kpi-value">{String(requests.length)}</span></div>
      </div>
      <section className="panel"><h3>Estado de solicitudes</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Tipo</th><th>Título</th><th>Estado</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr></thead>
          <tbody>{requests.map((r) => (
            <tr key={String(r.requestKey)}>
              <td>{String(r.requestKey)}</td>
              <td>{String(r.requestType)}</td>
              <td>{String(r.title)}</td>
              <td>{String(r.status)}</td>
              <td>{r.startDate ? String(r.startDate).slice(0, 10) : '—'}</td>
              <td>{r.endDate ? String(r.endDate).slice(0, 10) : '—'}</td>
              <td>
                <div className="row-actions">
                  {r.status === 'draft' ? (
                    <button className="btn" onClick={() => import('../api/portal').then(({ submitPortalRequest }) => submitPortalRequest(String(r.requestKey)).then(() => { setMessage('Enviada'); reload(); }))}>Enviar</button>
                  ) : null}
                  {['draft', 'submitted', 'pending_approval'].includes(String(r.status)) ? (
                    <button className="btn" onClick={() => import('../api/portal').then(({ cancelPortalRequest }) => cancelPortalRequest(String(r.requestKey)).then(() => { setMessage('Cancelada'); reload(); }))}>Cancelar</button>
                  ) : null}
                  {['submitted', 'pending_approval'].includes(String(r.status)) ? (
                    <>
                      <button className="btn" onClick={() => import('../api/portal').then(({ decidePortalRequest }) => decidePortalRequest(String(r.requestKey), true, 'Aprobado').then(() => { setMessage('Aprobada'); reload(); }))}>Aprobar</button>
                      <button className="btn" onClick={() => import('../api/portal').then(({ decidePortalRequest }) => decidePortalRequest(String(r.requestKey), false, 'Rechazado').then(() => { setMessage('Rechazada'); reload(); }))}>Rechazar</button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}

export function PortalRequestFormPage() {
  const [requestType, setRequestType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('');
  const [observations, setObservations] = useState('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [message, setMessage] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const submit = (send: boolean) => {
    import('../api/portal').then(({ createPortalRequest, addPortalRequestAttachment }) => {
      createPortalRequest({
        requestType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        hours: hours ? Number(hours) : undefined,
        observations: observations || undefined,
        submit: send,
      }).then(async (r) => {
        const row = r as Record<string, unknown>;
        const key = String(row.requestKey);
        setCreatedKey(key);
        if (fileName.trim()) {
          await addPortalRequestAttachment({
            requestKey: key,
            fileName,
            mimeType,
            storageKey: `portal/${key}/${fileName}`,
            caption: 'Soporte adjunto',
          });
        }
        setMessage(send ? 'Solicitud enviada a aprobación' : 'Borrador guardado');
      }).catch((e: Error) => setMessage(e.message));
    });
  };

  const requestCert = (certificateType: string) => {
    import('../api/portal').then(({ createPortalCertificate }) => {
      createPortalCertificate({ certificateType, observations: observations || undefined })
        .then(() => setMessage('Certificado generado'))
        .catch((e: Error) => setMessage(e.message));
    });
  };

  return (
    <>
      <Header title="Formulario de solicitudes" subtitle="Vacaciones, permisos, licencias y certificados" actions={
        <div className="row-actions">
          <Link to="/portal/solicitudes" className="btn">Centro</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      {message ? <section className="panel"><p>{message}{createdKey ? ` (${createdKey})` : ''}</p></section> : null}
      <section className="panel">
        <div className="row-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
          <select className="input" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
            {REQUEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input className="input" placeholder="Horas (permisos por horas)" value={hours} onChange={(e) => setHours(e.target.value)} />
          <textarea className="input" placeholder="Observaciones" value={observations} onChange={(e) => setObservations(e.target.value)} />
          <input className="input" placeholder="Nombre archivo soporte / foto" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <input className="input" placeholder="MIME type" value={mimeType} onChange={(e) => setMimeType(e.target.value)} />
          <div className="row-actions">
            <button className="btn" onClick={() => submit(false)}>Guardar borrador</button>
            <button className="btn" onClick={() => submit(true)}>Enviar a aprobación</button>
            <button className="btn" onClick={() => requestCert('certificate_labor')}>Certificado laboral PDF</button>
            <button className="btn" onClick={() => requestCert('certificate_income')}>Certificado ingresos PDF</button>
          </div>
        </div>
      </section>
    </>
  );
}

export function PortalRequestHistoryPage() {
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [certificates, setCertificates] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    import('../api/portal').then(({ getPortalRequestHistory, listPortalCertificates }) => {
      getPortalRequestHistory().then(setHistory as never);
      listPortalCertificates().then(setCertificates as never);
    });
  }, []);

  return (
    <>
      <Header title="Historial de solicitudes" subtitle="Estados, aprobaciones, comentarios y certificados" actions={
        <div className="row-actions">
          <Link to="/portal/solicitudes" className="btn">Centro</Link>
          <Link to="/portal" className="btn">Portal</Link>
        </div>
      } />
      <section className="panel"><h3>Historial</h3>
        <table className="data-table">
          <thead><tr><th>Solicitud</th><th>Tipo</th><th>Estado</th><th>Eventos</th><th>Adjuntos</th><th>Fechas</th></tr></thead>
          <tbody>{history.map((r) => {
            const events = (r.events ?? []) as Array<Record<string, unknown>>;
            const attachments = (r.attachments ?? []) as unknown[];
            return (
              <tr key={String(r.requestKey)}>
                <td>{String(r.requestKey)}</td>
                <td>{String(r.requestType)}</td>
                <td>{String(r.status)}</td>
                <td>{events.map((e) => `${String(e.eventType)}${e.comment ? `: ${String(e.comment)}` : ''}`).join(' | ') || '—'}</td>
                <td>{attachments.length}</td>
                <td>{String(r.createdAt).slice(0, 19).replace('T', ' ')}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Certificados</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Tipo</th><th>Archivo</th><th>Estado</th><th>Descarga</th></tr></thead>
          <tbody>{certificates.map((c) => (
            <tr key={String(c.certificateKey)}>
              <td>{String(c.certificateKey)}</td>
              <td>{String(c.certificateType)}</td>
              <td>{String(c.fileName)}</td>
              <td>{String(c.status)}</td>
              <td>
                <button className="btn" onClick={() => import('../api/portal').then(({ downloadPortalCertificate }) =>
                  downloadPortalCertificate(String(c.certificateKey)).then((d) => {
                    const a = document.createElement('a');
                    a.href = `data:application/pdf;base64,${String(d.pdfBase64 ?? '')}`;
                    a.download = String(d.fileName ?? 'certificado.pdf');
                    a.click();
                  }))}>PDF</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
