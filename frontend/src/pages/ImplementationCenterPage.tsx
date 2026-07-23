import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Link2,
  Package,
  Settings,
  Shield,
  Users,
  Workflow,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  PageLayout,
  PageSection,
  PageSummary,
  MetricCard,
  EmptyPanel,
} from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { useExperienceCenterOptional } from '../context/ExperienceCenterContext';
import { useAuth } from '../context/AuthContext';
import { AdminPage } from './AdminPage';
import { updateOrgProductLicense } from '../api/organization';
import {
  PACKAGE_OPTIONS,
  PRODUCT_MODULES,
  defaultModulesForPackage,
  type ProductPackageId,
} from '../config/productModules';
import {
  certifyGoLive,
  implementationStatusLabel,
  revokeGoLiveCertification,
  useImplementationEngine,
  ImplementationEngineProvider,
  type DomainStatus,
  type ImplementationDomain,
} from '../lib/implementationEngine';
import {
  EMPTY_COMPANY_PROFILE,
  REQUIRED_COOP_ROLES,
  loadCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from '../lib/companyProfile';
import { seedCoffeeConfig } from '../api/coffee';
import { seedEims } from '../api/eims';

const EIC_SECTIONS = [
  { to: '/implementacion', label: 'Resumen', end: true, icon: LayoutDashboard },
  { to: '/implementacion/empresa', label: 'Empresa', icon: Building2 },
  { to: '/implementacion/usuarios', label: 'Usuarios', icon: Users },
  { to: '/implementacion/roles', label: 'Roles', icon: Shield },
  { to: '/implementacion/configuracion', label: 'Configuración', icon: Settings },
  { to: '/implementacion/procesos', label: 'Procesos', icon: Workflow },
  { to: '/implementacion/documentos', label: 'Documentos', icon: FileText },
  { to: '/implementacion/integraciones', label: 'Integraciones', icon: Link2 },
  { to: '/implementacion/modulos', label: 'Paquete', icon: Package },
  { to: '/implementacion/estado', label: 'Estado', icon: ClipboardList },
  { to: '/implementacion/go-live', label: 'Go Live', icon: CheckCircle2 },
];

function EicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <ImplementationEngineProvider>
      <Header
        title={title}
        subtitle={subtitle ?? 'Centro de Implementación'}
        description="Configure, verifique y certifique que la empresa está lista para operar."
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <nav className="eic-enterprise-tabs" aria-label="Secciones de implementación">
            {EIC_SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end={s.end}
                  className={({ isActive }) => `eic-tab${isActive ? ' is-active' : ''}`}
                >
                  <Icon size={15} strokeWidth={1.75} className="eic-tab-icon" aria-hidden />
                  <span className="eic-tab-label">{s.label}</span>
                </NavLink>
              );
            })}
          </nav>
        }
      >
        {children}
      </PageLayout>
    </ImplementationEngineProvider>
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
  return (
    <EicShell title="Centro de implementación">
      <ImplementationSummaryBody />
    </EicShell>
  );
}

function ImplementationSummaryBody() {
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
    return <LoadingState variant="page" message="Calculando checklist vivo de la empresa…" />;
  }

  return (
    <>
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
    </>
  );
}

