import { Link, NavLink, Outlet } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import {
  PageLayout,
  PageSection,
  PageSummary,
  MetricCard,
  EmptyPanel,
} from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { useExperienceCenter } from '../context/ExperienceCenterContext';
import {
  certifyGoLive,
  implementationStatusLabel,
  revokeGoLiveCertification,
  useImplementationEngine,
  type DomainStatus,
  type ImplementationDomain,
} from '../lib/implementationEngine';

const EIC_SECTIONS = [
  { to: '/implementacion', label: 'Resumen', end: true },
  { to: '/implementacion/empresa', label: 'Empresa' },
  { to: '/implementacion/usuarios', label: 'Usuarios' },
  { to: '/implementacion/configuracion', label: 'Configuración' },
  { to: '/implementacion/procesos', label: 'Procesos' },
  { to: '/implementacion/documentos', label: 'Documentos' },
  { to: '/implementacion/integraciones', label: 'Integraciones' },
  { to: '/implementacion/modulos', label: 'Paquete' },
  { to: '/implementacion/estado', label: 'Estado' },
  { to: '/implementacion/go-live', label: 'Go Live' },
];

function EicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { packageId } = useExperienceCenter();
  const packageLabel = packageId === 'coop-cafe-co' ? 'Cooperativa cafetera — Colombia' : 'Plataforma completa';

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle ?? `Centro de Implementación · ${packageLabel}`}
        description="Punto único para configurar, verificar y certificar que la empresa está lista para operar."
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

function StatusBadge({ status }: { status: DomainStatus }) {
  return <span className={`eic-status eic-status-${status}`}>{implementationStatusLabel(status)}</span>;
}

function DomainHelpBlock({ domain }: { domain: ImplementationDomain }) {
  return (
    <dl className="eic-help-dl">
      <div>
        <dt>¿Por qué es necesaria?</dt>
        <dd>{domain.help.why}</dd>
      </div>
      <div>
        <dt>¿Qué ocurre si no la hago?</dt>
        <dd>{domain.help.ifNot}</dd>
      </div>
      <div>
        <dt>¿Quién debe hacerla?</dt>
        <dd>{domain.help.who}</dd>
      </div>
      <div>
        <dt>¿Cuánto tarda normalmente?</dt>
        <dd>{domain.help.duration}</dd>
      </div>
    </dl>
  );
}

function DomainCard({ domain }: { domain: ImplementationDomain }) {
  return (
    <article className={`eic-live-card eic-live-card-${domain.status}`}>
      <header>
        <h3>{domain.label}</h3>
        <StatusBadge status={domain.status} />
      </header>
      <p className="eic-live-evidence">{domain.evidence}</p>
      {domain.risk ? <p className="eic-live-risk">{domain.risk}</p> : null}
      {domain.dependencies.length > 0 ? (
        <p className="muted eic-live-deps">
          Depende de:{' '}
          {domain.dependencies
            .map((d) => {
              const labels: Record<string, string> = {
                empresa: 'Empresa',
                usuarios: 'Usuarios',
                configuracion: 'Configuración',
                compras: 'Compras',
                inventario: 'Inventario',
                productores: 'Productores',
                workflow: 'Procesos',
                prueba: 'Prueba operativa',
              };
              return labels[d] ?? d;
            })
            .join(' → ')}
        </p>
      ) : null}
      <p className="eic-live-next">
        <strong>Siguiente acción:</strong> {domain.nextAction}
      </p>
      <p className="muted">
        Responsable: {domain.responsible}
      </p>
      <DomainHelpBlock domain={domain} />
      <Link to={domain.href} className="btn btn-sm">
        Abrir
      </Link>
    </article>
  );
}

