import {
  FORM_LIFECYCLE_STEPS,
  getActiveLifecycleStep,
  getLifecycleStepIndex,
  type FormLifecycleStepId,
} from '../../form-studio/form-lifecycle';

interface Props {
  status: string;
  compact?: boolean;
  highlightFrom?: FormLifecycleStepId;
}

export function FormLifecycleStepper({ status, compact, highlightFrom }: Props) {
  const active = getActiveLifecycleStep(status);
  const activeIdx = getLifecycleStepIndex(active);
  const fromIdx = highlightFrom ? getLifecycleStepIndex(highlightFrom) : 0;

  return (
    <div className={`form-lifecycle-stepper${compact ? ' compact' : ''}`} aria-label="Ciclo de vida del formulario">
      <ol className="form-lifecycle-steps">
        {FORM_LIFECYCLE_STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const current = idx === activeIdx;
          const upcoming = idx > activeIdx;
          const fromTemplate = idx === 0 && fromIdx === 0 && status === 'draft';
          return (
            <li
              key={step.id}
              className={[
                'form-lifecycle-step',
                done ? 'done' : '',
                current ? 'current' : '',
                upcoming ? 'upcoming' : '',
                fromTemplate ? 'from-template' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="form-lifecycle-dot" aria-hidden />
              <div className="form-lifecycle-step-text">
                <strong>{step.label}</strong>
                {!compact ? <span className="muted">{step.hint}</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
