import { useHelp } from '../../context/HelpContext';

export function OnboardingTour() {
  const { tourOpen, tourStep, steps, nextTourStep, skipTour } = useHelp();
  if (!tourOpen) return null;

  const step = steps[tourStep];
  if (!step) return null;

  return (
    <div className="ds-tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="ds-tour-backdrop" onClick={skipTour} aria-hidden />
      <div className="ds-tour-card ds-animate-scale-in">
        <div className="ds-tour-progress">
          Paso {tourStep + 1} de {steps.length}
        </div>
        <h2 id="tour-title" className="ds-tour-title">{step.title}</h2>
        <p className="ds-tour-body">{step.body}</p>
        <div className="ds-tour-actions">
          <button type="button" className="btn btn-ghost" onClick={skipTour}>
            Omitir tour
          </button>
          <button type="button" className="btn btn-primary" onClick={nextTourStep}>
            {tourStep >= steps.length - 1 ? 'Comenzar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
