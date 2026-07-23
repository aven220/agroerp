import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getPageExperience } from '../../config/pageExperience';
import { buildBreadcrumbs } from '../../config/navigation';
import { humanizeCopy } from '../../lib/humanizeCopy';
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
  lastUpdated?: string;
  showChrome?: boolean;
}

/**
 * PM-42 — Header de página (bajo el TopBar).
 * Breadcrumb · Título · Acciones. Sin hamburguesa. Sin ayuda fija.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  help,
  nextStep,
  actions,
  breadcrumb,
  showExperience = false,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const auto = getPageExperience(pathname);
  const desc = description ?? auto?.description;
  const helpText = help ?? auto?.help;
  const step = nextStep ?? auto?.nextStep;
  const displayTitle = humanizeCopy(title);
  const displaySubtitle = subtitle ? humanizeCopy(subtitle) : undefined;
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setHelpOpen(false);
  }, [pathname]);

  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const crumbNode = breadcrumb ?? (crumbs.length > 0 ? <Breadcrumbs /> : null);

  return (
    <header className="topbar page-topbar page-layout-header page-header-pm42">
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

        {showExperience && (helpText || step) ? (
          <div className="page-header-experience">
            {step ? (
              <p className="page-header-next">
                Siguiente: <Link to={step.to}>{humanizeCopy(step.label)}</Link>
              </p>
            ) : null}
            {helpText ? (
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
                    <p>{humanizeCopy(helpText)}</p>
                    <p>
                      <Link to="/ayuda">Ir al Centro de ayuda</Link>
                    </p>
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
