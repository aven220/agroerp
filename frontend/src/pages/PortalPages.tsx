import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

type Profile = Record<string, unknown>;

function contactOf(profile: Profile | null) {
  return (profile?.contact ?? {}) as Record<string, unknown>;
}

export function PortalDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    import('../api/portal').then(({ getPortalDashboard, recordPortalLogin }) => {
      recordPortalLogin().catch(() => undefined);
      getPortalDashboard()
        .then(setData)
        .catch((e: Error) => setError(e.message));
    });
  };

  useEffect(() => { reload(); }, []);

  const profile = (data?.profile ?? null) as Profile | null;
  const news = (data?.news ?? []) as Array<Record<string, unknown>>;
  const notices = (data?.notices ?? []) as Array<Record<string, unknown>>;
  const quickLinks = (data?.quickLinks ?? []) as Array<Record<string, unknown>>;
  const birthdays = (data?.birthdays ?? []) as Array<Record<string, unknown>>;
  const contact = contactOf(profile);
  const position = (profile?.position ?? null) as Record<string, unknown> | null;
  const area = (profile?.area ?? null) as Record<string, unknown> | null;
  const manager = (profile?.manager ?? null) as Record<string, unknown> | null;
  const contract = (profile?.contract ?? null) as Record<string, unknown> | null;

  return (
    <>
      <Header title="Portal del Empleado" subtitle="Dashboard principal del colaborador" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/portal').then(({ seedPortal }) => seedPortal().then(reload))}>Cargar configuración inicial</button>
          <Link to="/portal/perfil" className="btn">Mi perfil</Link>
          <Link to="/portal/mi-dashboard" className="btn">Mi dashboard</Link>
          <Link to="/portal/solicitudes" className="btn">Solicitudes</Link>
          <Link to="/portal/documentos" className="btn">Documentos</Link>
          <Link to="/portal/nomina/desprendibles" className="btn">Desprendibles</Link>
          <Link to="/portal/analytics" className="btn">Analítica</Link>
        </div>
      } />
      {error ? <section className="panel"><p>{error}</p></section> : null}
      {profile ? (
        <section className="panel">
          <div className="row-actions" style={{ alignItems: 'center', gap: '1rem' }}>
            {profile.photoUrl ? (
              <img src={String(profile.photoUrl)} alt="Foto" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e5e7eb', display: 'grid', placeItems: 'center' }}>👤</div>
            )}
            <div>
              <h2 style={{ margin: 0 }}>{String(profile.fullName)}</h2>
              <p style={{ margin: 0 }}>{position ? String(position.name) : 'Sin cargo'} · {area ? String(area.name) : 'Sin área'}</p>
              <p style={{ margin: 0 }}>Estado: {String(profile.employmentStatus)} · #{String(profile.employeeNumber)}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Jefe inmediato</span><span className="kpi-value" style={{ fontSize: '1rem' }}>{manager ? String(manager.fullName) : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Contacto</span><span className="kpi-value" style={{ fontSize: '1rem' }}>{String(contact.email ?? contact.mobile ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Contrato</span><span className="kpi-value" style={{ fontSize: '1rem' }}>{contract ? String(contract.contractType) : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumpleaños del mes</span><span className="kpi-value">{String(birthdays.length)}</span></div>
      </div>

      <section className="panel"><h3>Accesos rápidos</h3>
        <div className="kpi-grid">
          {quickLinks.map((l) => (
            <Link key={String(l.linkKey)} to={String(l.routePath)} className="kpi-card" style={{ textDecoration: 'none' }}>
              <span className="kpi-label">{String(l.icon ?? '')} {String(l.label)}</span>
              <span className="kpi-value" style={{ fontSize: '0.9rem' }}>{String(l.description ?? '')}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel"><h3>Avisos importantes</h3>
        <table className="data-table"><thead><tr><th>Prioridad</th><th>Título</th><th>Mensaje</th></tr></thead>
          <tbody>{notices.map((n) => <tr key={String(n.noticeKey)}><td>{String(n.priority)}</td><td>{String(n.title)}</td><td>{String(n.message)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel"><h3>Noticias corporativas</h3>
        <table className="data-table"><thead><tr><th>Título</th><th>Resumen</th><th>Publicada</th></tr></thead>
          <tbody>{news.map((n) => <tr key={String(n.newsKey)}><td>{String(n.title)}</td><td>{String(n.summary ?? '')}</td><td>{String(n.publishedAt).slice(0, 10)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel"><h3>Cumpleaños</h3>
        <table className="data-table"><thead><tr><th>Colaborador</th><th>Fecha</th><th>Hoy</th></tr></thead>
          <tbody>{birthdays.map((b) => <tr key={String(b.employeeKey)}><td>{String(b.fullName)}</td><td>{b.birthDate ? String(b.birthDate).slice(5, 10) : '—'}</td><td>{b.isToday ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function PortalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalMobile, setPersonalMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    import('../api/portal').then(({ getPortalProfile }) => {
      getPortalProfile().then((p) => {
        setProfile(p);
        const contact = (p.contact ?? {}) as Record<string, unknown>;
        setPhotoUrl(String(p.photoUrl ?? ''));
        setPersonalEmail(String(contact.email ?? ''));
        setPersonalPhone(String(contact.phone ?? ''));
        setPersonalMobile(String(contact.mobile ?? ''));
        setAddress(String(contact.address ?? ''));
        setCity(String(contact.city ?? ''));
        const portalProfile = (p.portalProfile ?? {}) as Record<string, unknown>;
        setBio(String(portalProfile.bio ?? ''));
      });
    });
  };

  useEffect(() => { load(); }, []);

  const save = () => {
    import('../api/portal').then(({ updatePortalProfile }) => {
      updatePortalProfile({
        photoUrl: photoUrl || undefined,
        personalEmail: personalEmail || undefined,
        personalPhone: personalPhone || undefined,
        personalMobile: personalMobile || undefined,
        address: address || undefined,
        city: city || undefined,
        bio: bio || undefined,
      }).then((p) => {
        setProfile(p);
        setMessage('Perfil actualizado');
      }).catch((e: Error) => setMessage(e.message));
    });
  };

  const contact = contactOf(profile);
  const position = (profile?.position ?? null) as Record<string, unknown> | null;
  const area = (profile?.area ?? null) as Record<string, unknown> | null;
  const manager = (profile?.manager ?? null) as Record<string, unknown> | null;
  const contract = (profile?.contract ?? null) as Record<string, unknown> | null;

  return (
    <>
      <Header title="Mi perfil" subtitle="Información personal, contractual y de contacto" actions={<Link to="/portal" className="btn">Portal</Link>} />
      {message ? <section className="panel"><p>{message}</p></section> : null}
      {profile ? (
        <>
          <section className="panel">
            <h3>{String(profile.fullName)}</h3>
            <p>Cargo: {position ? String(position.name) : '—'} · Área: {area ? String(area.name) : '—'}</p>
            <p>Jefe inmediato: {manager ? String(manager.fullName) : '—'}</p>
            <p>Estado laboral: {String(profile.employmentStatus)}</p>
            <p>Contrato: {contract ? `${String(contract.contractType)} (${String(contract.status)})` : '—'}</p>
            <p>Contacto laboral: {String(contact.email ?? '—')} / {String(contact.mobile ?? contact.phone ?? '—')}</p>
          </section>
          <section className="panel">
            <h3>Actualizar datos de portal</h3>
            <div className="row-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
              <input className="input" placeholder="URL fotografía" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
              <input className="input" placeholder="Correo personal" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
              <input className="input" placeholder="Teléfono" value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} />
              <input className="input" placeholder="Móvil" value={personalMobile} onChange={(e) => setPersonalMobile(e.target.value)} />
              <input className="input" placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
              <input className="input" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
              <textarea className="input" placeholder="Biografía" value={bio} onChange={(e) => setBio(e.target.value)} />
              <button className="btn" onClick={save}>Guardar perfil</button>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