function GuideStep({
  title,
  missing,
  why,
  ifNot,
  depends,
  validate,
  actionLabel,
  to,
  optional,
  unavailable,
}: {
  title: string;
  missing: boolean;
  why: string;
  ifNot: string;
  depends: string;
  validate: string;
  actionLabel: string;
  to?: string;
  optional?: boolean;
  unavailable?: string;
}) {
  return (
    <div className={`eic-spotlight${missing && !optional ? '' : ''}`}>
      <p>
        <strong>{title}</strong>{' '}
        {unavailable ? (
          <span className="muted">— {unavailable}</span>
        ) : missing ? (
          optional ? (
            <span className="muted">— opcional / pendiente</span>
          ) : (
            <span className="eic-live-risk">— falta</span>
          )
        ) : (
          <span>✓ listo</span>
        )}
      </p>
      <ul className="eoc-list">
        <li>
          <strong>Qué falta / estado:</strong> {unavailable ?? (missing ? 'Pendiente' : 'Completo')}
        </li>
        <li>
          <strong>Por qué:</strong> {why}
        </li>
        <li>
          <strong>Si no existe:</strong> {ifNot}
        </li>
        <li>
          <strong>Depende de:</strong> {depends}
        </li>
        <li>
          <strong>Cómo validar:</strong> {validate}
        </li>
      </ul>
      {to && !unavailable ? (
        <Link to={to} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ImplementationEmpresaPage() {
  return (
    <EicShell title="Empresa">
      <ImplementationEmpresaBody />
    </EicShell>
  );
}

function ImplementationEmpresaBody() {
  const { refresh, signals, loaded } = useImplementationEngine();
  const [form, setForm] = useState<CompanyProfile>({ ...EMPTY_COMPANY_PROFILE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    loadCompanyProfile().then(setForm).catch(() => setForm({ ...EMPTY_COMPANY_PROFILE }));
  }, []);

  useEffect(() => {
    if (signals.company) setForm(signals.company);
  }, [signals.company]);

  const set =
    (key: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    try {
      await saveCompanyProfile(form);
      setOk('Datos de empresa guardados en la organización.');
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar. Se requiere permiso coffee:config:manage.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DomainSpotlight domainId="empresa" />
      <PageSection title="Ficha empresarial">
        {!loaded ? <LoadingState variant="card" message="Cargando ficha…" /> : null}
        <p className="muted eic-hint">
          Datos legales y operativos de la cooperativa. Se guardan en la organización (parámetro de
          configuración existente). La carga de logo por archivo no está disponible en esta versión.
        </p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {ok ? <div className="alert alert-success">{ok}</div> : null}
        <form className="form-grid" onSubmit={save}>
          <label>
            Razón social *
            <input required value={form.legalName} onChange={set('legalName')} />
          </label>
          <label>
            NIT *
            <input required value={form.taxId} onChange={set('taxId')} />
          </label>
          <label>
            Dirección
            <input value={form.address} onChange={set('address')} />
          </label>
          <label>
            Ciudad
            <input value={form.city} onChange={set('city')} />
          </label>
          <label>
            Departamento
            <input value={form.department} onChange={set('department')} />
          </label>
          <label>
            País
            <input value={form.country} onChange={set('country')} />
          </label>
          <label>
            Teléfono
            <input value={form.phone} onChange={set('phone')} />
          </label>
          <label>
            Correo
            <input type="email" value={form.email} onChange={set('email')} />
          </label>
          <label>
            Moneda *
            <select value={form.currency} onChange={set('currency')} required>
              <option value="COP">COP — Peso colombiano</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            Zona horaria *
            <select value={form.timezone} onChange={set('timezone')} required>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Lima">America/Lima</option>
              <option value="America/Guayaquil">America/Guayaquil</option>
            </select>
          </label>
          <label>
            Idioma
            <select value={form.language} onChange={set('language')}>
              <option value="es-CO">Español (Colombia)</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            Logo (URL)
            <input
              value={form.logoUrl}
              onChange={set('logoUrl')}
              placeholder="Opcional — pegue una URL"
            />
          </label>
          <p className="muted">
            Logo por archivo: <strong>No disponible en esta versión</strong>. Puede dejar URL vacía
            (opcional para Go Live).
          </p>
          <div className="row-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar empresa'}
            </button>
            <Link to="/implementacion/usuarios" className="btn">
              Siguiente: Usuarios
            </Link>
          </div>
        </form>
      </PageSection>
    </>
  );
}

export function ImplementationConfigPage() {
  return (
    <EicShell title="Configuración guiada">
      <ImplementationConfigBody />
    </EicShell>
  );
}

function ImplementationConfigBody() {
  const { signals, loaded, refresh } = useImplementationEngine();
  const [seedMsg, setSeedMsg] = useState('');
  const [seedErr, setSeedErr] = useState('');

  const runCoffeeSeed = () => {
    setSeedErr('');
    setSeedMsg('');
    seedCoffeeConfig()
      .then(() => {
        setSeedMsg('Configuración inicial de compras cargada.');
        refresh();
      })
      .catch((e) => setSeedErr(e instanceof Error ? e.message : 'No se pudo cargar seed de compras'));
  };

  const runEimsSeed = () => {
    setSeedErr('');
    setSeedMsg('');
    seedEims()
      .then(() => {
        setSeedMsg('Configuración inicial de inventario cargada.');
        refresh();
      })
      .catch((e) => setSeedErr(e instanceof Error ? e.message : 'No se pudo cargar seed de inventario'));
  };

  if (!loaded) {
    return <LoadingState variant="page" message="Evaluando qué falta…" />;
  }

  return (
    <>
      <DomainSpotlight domainId="configuracion" />
      {seedErr ? <div className="alert alert-error">{seedErr}</div> : null}
      {seedMsg ? <div className="alert alert-success">{seedMsg}</div> : null}

      <PageSection title="1. Compras">
        <GuideStep
          title="Centro, precios y catálogos"
          missing={!(signals.prices > 0 && signals.purchaseCenters > 0)}
          why="Sin precios y centro de compra no se puede recibir ni liquidar café."
          ifNot="La recepción falla o liquida con valores incorrectos."
          depends="Empresa y usuarios con permiso de configuración de compras"
          validate="Checklist: al menos 1 precio y 1 centro de compra"
          actionLabel="Ir a configuración de compras"
          to="/compras/config"
        />
        <div className="row-actions ds-mt-4">
          <button type="button" className="btn" onClick={runCoffeeSeed}>
            Cargar configuración inicial de compras
          </button>
          <Link to="/compras/config/precios" className="btn">
            Precios
          </Link>
          <Link to="/compras/config/centros" className="btn">
            Centros
          </Link>
          <Link to="/compras/balanzas" className="btn">
            Balanzas (opcional)
          </Link>
        </div>
      </PageSection>

      <PageSection title="2. Inventario">
        <GuideStep
          title="Bodega y artículo"
          missing={!(signals.warehouses > 0 && signals.items > 0)}
          why="Sin bodega y artículo no hay entrada de inventario tras liquidar."
          ifNot="El ciclo de compra no cierra en stock."
          depends="Compras configurada"
          validate="Al menos 1 bodega y 1 artículo"
          actionLabel="Ir a inventario"
          to="/inventario"
        />
        <div className="row-actions ds-mt-4">
          <button type="button" className="btn" onClick={runEimsSeed}>
            Cargar configuración inicial de inventario
          </button>
          <Link to="/inventario/bodegas" className="btn">
            Bodegas
          </Link>
          <Link to="/inventario/articulos" className="btn">
            Artículos
          </Link>
          <Link to="/inventario/movimientos" className="btn">
            Movimientos
          </Link>
        </div>
      </PageSection>

      <PageSection title="3. Workflow">
        <GuideStep
          title="Proceso de aprobación"
          missing={signals.workflows === 0}
          why="Las liquidaciones y excepciones necesitan un flujo publicado."
          ifNot="No hay bandeja de aprobaciones operativa."
          depends="Usuarios con roles de aprobación"
          validate="Al menos 1 definición de proceso"
          actionLabel="Ir a procesos"
          to="/procesos"
        />
      </PageSection>

      <PageSection title="4. Documentos">
        <GuideStep
          title="Evidencia y almacenamiento"
          missing={false}
          why="Los documentos de liquidación y productores quedan como evidencia."
          ifNot="Pierde trazabilidad documental."
          depends="Compras operativa"
          validate="Pantalla Documentos accesible; series N/D"
          actionLabel="Ir a documentos"
          to="/documentos"
          unavailable={undefined}
        />
        <p className="muted eic-hint">
          Series / numeración configurable: <strong>No disponible en esta versión</strong>. El
          almacenamiento de evidencia sí está operativo.
        </p>
      </PageSection>

      <PageSection title="Siguiente paso">
        <p>
          <strong>Acción siguiente:</strong>{' '}
          {signals.prices > 0 && signals.purchaseCenters > 0 && signals.warehouses > 0 && signals.items > 0
            ? 'Registrar productor y ejecutar prueba operativa'
            : 'Completar compras e inventario con los botones de arriba'}
        </p>
        <p className="muted">Tiempo estimado: 2–3 horas · Responsable: consultor funcional</p>
        <Link to="/productores" className="btn btn-primary">
          Ir a productores
        </Link>
      </PageSection>
    </>
  );
}

export function ImplementationUsuariosPage() {
  return (
    <EicShell title="Usuarios">
      <ImplementationUsuariosBody />
    </EicShell>
  );
}

function ImplementationUsuariosBody() {
  const { signals, loaded } = useImplementationEngine();
  return (
    <>
      <DomainSpotlight domainId="usuarios" />
      <PageSection title="Roles mínimos del paquete">
        {!loaded ? (
          <LoadingState variant="card" message="Verificando roles…" />
        ) : (
          <ul className="eoc-list">
            {REQUIRED_COOP_ROLES.map((r) => {
              const ok = !signals.requiredRolesMissing.includes(r.label);
              return (
                <li key={r.key}>
                  {ok ? '✓' : '○'} {r.label}
                  {!ok ? ' — créelo en Roles con ese nombre' : ''}
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted eic-hint">
          Cree o edite usuarios aquí. Restablecer contraseña: edite el usuario y asigne una nueva.
          Activar/desactivar: campo Estado. Ver permisos: configure el rol.
        </p>
        <Link to="/implementacion/roles" className="btn">
          Ir a roles y permisos
        </Link>
      </PageSection>
      <PageSection title="Gestión de usuarios">
        <AdminPage defaultTab="users" basePath="/implementacion" embedded />
      </PageSection>
    </>
  );
}

export function ImplementationRolesPage() {
  return (
    <EicShell title="Roles y permisos">
      <DomainSpotlight domainId="usuarios" />
      <PageSection title="Perfiles de acceso">
        <p className="muted eic-hint">
          Defina al menos: Administrador, Compras, Inventario, Calidad, Supervisor, Consulta. Asigne
          permisos y luego cree usuarios.
        </p>
        <AdminPage defaultTab="roles" basePath="/implementacion" embedded />
      </PageSection>
    </EicShell>
  );
}

export function ImplementationModulosPage() {
  const experience = useExperienceCenterOptional();
  const { hasPermission, refreshProfile } = useAuth();
  const canEdit = hasPermission('organization:update');

  const [packageId, setPackageId] = useState<ProductPackageId>(
    () => experience?.packageId ?? 'coop-cafe-co',
  );
  const [enabledModules, setEnabledModules] = useState<string[]>(
    () => experience?.enabledModules ?? defaultModulesForPackage('coop-cafe-co'),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experience) return;
    setPackageId(experience.packageId);
    setEnabledModules(
      experience.packageId === 'custom'
        ? experience.enabledModules
        : defaultModulesForPackage(experience.packageId),
    );
  }, [experience?.packageId, experience?.enabledModules]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleModule = (id: string) => {
    setEnabledModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onPackageChange = (next: ProductPackageId) => {
    setPackageId(next);
    if (next !== 'custom') {
      setEnabledModules(defaultModulesForPackage(next));
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await updateOrgProductLicense({
        packageId,
        enabledModules: packageId === 'custom' ? enabledModules : [],
      });
      experience?.applyOrgLicense({
        packageId: saved.packageId,
        enabledModules: saved.enabledModules,
      });
      await refreshProfile().catch(() => undefined);
      setMessage('Paquete de la empresa guardado. Aplica a todos los usuarios de esta organización.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el paquete');
    } finally {
      setSaving(false);
    }
  };

  const activeLabel =
    PACKAGE_OPTIONS.find((p) => p.id === packageId)?.label ?? packageId;

  return (
    <EicShell title="Paquete contratado">
      <PageSection title="Licencia de la organización">
        <PageSummary>
          <MetricCard label="Paquete activo" value={activeLabel} tone="coffee" />
          <MetricCard
            label="Módulos"
            value={
              packageId === 'full-platform'
                ? 'Todos'
                : String(
                    packageId === 'custom'
                      ? enabledModules.length
                      : defaultModulesForPackage(packageId).length,
                  )
            }
          />
        </PageSummary>
        <p className="muted eic-hint">
          Este ajuste se guarda en la <strong>empresa</strong> (no en el navegador). Define a qué
          módulos pueden entrar los usuarios de esta organización. Los permisos IAM siguen aplicando
          encima.
        </p>

        {!canEdit ? (
          <div className="alert alert-error" role="status">
            Solo un administrador con permiso <code>organization:update</code> puede cambiar el
            paquete.
          </div>
        ) : null}

        <fieldset className="ds-prefs-fieldset" style={{ marginTop: 16 }}>
          <legend>Tipo de paquete</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PACKAGE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className="ds-prefs-label"
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${packageId === opt.id ? 'var(--ds-primary)' : 'var(--ds-border)'}`,
                  background:
                    packageId === opt.id
                      ? 'color-mix(in srgb, var(--ds-primary) 8%, transparent)'
                      : 'transparent',
                  cursor: canEdit ? 'pointer' : 'default',
                }}
              >
                <input
                  type="radio"
                  name="org-package"
                  checked={packageId === opt.id}
                  disabled={!canEdit}
                  onChange={() => onPackageChange(opt.id)}
                />
                <span>
                  <strong style={{ display: 'block' }}>{opt.label}</strong>
                  <span className="muted" style={{ fontSize: '0.8125rem' }}>
                    {opt.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="ds-prefs-fieldset" style={{ marginTop: 20 }}>
          <legend>Módulos incluidos</legend>
          <p className="muted eic-hint">
            {packageId === 'custom'
              ? 'Marque los módulos contratados para esta empresa.'
              : 'Vista previa según el paquete. Cambie a Personalizado para editar módulo a módulo.'}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 10,
            }}
          >
            {PRODUCT_MODULES.map((mod) => {
              const checked =
                packageId === 'full-platform'
                  ? true
                  : packageId === 'coop-cafe-co'
                    ? Boolean(mod.inCoopPilot)
                    : enabledModules.includes(mod.id);
              const locked = packageId !== 'custom' || !canEdit;
              return (
                <label
                  key={mod.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid var(--ds-border)',
                    opacity: checked ? 1 : 0.55,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggleModule(mod.id)}
                  />
                  <span>
                    <strong style={{ display: 'block', fontSize: '0.875rem' }}>{mod.label}</strong>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>
                      {mod.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {message ? (
          <div className="alert alert-success" role="status" style={{ marginTop: 16 }}>
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="alert alert-error" role="alert" style={{ marginTop: 16 }}>
            {error}
          </div>
        ) : null}

        {canEdit ? (
          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Guardando…' : 'Guardar paquete de la empresa'}
            </button>
          </div>
        ) : null}
      </PageSection>
    </EicShell>
  );
}

export function ImplementationProcesosPage() {
  return (
    <EicShell title="Procesos">
      <ImplementationProcesosBody />
    </EicShell>
  );
}

function ImplementationProcesosBody() {
  const { signals } = useImplementationEngine();
  return (
    <>
      <DomainSpotlight domainId="workflow" />
      <PageSection title="Asistente de workflow">
        <GuideStep
          title="Publicar un proceso"
          missing={signals.workflows === 0}
          why="Sin proceso no hay aprobaciones formales."
          ifNot="Excepciones y liquidaciones quedan sin control."
          depends="Roles de supervisor/admin"
          validate="Lista de procesos con al menos una definición"
          actionLabel="Abrir procesos"
          to="/procesos"
        />
        <div className="row-actions ds-mt-4">
          <Link to="/procesos/nuevo" className="btn">
            Crear proceso
          </Link>
          <Link to="/procesos/bandeja" className="btn">
            Bandeja
          </Link>
        </div>
      </PageSection>
    </>
  );
}

export function ImplementationDocumentosPage() {
  return (
    <EicShell title="Documentos">
      <DomainSpotlight domainId="documentos" />
      <PageSection title="Asistente de documentos">
        <GuideStep
          title="Almacenamiento de evidencia"
          missing={false}
          why="Conserva liquidaciones y soportes del productor."
          ifNot="Pierde trazabilidad ante auditoría."
          depends="Compras"
          validate="Pantalla Documentos responde"
          actionLabel="Abrir documentos"
          to="/documentos"
        />
        <GuideStep
          title="Series y numeración"
          missing
          why="Numeración formal de documentos fiscales/operativos."
          ifNot="No hay control de consecutivos configurables."
          depends="—"
          validate="—"
          actionLabel=""
          unavailable="No disponible en esta versión"
        />
        <GuideStep
          title="Plantillas"
          missing
          why="Formatos reutilizables de documentos."
          ifNot="Se usan documentos generados por el flujo de compras."
          depends="—"
          validate="—"
          actionLabel=""
          unavailable="No disponible como configuración independiente en esta versión"
        />
      </PageSection>
    </EicShell>
  );
}

export function ImplementationIntegracionesPage() {
  return (
    <EicShell title="Integraciones">
      <ImplementationIntegracionesBody />
    </EicShell>
  );
}

function ImplementationIntegracionesBody() {
  const { signals } = useImplementationEngine();
  return (
    <>
      <DomainSpotlight domainId="integraciones" />
      <PageSection title="Conectividad operativa">
        <GuideStep
          title="Balanzas"
          missing={signals.scales === 0}
          why="Automatiza el pesaje en recepción."
          ifNot="Se opera pesaje manual (válido para piloto)."
          depends="Compras"
          validate="Al menos una balanza registrada"
          actionLabel="Ir a balanzas"
          to="/compras/balanzas"
          optional
        />
        <p className="muted eic-hint">
          SMTP / conectores genéricos: <strong>No disponible en el paquete cooperativa</strong> (fuera
          de perímetro). No se ofrecen enlaces a módulos bloqueados.
        </p>
      </PageSection>
    </>
  );
}

export function ImplementationEstadoPage() {
  return (
    <EicShell title="Estado de implementación">
      <ImplementationEstadoBody />
    </EicShell>
  );
}

function ImplementationEstadoBody() {
  const { loaded, chain, supporting, consultant, signals } = useImplementationEngine();

  if (!loaded) {
    return <LoadingState variant="page" message="Calculando semáforos…" />;
  }

  return (
    <>
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
    </>
  );
}

export function ImplementationGoLivePage() {
  return (
    <EicShell title="Go Live — Certificación">
      <ImplementationGoLiveBody />
    </EicShell>
  );
}

function ImplementationGoLiveBody() {
  const snap = useImplementationEngine();
  const { loaded, chain, consultant, certified, certifiedAt, signals, refresh } = snap;
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const prueba = chain.find((d) => d.id === 'prueba');
  const prerequisites = chain.filter((d) => d.id !== 'golive');

  const certify = async () => {
    const result = await certifyGoLive(note, consultant);
    if (!result.ok) {
      setError(result.error ?? 'No se puede certificar');
      return;
    }
    setError('');
    refresh();
  };

  const revoke = async () => {
    const result = await revokeGoLiveCertification();
    if (!result.ok) {
      setError(result.error ?? 'No se pudo revocar');
      return;
    }
    setError('');
    refresh();
  };

  if (!loaded) {
    return <LoadingState variant="page" message="Verificando prerrequisitos…" />;
  }

  return (
    <>
      {certified ? (
        <PageSection title="Empresa lista para operar">
          <div className="eic-certified">
            <h2>✓ Empresa lista para operar</h2>
            <p className="muted">
              Certificación registrada en la organización
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
    </>
  );
}
