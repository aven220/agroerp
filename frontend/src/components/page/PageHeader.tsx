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
  /** Mostrar franja empresa / centro / crumb (PM-43) */
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
  showChrome = true,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const experience = useExperienceCenterOptional();
  const auto = getPageExperience(pathname);
  const desc = description ?? auto?.description;
  const helpText = help ?? auto?.help;
  const step = nextStep ?? auto?.nextStep;
  const displayTitle = humanizeCopy(title);
  const displaySubtitle = subtitle ? humanizeCopy(subtitle) : undefined;
  const [mountedAt] = useState(() => new Date());
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
        /* silencioso: usamos org del usuario */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const centerLabel = experience?.centerMeta.shortLabel ?? 'Operación';

  return (
    <header className="topbar page-topbar page-layout-header">
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
          <span className="page-chrome-crumb">
            {breadcrumb ?? (crumbs.length > 1 ? <Breadcrumbs /> : null)}
          </span>
          <span className="page-chrome-updated" title="Última actualización">
            Actualizado {formatUpdated(lastUpdated, mountedAt)}
          </span>
        </div>
      ) : breadcrumb ? (
        <div className="breadcrumbs page-topbar-crumb">{breadcrumb}</div>
      ) : null}

      <div className="page-topbar-main">
        <h1>{displayTitle}</h1>
        {displaySubtitle ? <p className="topbar-sub">{displaySubtitle}</p> : null}
        {showExperience && (desc || helpText) ? (
          <div className="page-header-experience">
            {desc ? <p className="page-header-desc">{humanizeCopy(desc)}</p> : null}
            {helpText ? (
              <p className="page-header-help">
                <span aria-hidden>💡</span> {humanizeCopy(helpText)}
              </p>
            ) : null}
            {step ? (
              <p className="page-header-next">
                Siguiente paso:{' '}
                <Link to={step.to}>{humanizeCopy(step.label)}</Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {actions ? <div className="topbar-right page-actions">{actions}</div> : null}
    </header>
  );
}
