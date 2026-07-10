import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, PageSummary, MetricCard, EmptyPanel } from '../components/page';
import { useExperienceCenter } from '../context/ExperienceCenterContext';
import { getCoffeeCenter } from '../api/coffee';
import { getEimsCenter } from '../api/eims';

type StageStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  domain: string;
  href?: string;
  note?: string;
}

const EIC_SECTIONS = [
  { to: '/implementacion', label: 'Resumen', end: true },
  { to: '/implementacion/empresa', label: 'Empresa' },
  { to: '/implementacion/configuracion', label: 'Configuración' },
  { to: '/implementacion/usuarios', label: 'Usuarios' },
  { to: '/implementacion/modulos', label: 'Módulos' },
  { to: '/implementacion/procesos', label: 'Procesos' },
  { to: '/implementacion/documentos', label: 'Documentos' },
  { to: '/implementacion/integraciones', label: 'Integraciones' },
  { to: '/implementacion/estado', label: 'Estado' },
  { to: '/implementacion/go-live', label: 'Go Live' },
];

function statusLabel(s: StageStatus): string {
  switch (s) {
    case 'complete':
      return 'Completa';
    case 'in_progress':
      return 'En progreso';
    case 'blocked':
      return 'Bloqueada';
    default:
      return 'No iniciada';
  }
}

function EicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { packageId } = useExperienceCenter();
  const packageLabel = packageId === 'coop-cafe-co' ? 'Cooperativa cafetera — Colombia' : 'Plataforma completa';

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle ?? `Centro de Implementación · ${packageLabel}`}
        description="Configure, verifique y certifique que la empresa está lista para operar."
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <nav className="eic-section-nav" aria-label="Secciones de implementación">
            {EIC_SECTIONS.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                end={s.end}
                className={({ isActive }) => `eic-section-link${isActive ? ' active' : ''}`}
              >
                {s.label}
              </NavLink>
            ))}
          </nav>
        }
      >
        {children}
      </PageLayout>
    </>
  );
}

function useImplementationSnapshot() {
  const [coffee, setCoffee] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [eims, setEims] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getCoffeeCenter().catch(() => null),
      getEimsCenter().catch(() => null),
    ]).then(([c, e]) => {
      setCoffee(c);
      setEims(e as Record<string, unknown> | null);
      setLoaded(true);
    });
  }, []);

  const stages: Stage[] = useMemo(() => {
    const warehouses = Number(eims?.warehousesCount ?? 0);
    const items = Number(eims?.itemsCount ?? 0);
    const hasCoffee = Boolean(coffee);
    const tickets = coffee?.ticketsToday ?? 0;
    const inventory = coffee?.inventoryToday ?? 0;

    return [
      { id: 'E01', label: 'Empresa creada', status: 'complete', domain: 'Empresa', href: '/implementacion/empresa' },
      {
        id: 'E02',
        label: 'Datos fiscales',
        status: 'in_progress',
        domain: 'Empresa',
        href: '/implementacion/empresa',
        note: 'Complete razón social y NIT en configuración de empresa',
      },
      {
        id: 'E04',
        label: 'Usuarios operativos',
        status: 'in_progress',
        domain: 'Usuarios',
        href: '/administracion/usuarios',
      },
      {
        id: 'E09',
        label: 'Configuración compras',
        status: hasCoffee ? 'in_progress' : 'not_started',
        domain: 'Compras',
        href: '/compras/config',
      },
      {
        id: 'E10',
        label: 'Configuración inventario',
        status: warehouses > 0 && items > 0 ? 'complete' : warehouses > 0 || items > 0 ? 'in_progress' : 'not_started',
        domain: 'Inventario',
        href: '/inventario',
        note: warehouses === 0 ? 'Falta al menos una bodega' : items === 0 ? 'Falta al menos un artículo' : undefined,
      },
      {
        id: 'E11',
        label: 'Productores',
        status: 'in_progress',
        domain: 'Operación',
        href: '/productores',
      },
      {
        id: 'E17',
        label: 'Procesos configurados',
        status: 'not_started',
        domain: 'Procesos',
        href: '/procesos',
      },
      {
        id: 'E20',
        label: 'Prueba operativa',
        status: inventory > 0 ? 'complete' : tickets > 0 ? 'in_progress' : 'not_started',
        domain: 'Go Live',
        href: '/implementacion/go-live',
        note: inventory === 0 ? 'Complete recepción → pesaje → calidad → liquidación → inventario' : undefined,
      },
      {
        id: 'E21',
        label: 'Empresa lista',
        status: warehouses > 0 && items > 0 && inventory > 0 ? 'in_progress' : 'blocked',
        domain: 'Go Live',
        href: '/implementacion/go-live',
        note: 'Requiere criterios obligatorios y jornada de prueba',
      },
    ];
  }, [coffee, eims]);

  const complete = stages.filter((s) => s.status === 'complete').length;
  const pct = stages.length ? Math.floor((complete / stages.length) * 100) : 0;
  const next = stages.find((s) => s.status === 'in_progress' || s.status === 'not_started' || s.status === 'blocked');
  const blockers = stages.filter((s) => s.status === 'blocked' || (s.note && s.status !== 'complete'));

  return { loaded, stages, pct, next, blockers, coffee, eims };
}

