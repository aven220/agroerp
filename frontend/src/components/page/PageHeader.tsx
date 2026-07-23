import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getPageExperience } from '../../config/pageExperience';
import { buildBreadcrumbs } from '../../config/navigation';
import { cacheCompanyProfile, readCachedCompanyProfile } from '../../config/navProgression';
import { humanizeCopy } from '../../lib/humanizeCopy';
import { loadCompanyProfile } from '../../lib/companyProfile';
import { useAuth } from '../../context/AuthContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { Breadcrumbs } from '../layout/Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  help?: string;
  nextStep?: { label: string; to: string };
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  showExperience?: boolean;
  /** ISO o texto libre; si omitido, usa hora de montaje de la página */
  lastUpdated?: string;
  /** Franja empresa/centro (oculta por defecto en PM-43) */
  showChrome?: boolean;
}

function formatUpdated(value?: string, fallback?: Date): string {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    }
    return value;
  }
  if (fallback) {
    return fallback.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
  return '—';
}

/**
 * PM-43 — Header de contenido: breadcrumb · título · descripción · acciones.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  help,
  nextStep,
  actions,
  breadcrumb,
  showExperience = true,
  lastUpdated,
  showChrome = false,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const experience = useExperienceCenterOptional();
  const auto = getPageExperience(pathname);
  const desc = description ?? auto?.description;
  const helpText = help ?? auto?.help;
  const step = nextStep ?? auto?.nextStep;
  const why = auto?.why;
  const when = auto?.when;
  const after = auto?.after;
  const displayTitle = humanizeCopy(title);
  const displaySubtitle = subtitle ? humanizeCopy(subtitle) : undefined;
  const [mountedAt] = useState(() => new Date());
  const [helpOpen, setHelpOpen] = useState(false);
  const [orgName, setOrgName] = useState(
    () => readCachedCompanyProfile()?.legalName || user?.organization?.name || 'Empresa',
  );

  useEffect(() => {
    let cancelled = false;
    loadCompanyProfile()
      .then((profile) => {
        if (cancelled) return;
        cacheCompanyProfile(profile);
        if (profile.legalName.trim()) setOrgName(profile.legalName.trim());
      })
      .catch(() => {
        /* silencioso */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const centerLabel = experience?.centerMeta.shortLabel ?? 'Operación';
  const crumbNode = breadcrumb ?? (crumbs.length > 0 ? <Breadcrumbs /> : null);

  return (
    <header className="topbar page-topbar page-layout-header page-header-pm43">
      {showChrome ? (
        <div className="page-chrome-bar" aria-label="Contexto de navegación">
          <span className="page-chrome-pill" title="Empresa">
            <span className="page-chrome-kicker">Empresa</span>
            {orgName}
          </span>
          <span className="page-chrome-pill" title="Área actual">
            <span className="page-chrome-kicker">Área</span>
            {centerLabel}
          </span>
          <span className="page-chrome-updated" title="Última actualización">
            Actualizado {formatUpdated(lastUpdated, mountedAt)}
          </span>
        </div>
      ) : null}

      {crumbNode ? <div className="page-header-breadcrumb">{crumbNode}</div> : null}

      <div className="page-topbar-main">
        <div className="page-header-title-row">
          <div className="page-header-titles">
            <h1>{displayTitle}</h1>
            {displaySubtitle ? <p className="topbar-sub">{displaySubtitle}</p> : null}
            {desc ? <p className="page-header-desc">{humanizeCopy(desc)}</p> : null}
          </div>
          {actions ? <div className="topbar-right page-actions">{actions}</div> : null}
        </div>

        {showExperience && (helpText || step || why || when || after) ? (
          <div className="page-header-experience">
            {step ? (
              <p className="page-header-next">
                Siguiente: <Link to={step.to}>{humanizeCopy(step.label)}</Link>
              </p>
            ) : null}
            {(helpText || why || when || after) ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm page-header-help-toggle"
                  aria-expanded={helpOpen}
                  onClick={() => setHelpOpen((v) => !v)}
                >
                  {helpOpen ? 'Ocultar ayuda' : 'Ayuda'}
                </button>
                {helpOpen ? (
                  <div className="page-header-help-detail">
                    {helpText ? <p>{humanizeCopy(helpText)}</p> : null}
                    {why ? <p>{humanizeCopy(why)}</p> : null}
                    {when ? <p>{humanizeCopy(when)}</p> : null}
                    {after ? <p>{humanizeCopy(after)}</p> : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
