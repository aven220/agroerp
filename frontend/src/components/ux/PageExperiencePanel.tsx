import { Link, useLocation } from 'react-router-dom';
import { getPageExperience } from '../../config/pageExperience';
import { humanizeCopy } from '../../lib/humanizeCopy';

interface Props {
  /** Ocultar si la página ya muestra ayuda propia en el Header */
  hidden?: boolean;
}

export function PageExperiencePanel({ hidden }: Props) {
  const { pathname } = useLocation();
  const experience = getPageExperience(pathname);

  if (hidden || !experience) return null;

  return (
    <aside className="page-experience-panel" aria-label="Ayuda de esta pantalla">
      <p className="page-experience-desc">{humanizeCopy(experience.description)}</p>
      <p className="page-experience-help">
        <span className="page-experience-help-label" aria-hidden>💡</span>
        {humanizeCopy(experience.help)}
      </p>
      {experience.nextStep ? (
        <p className="page-experience-next">
          <span className="page-experience-next-label">Siguiente paso recomendado:</span>{' '}
          <Link to={experience.nextStep.to} className="page-experience-next-link">
            {humanizeCopy(experience.nextStep.label)}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