function DependencyChain({ chain }: { chain: ImplementationDomain[] }) {
  return (
    <ol className="eic-dep-chain" aria-label="Cadena de dependencias">
      {chain.map((d, i) => (
        <li key={d.id} className={`eic-dep-node eic-dep-node-${d.status}`}>
          {i > 0 ? <span className="eic-dep-arrow" aria-hidden>↓</span> : null}
          <Link to={d.href} className="eic-dep-link">
            <span className="eic-dep-label">{d.label}</span>
            <StatusBadge status={d.status} />
          </Link>
          {d.status === 'blocked' && d.blockedReason ? (
            <p className="eic-dep-block-reason">{d.blockedReason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ConsultantPanel({
  consultant,
  certified,
}: {
  consultant: ReturnType<typeof useImplementationEngine>['consultant'];
  certified: boolean;
}) {
  return (
    <PageSection title="Panel del consultor">
      <PageSummary>
        <MetricCard label="Tiempo estimado restante" value={consultant.estimatedLabel} tone="coffee" />
        <MetricCard label="Etapas pendientes" value={consultant.pendingCount} />
        <MetricCard label="Bloqueadas" value={consultant.blockedCount} />
        <MetricCard label="Completas" value={consultant.completeCount} tone="green" />
        <MetricCard
          label="Última modificación"
          value={consultant.lastModifiedLabel}
          hint="Registro local de este navegador"
        />
        <MetricCard
          label="Certificación"
          value={certified ? 'Registrada' : 'Pendiente'}
          tone={certified ? 'green' : undefined}
        />
      </PageSummary>
      {consultant.nextDomain ? (
        <div className="eoc-next-action">
          <div>
            <p className="mi-dia-hero-kicker">Qué debo hacer ahora</p>
            <p>
              <strong>{consultant.nextDomain.label}</strong> — {consultant.nextDomain.nextAction}
            </p>
            <p className="muted">Responsable: {consultant.nextDomain.responsible}</p>
          </div>
          <Link to={consultant.nextDomain.href} className="btn btn-primary">
            Continuar
          </Link>
        </div>
      ) : null}
      {consultant.alerts.length > 0 ? (
        <ul className="emc-alerts eic-consultant-alerts">
          {consultant.alerts.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong>
              <span className="muted"> — {a.detail}</span>{' '}
              <Link to={a.href}>Resolver</Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel
          title="Sin alertas de implementación"
          description="No hay bloqueos ni riesgos destacados en este momento."
        />
      )}
    </PageSection>
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

function DomainSpotlight({ domainId }: { domainId: ImplementationDomain['id'] }) {
  const { loaded, domains } = useImplementationEngine();
  const domain = domains.find((d) => d.id === domainId);

  if (!loaded) return <LoadingState variant="card" message="Calculando estado…" />;
  if (!domain) return null;

  return (
    <PageSection title={`Estado: ${domain.label}`}>
      <div className="eic-spotlight">
        <StatusBadge status={domain.status} />
        <p>{domain.evidence}</p>
        {domain.risk ? <p className="eic-live-risk">{domain.risk}</p> : null}
        <p>
          <strong>Siguiente acción:</strong> {domain.nextAction}
        </p>
        <DomainHelpBlock domain={domain} />
      </div>
    </PageSection>
  );
}

export function ImplementationCenterLayout() {
  return <Outlet />;
}

export function ImplementationSummaryPage() {
  const snap = useImplementationEngine();
  const { loaded, chain, supporting, consultant, certified, signals } = snap;

  const answers = useMemo(() => {
    const missing = chain.filter((d) => d.status !== 'complete');
    const ready = chain.filter((d) => d.status === 'complete');
    const blocking = chain.filter((d) => d.status === 'blocked');
    return {
      missing: missing.map((d) => d.label).join(', ') || 'Nada crítico pendiente en la cadena',
      ready: ready.map((d) => d.label).join(', ') || 'Aún sin etapas completas',
      blocking: blocking.map((d) => d.label).join(', ') || 'Sin bloqueos en cadena',
      now: consultant.nextDomain
        ? `${consultant.nextDomain.label}: ${consultant.nextDomain.nextAction}`
        : 'Revise Go Live',
      certify: consultant.canCertify
        ? 'Puede certificar en Go Live'
        : `Aún no: ${consultant.certifyBlockers.slice(0, 3).join('; ')}`,
    };
  }, [chain, consultant]);

  if (!loaded) {
    return (
      <EicShell title="Centro de implementación">
        <LoadingState variant="page" message="Calculando checklist vivo de la empresa…" />
      </EicShell>
    );
  }

  return (
    <EicShell title="Centro de implementación">
      <PageSection title="Respuestas del consultor">
        <ul className="eic-answer-list">
          <li>
            <strong>¿Qué falta?</strong> {answers.missing}
          </li>
          <li>
            <strong>¿Qué está listo?</strong> {answers.ready}
          </li>
          <li>
            <strong>¿Qué bloquea la operación?</strong> {answers.blocking}
          </li>
          <li>
            <strong>¿Qué debo hacer ahora?</strong> {answers.now}
          </li>
          <li>
            <strong>¿Qué puedo certificar?</strong> {answers.certify}
          </li>
        </ul>
        <p className="muted eic-align-note">
          Indicadores alineados con Operación y Gerencia (mismos centros): cola {signals.queueLength}, tickets hoy{' '}
          {signals.ticketsToday}, kg {signals.kgToday.toFixed(0)}, liquidaciones {signals.settlementsToday}, bodegas{' '}
          {signals.warehouses}, artículos {signals.items}.
        </p>
      </PageSection>

      <ConsultantPanel consultant={consultant} certified={certified} />

      <PageSection title="Cadena de dependencias">
        <p className="muted">
          Si falta un requisito superior, los inferiores se muestran bloqueados con la causa. Los estados no se marcan a
          mano: se calculan con datos verificables.
        </p>
        <DependencyChain chain={chain} />
      </PageSection>

      <PageSection title="Checklist vivo (cadena crítica)">
        <div className="eic-live-grid">
          {chain.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Complementarios">
        <div className="eic-live-grid">
          {supporting.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationEmpresaPage() {
  return (
    <EicShell title="Empresa">
      <DomainSpotlight domainId="empresa" />
      <PageSection title="Configurar empresa">
        <div className="eic-card-grid">
          <LinkCard
            title="Usuarios y accesos"
            description="Cuentas de la organización"
            to="/administracion"
          />
          <LinkCard
            title="Finanzas — datos de empresa"
            description="Razón social, moneda y datos fiscales (lectura)"
            to="/finanzas/configuracion"
          />
          <LinkCard
            title="Paquete contratado"
            description="Alcance visible de la cooperativa"
            to="/implementacion/modulos"
          />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationConfigPage() {
  return (
    <EicShell title="Centro de configuración">
      <DomainSpotlight domainId="configuracion" />
      <PageSection title="Por lenguaje funcional">
        <div className="eic-card-grid">
          <LinkCard title="Empresa" description="Identidad y datos legales" to="/implementacion/empresa" />
          <LinkCard title="Operación" description="Mi día y flujo de trabajo" to="/operacion" />
          <LinkCard title="Inventario" description="Bodegas, artículos y movimientos" to="/inventario" />
          <LinkCard title="Compras" description="Catálogos, precios, centros y parámetros" to="/compras/config" />
          <LinkCard title="Usuarios" description="Cuentas, roles y accesos" to="/implementacion/usuarios" />
          <LinkCard title="Documentos" description="Archivos, formatos y numeración" to="/implementacion/documentos" />
          <LinkCard title="Procesos" description="Aprobaciones y flujos" to="/implementacion/procesos" />
          <LinkCard title="Integraciones" description="Balanzas y conectores" to="/implementacion/integraciones" />
          <LinkCard title="Reportes" description="Analítica e indicadores" to="/bi" />
        </div>
        <p className="muted eic-hint">
          No se listan módulos técnicos. Cada tarjeta abre la configuración funcional existente.
        </p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationUsuariosPage() {
  return (
    <EicShell title="Usuarios">
      <DomainSpotlight domainId="usuarios" />
      <PageSection title="Accesos operativos">
        <div className="eic-card-grid">
          <LinkCard title="Usuarios" description="Invitar y gestionar cuentas" to="/administracion/usuarios" />
          <LinkCard title="Roles y permisos" description="Perfiles de acceso" to="/administracion" />
          <LinkCard title="Seguridad" description="Políticas, auditoría y MFA" to="/iam" />
        </div>
        <p className="muted eic-hint">
          Mínimo recomendado cooperativa: Administrador, Compras, Calidad, Inventario, Supervisor, Campo, Consulta.
        </p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationModulosPage() {
  const { packageId, setPackageId } = useExperienceCenter();
  return (
    <EicShell title="Paquete contratado">
      <PageSection title="Alcance de la implementación">
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
          El paquete define el menú visible. Cooperativa cafetera oculta verticales no contratadas (no las muestra
          deshabilitadas).
        </p>
        <ul className="eoc-list">
          <li>Incluidos: Compras, Inventario, Productores, Fincas, Lotes, Calidad, Liquidación, Documentos, Procesos</li>
          <li>Ocultos en cooperativa: Hospital, Manufactura, Hotelería, Educación, IoT plataforma, etc.</li>
        </ul>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationProcesosPage() {
  return (
    <EicShell title="Procesos">
      <DomainSpotlight domainId="workflow" />
      <PageSection title="Aprobaciones y flujos">
        <div className="eic-card-grid">
          <LinkCard title="Bandeja de aprobaciones" description="Trámites pendientes" to="/procesos/bandeja" />
          <LinkCard title="Procesos y flujos" description="Definiciones publicadas" to="/procesos" />
          <LinkCard title="Solicitudes en curso" description="Trámites activos" to="/procesos/instancias" />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationDocumentosPage() {
  return (
    <EicShell title="Documentos">
      <DomainSpotlight domainId="documentos" />
      <PageSection title="Formatos y evidencia">
        <div className="eic-card-grid">
          <LinkCard title="Documentos" description="Archivos y plantillas" to="/documentos" />
          <LinkCard
            title="Configuración de compras"
            description="Series y parámetros de documentos de café"
            to="/compras/config"
          />
        </div>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationIntegracionesPage() {
  return (
    <EicShell title="Integraciones">
      <DomainSpotlight domainId="integraciones" />
      <PageSection title="Conectividad operativa">
        <div className="eic-card-grid">
          <LinkCard title="Balanzas" description="Dispositivos de pesaje" to="/compras/balanzas" />
          <LinkCard title="Integraciones" description="Conectores y flujos" to="/integraciones" />
        </div>
        <p className="muted eic-hint">Las balanzas son opcionales para el piloto; se puede operar en pesaje manual.</p>
      </PageSection>
    </EicShell>
  );
}

export function ImplementationEstadoPage() {
  const { loaded, chain, supporting, consultant, signals } = useImplementationEngine();

  if (!loaded) {
    return (
      <EicShell title="Estado de implementación">
        <LoadingState variant="page" message="Calculando semáforos…" />
      </EicShell>
    );
  }

  return (
    <EicShell title="Estado de implementación">
      <PageSummary>
        <MetricCard label="Completas" value={consultant.completeCount} tone="green" />
        <MetricCard label="En progreso / pendientes" value={consultant.pendingCount} />
        <MetricCard label="Bloqueadas" value={consultant.blockedCount} />
        <MetricCard label="Tiempo estimado" value={consultant.estimatedLabel} tone="coffee" />
      </PageSummary>

      <PageSection title="Semáforos por dominio (criterios verificables)">
        <div className="eic-domain-grid eic-semaphore-grid">
          {[...chain, ...supporting].map((d) => (
            <div key={d.id} className={`eic-domain-card eic-live-card-${d.status}`}>
              <span className="kpi-label">{d.label}</span>
              <StatusBadge status={d.status} />
              <span className="muted">{d.evidence}</span>
            </div>
          ))}
        </div>
        <p className="muted eic-hint">
          No se usan porcentajes arbitrarios. Cada semáforo deriva de conteos y disponibilidad de centros existentes
          (usuarios, precios, bodegas, productores, procesos, inventario del día, etc.).
        </p>
      </PageSection>

      <PageSection title="Señales operativas (mismas que Operación / Gerencia)">
        <PageSummary>
          <MetricCard label="Cola" value={signals.queueLength} />
          <MetricCard label="Tickets hoy" value={signals.ticketsToday} tone="coffee" />
          <MetricCard label="Kg hoy" value={signals.kgToday.toFixed(0)} />
          <MetricCard label="Liquidaciones" value={signals.settlementsToday} />
          <MetricCard label="Bodegas" value={signals.warehouses} />
          <MetricCard label="Artículos" value={signals.items} />
        </PageSummary>
      </PageSection>

      <DependencyChain chain={chain} />
    </EicShell>
  );
}

export function ImplementationGoLivePage() {
  const snap = useImplementationEngine();
  const { loaded, chain, consultant, certified, certifiedAt, signals, refresh } = snap;
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const prueba = chain.find((d) => d.id === 'prueba');
  const prerequisites = chain.filter((d) => d.id !== 'golive');

  const certify = () => {
    const result = certifyGoLive(note, consultant);
    if (!result.ok) {
      setError(result.error ?? 'No se puede certificar');
      return;
    }
    setError('');
    refresh();
  };

  const revoke = () => {
    revokeGoLiveCertification();
    refresh();
  };

  if (!loaded) {
    return (
      <EicShell title="Go Live">
        <LoadingState variant="page" message="Verificando prerrequisitos…" />
      </EicShell>
    );
  }

  return (
    <EicShell title="Go Live — Certificación">
      {certified ? (
        <PageSection title="Empresa lista para operar">
          <div className="eic-certified">
            <h2>✓ Empresa lista para operar</h2>
            <p className="muted">
              Certificación registrada en este navegador
              {certifiedAt ? ` · ${new Date(certifiedAt).toLocaleString()}` : ''}.
            </p>
            {!consultant.canCertify ? (
              <p className="eic-live-risk">
                Atención: hay bloqueos visibles otra vez. Revise el checklist antes de operar en producción.
              </p>
            ) : null}
            <div className="row-actions">
              <Link to="/operacion" className="btn btn-primary">
                Ir a Mi día
              </Link>
              <button type="button" className="btn btn-ghost" onClick={revoke}>
                Revocar certificación
              </button>
            </div>
          </div>
        </PageSection>
      ) : (
        <PageSection title="Certificación">
          <PageSummary>
            <MetricCard
              label="¿Se puede certificar?"
              value={consultant.canCertify ? 'Sí' : 'No'}
              tone={consultant.canCertify ? 'green' : 'coffee'}
            />
            <MetricCard label="Bloqueantes" value={consultant.certifyBlockers.length} />
            <MetricCard label="Prueba operativa" value={prueba ? implementationStatusLabel(prueba.status) : '—'} />
            <MetricCard label="Inventario hoy" value={signals.inventoryToday} hint="Evidencia de ciclo completo" />
          </PageSummary>

          {!consultant.canCertify ? (
            <div className="eic-cert-blocked">
              <p>
                <strong>No se puede indicar «Empresa lista»</strong> mientras existan bloqueos verificables:
              </p>
              <ul className="eoc-list">
                {consultant.certifyBlockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyPanel
              title="Prerrequisitos cumplidos"
              description="La cadena crítica está completa según criterios verificables. Puede registrar la certificación."
            />
          )}

          {error ? <p className="eic-live-risk">{error}</p> : null}

          <label className="eic-cert-note">
            Notas de certificación (jornada piloto, observaciones)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={certify}
            disabled={!consultant.canCertify}
          >
            Certificar empresa lista
          </button>
          <p className="muted eic-hint">
            La certificación es evidencia de producto en el cliente. No modifica permisos ni APIs. El botón permanece
            deshabilitado si hay bloqueos.
          </p>
        </PageSection>
      )}

      <PageSection title="Prerrequisitos de la cadena">
        <div className="eic-domain-grid">
          {prerequisites.map((d) => (
            <div key={d.id} className={`eic-domain-card eic-live-card-${d.status}`}>
              <span className="kpi-label">{d.label}</span>
              <StatusBadge status={d.status} />
              <span className="muted">{d.evidence}</span>
              {d.status !== 'complete' ? <Link to={d.href}>Resolver</Link> : null}
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Riesgos y complementarios">
        {consultant.alerts.length === 0 ? (
          <EmptyPanel title="Sin riesgos abiertos" description="No hay alertas de implementación pendientes." />
        ) : (
          <ul className="emc-alerts">
            {consultant.alerts.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <span className="muted"> — {a.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection title="Jornada piloto">
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
            <Link to="/gerencia">Resumen ejecutivo</Link>
          </li>
        </ol>
        <p className="muted">
          Evidencia actual: tickets {signals.ticketsToday}, pesados {signals.weighedToday}, calidad{' '}
          {signals.qualityToday}, liquidaciones {signals.settlementsToday}, inventario {signals.inventoryToday}.
        </p>
      </PageSection>

      <DependencyChain chain={chain} />
    </EicShell>
  );
}