export function ImplementationCenterLayout() {
  return <Outlet />;
}

export function ImplementationSummaryPage() {
  const { loaded, stages, pct, next, blockers } = useImplementationSnapshot();

  return (
    <EicShell title="Resumen de implementación">
      {!loaded ? <p className="muted">Calculando estado…</p> : null}
      <PageSummary>
        <MetricCard label="Preparación" value={`${pct}%`} tone="coffee" hint="Derivado de etapas verificables" />
        <MetricCard
          label="Etapas completas"
          value={`${stages.filter((s) => s.status === 'complete').length}/${stages.length}`}
          tone="green"
        />
        <MetricCard label="Bloqueos / riesgos" value={blockers.length} />
      </PageSummary>

      <PageSection title="Siguiente acción recomendada">
        {next ? (
          <div className="eoc-next-action">
            <p>
              <strong>{next.label}</strong>
              {next.note ? <span className="muted"> — {next.note}</span> : null}
            </p>
            {next.href ? (
              <Link to={next.href} className="btn btn-primary">
                Ir a configurar
              </Link>
            ) : null}
          </div>
        ) : (
          <EmptyPanel title="Sin pendientes" description="Revise Go Live para certificar." />
        )}
      </PageSection>

      <PageSection title="Etapas">
        <table className="data-table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Dominio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.id} · {s.label}
                </td>
                <td>{s.domain}</td>
                <td>
                  <span className={`eic-status eic-status-${s.status}`}>{statusLabel(s.status)}</span>
                </td>
                <td>{s.href ? <Link to={s.href}>Abrir</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>

      <PageSection title="Riesgos para producción">
        {blockers.length === 0 ? (
          <EmptyPanel title="Sin riesgos abiertos" description="Continúe con la certificación en Go Live." />
        ) : (
          <ul className="emc-alerts">
            {blockers.map((b) => (
              <li key={b.id}>
                <strong>{b.label}</strong>
                {b.note ? <span className="muted"> — {b.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </EicShell>
  );
}

function LinkCard({ title, description, to }: { title: string; description: string; to: string }) {
  return (
    <Link to={to} className="eic-link-card">
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

export function ImplementationEmpresaPage() {
  return (
    <EicShell title="Empresa">
      <PageSection title="Identidad y datos legales">
        <div className="eic-card-grid">
          <LinkCard
            title="Usuarios y accesos"
            description="Administración de usuarios (punto de entrada actual de configuración)"
            to="/administracion"
          />
          <LinkCard title="Configuración de compras" description="Centros, precios y parámetros de café" to="/compras/config" />
          <LinkCard title="Finanzas — empresa" description="Datos de empresa y moneda (lectura)" to="/finanzas/configuracion" />
        </div>
        <p className="muted eic-hint">
          Complete razón social, NIT, dirección fiscal y sucursal principal. La pantalla unificada de empresa se
          consolidará en una fase posterior; use los enlaces existentes.
        </p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationConfigPage() {
  return (
    <EicShell title="Configuración">
      <PageSection title="Parámetros transversales">
        <div className="eic-card-grid">
          <LinkCard title="Compras de café" description="Catálogos, parámetros, precios, centros" to="/compras/config" />
          <LinkCard title="Inventario" description="Bodegas, artículos, parámetros" to="/inventario" />
          <LinkCard title="Documentos" description="Archivos y formatos" to="/documentos" />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationUsuariosPage() {
  return (
    <EicShell title="Usuarios">
      <PageSection title="Identidades y acceso">
        <div className="eic-card-grid">
          <LinkCard title="Usuarios" description="Invitar y gestionar cuentas" to="/administracion/usuarios" />
          <LinkCard title="Roles y permisos" description="Administración de roles" to="/administracion" />
          <LinkCard title="Seguridad y accesos" description="Políticas, auditoría y MFA" to="/iam" />
        </div>
        <p className="muted eic-hint">
          Usuarios mínimos cooperativa: Administrador, Compras, Calidad, Inventario, Supervisor, Campo, Consulta.
        </p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationModulosPage() {
  const { packageId, setPackageId } = useExperienceCenter();
  return (
    <EicShell title="Módulos">
      <PageSection title="Paquete contratado">
        <PageSummary>
          <MetricCard
            label="Paquete activo"
            value={packageId === 'coop-cafe-co' ? 'Cooperativa cafetera' : 'Plataforma completa'}
            tone="coffee"
          />
        </PageSummary>
        <div className="row-actions ds-mt-4">
          <button
            type="button"
            className={`btn${packageId === 'coop-cafe-co' ? ' btn-primary' : ''}`}
            onClick={() => setPackageId('coop-cafe-co')}
          >
            Cooperativa cafetera
          </button>
          <button
            type="button"
            className={`btn${packageId === 'full-platform' ? ' btn-primary' : ''}`}
            onClick={() => setPackageId('full-platform')}
          >
            Plataforma completa
          </button>
        </div>
        <p className="muted eic-hint">
          El paquete define el menú visible. Cooperativa cafetera oculta hospital, manufactura, hotelería y demás
          verticales no contratadas.
        </p>
        <ul className="eoc-list">
          <li>Incluidos: Compras, Inventario, Productores, Fincas, Lotes, Calidad, Liquidación, Documentos, Procesos</li>
          <li>Ocultos: Hospital, Manufactura, Hotelería, Educación, APIs, IoT plataforma, etc.</li>
        </ul>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationProcesosPage() {
  return (
    <EicShell title="Procesos">
      <PageSection title="Procesos y aprobaciones">
        <div className="eic-card-grid">
          <LinkCard title="Bandeja de aprobaciones" description="Trámites pendientes" to="/procesos/bandeja" />
          <LinkCard title="Procesos y flujos" description="Definiciones de proceso" to="/procesos" />
          <LinkCard title="Solicitudes en curso" description="Trámites activos" to="/procesos/instancias" />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationDocumentosPage() {
  return (
    <EicShell title="Documentos">
      <PageSection title="Formatos y numeración">
        <div className="eic-card-grid">
          <LinkCard title="Documentos" description="Archivos y plantillas" to="/documentos" />
          <LinkCard title="Configuración compras" description="Series y parámetros de documentos de café" to="/compras/config" />
        </div>
        <p className="muted eic-hint">Verifique numeración de recepción y liquidación antes del go-live.</p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationIntegracionesPage() {
  return (
    <EicShell title="Integraciones">
      <PageSection title="Conectividad operativa">
        <div className="eic-card-grid">
          <LinkCard title="Balanzas" description="Dispositivos de pesaje" to="/compras/balanzas" />
          <LinkCard title="Integraciones" description="Conectores y flujos" to="/integraciones" />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationEstadoPage() {
  const { stages, pct, eims, coffee } = useImplementationSnapshot();
  const domains = useMemo(() => {
    const map = new Map<string, Stage[]>();
    for (const s of stages) {
      const list = map.get(s.domain) ?? [];
      list.push(s);
      map.set(s.domain, list);
    }
    return [...map.entries()].map(([domain, list]) => {
      const done = list.filter((x) => x.status === 'complete').length;
      const domainPct = list.length ? Math.floor((done / list.length) * 100) : 0;
      const worst = list.some((x) => x.status === 'blocked')
        ? 'blocked'
        : list.every((x) => x.status === 'complete')
          ? 'complete'
          : list.some((x) => x.status === 'in_progress' || x.status === 'complete')
            ? 'in_progress'
            : 'not_started';
      return { domain, pct: domainPct, status: worst as StageStatus };
    });
  }, [stages]);

  return (
    <EicShell title="Estado de implementación">
      <PageSummary>
        <MetricCard label="Global" value={`${pct}%`} tone="coffee" />
        <MetricCard label="Bodegas" value={String(eims?.warehousesCount ?? '—')} />
        <MetricCard label="Artículos" value={String(eims?.itemsCount ?? '—')} />
        <MetricCard label="Tickets hoy" value={coffee?.ticketsToday ?? '—'} />
      </PageSummary>
      <PageSection title="Preparación por dominio">
        <div className="eic-domain-grid">
          {domains.map((d) => (
            <div key={d.domain} className="eic-domain-card">
              <span className="kpi-label">{d.domain}</span>
              <span className="kpi-value">{d.pct}%</span>
              <span className={`eic-status eic-status-${d.status}`}>{statusLabel(d.status)}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationGoLivePage() {
  const { stages, pct, blockers } = useImplementationSnapshot();
  const ready = pct >= 80 && !stages.some((s) => s.id === 'E20' && s.status === 'not_started');
  const [certified, setCertified] = useState(() => {
    try {
      return localStorage.getItem('agroerp_golive_certified') === '1';
    } catch {
      return false;
    }
  });
  const [note, setNote] = useState('');

  const certify = () => {
    const payload = {
      at: new Date().toISOString(),
      pct,
      note,
    };
    try {
      localStorage.setItem('agroerp_golive_certified', '1');
      localStorage.setItem('agroerp_golive_record', JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    setCertified(true);
  };

  const revoke = () => {
    try {
      localStorage.removeItem('agroerp_golive_certified');
      localStorage.removeItem('agroerp_golive_record');
    } catch {
      /* ignore */
    }
    setCertified(false);
  };

  return (
    <EicShell title="Go Live">
      {certified ? (
        <PageSection title="Empresa lista para operar">
          <div className="eic-certified">
            <h2>✓ EMPRESA LISTA PARA OPERAR</h2>
            <p className="muted">Certificación interna registrada en este navegador (evidencia local).</p>
            <button type="button" className="btn btn-ghost" onClick={revoke}>
              Revocar certificación
            </button>
          </div>
        </PageSection>
      ) : (
        <PageSection title="Certificación">
          <PageSummary>
            <MetricCard label="Preparación" value={`${pct}%`} tone={ready ? 'green' : 'coffee'} />
            <MetricCard label="Riesgos abiertos" value={blockers.length} />
          </PageSummary>
          {!ready ? (
            <p className="muted eic-hint">
              Complete la jornada de prueba (recepción → pesaje → calidad → liquidación → inventario) y los criterios
              obligatorios antes de certificar.
            </p>
          ) : null}
          <label className="eic-cert-note">
            Notas de certificación
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
          <button type="button" className="btn btn-primary" onClick={certify} disabled={!ready && blockers.length > 3}>
            Certificar empresa lista
          </button>
          <p className="muted eic-hint">
            La certificación es una evidencia de producto en el cliente. No modifica permisos ni APIs.
          </p>
        </PageSection>
      )}

      <PageSection title="Jornada de prueba">
        <ol className="eic-journey">
          <li>
            <Link to="/compras/recepcion">Recepción</Link>
          </li>
          <li>
            <Link to="/compras/pesaje">Pesaje</Link>
          </li>
          <li>
            <Link to="/compras/calidad">Calidad</Link>
          </li>
          <li>
            <Link to="/compras/liquidaciones">Liquidación</Link>
          </li>
          <li>
            <Link to="/compras/inventario">Inventario</Link>
          </li>
          <li>
            <Link to="/gerencia">Dashboard gerencia</Link>
          </li>
        </ol>
      </PageSection>
    </EicShell>
  );
}
