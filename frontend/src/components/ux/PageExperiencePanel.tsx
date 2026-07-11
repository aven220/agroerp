import { Link, useLocation } from 'react-router-dom';
import { getPageExperience } from '../../config/pageExperience';
import { humanizeCopy } from '../../lib/humanizeCopy';

interface Props {
  /** Ocultar si la página ya muestra ayuda propia en el Header */
  hidden?: boolean;
}

/**
 * PM-28 — Ayuda contextual: qué / por qué / cuándo / después.
 */
export function PageExperiencePanel({ hidden }: Props) {
  const { pathname } = useLocation();
  const experience = getPageExperience(pathname);

  if (hidden || !experience) return null;

  return (
    <aside className="page-experience-panel" aria-label="Ayuda de esta pantalla">
      <p className="page-experience-desc">
        <span className="page-experience-q">¿Qué hago aquí?</span>{' '}
        {humanizeCopy(experience.description)}
      </p>
      {experience.why ? (
        <p className="page-experience-help">
          <span className="page-experience-q">¿Por qué existe?</span> {humanizeCopy(experience.why)}
        </p>
      ) : null}
      {experience.when ? (
        <p className="page-experience-help">
          <span className="page-experience-q">¿Cuándo la uso?</span> {humanizeCopy(experience.when)}
        </p>
      ) : null}
      {experience.after ? (
        <p className="page-experience-help">
          <span className="page-experience-q">¿Qué ocurre después?</span>{' '}
          {humanizeCopy(experience.after)}
        </p>
      ) : (
        <p className="page-experience-help">
          <span className="page-experience-help-label" aria-hidden>
            💡
          </span>
          {humanizeCopy(experience.help)}
        </p>
      )}
      {experience.nextStep ? (
        <p className="page-experience-next">
          <span className="page-experience-next-label">Siguiente paso recomendado:</span>{' '}
          <Link to={experience.nextStep.to} className="page-experience-next-link">
            {humanizeCopy(experience.nextStep.label)}
          </Link>
        </p>
      ) : null}
      <p className="page-experience-more">
        <Link to="/ayuda">Más ayuda por experiencia</Link>
      </p>
    </aside>
  );
}
