import { Link, useLocation } from 'react-router-dom';
import { getPageExperience } from '../../config/pageExperience';
import { humanizeCopy } from '../../lib/humanizeCopy';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  help?: string;
  nextStep?: { label: string; to: string };
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  showExperience?: boolean;
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
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const auto = getPageExperience(pathname);
  const desc = description ?? auto?.description;
  const helpText = help ?? auto?.help;
  const step = nextStep ?? auto?.nextStep;
  const displayTitle = humanizeCopy(title);
  const displaySubtitle = subtitle ? humanizeCopy(subtitle) : undefined;

  return (
    <header className="topbar page-topbar page-layout-header">
      <div className="page-topbar-main">
        {breadcrumb ? <div className="breadcrumbs page-topbar-crumb">{breadcrumb}</div> : null}
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
