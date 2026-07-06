import { useMemo, useState, type ReactNode } from 'react';
import { Progress } from '../ui/Progress';

interface Step {
  id: string;
  title: string;
  content: ReactNode;
}

interface MobileFormWizardProps {
  title?: string;
  steps: Step[];
  onSubmit: () => void;
  onSaveDraft?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  dirty?: boolean;
}

export function MobileFormWizard({
  title,
  steps,
  onSubmit,
  onSaveDraft,
  onCancel,
  saving,
  dirty,
}: MobileFormWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / Math.max(steps.length, 1)) * 100),
    [stepIndex, steps.length],
  );

  return (
    <div className="mobile-form-wizard">
      {title ? <h2 className="mobile-wizard-title">{title}</h2> : null}
      <Progress value={progress} label={`Paso ${stepIndex + 1} de ${steps.length}: ${step?.title ?? ''}`} />
      {dirty ? <div className="alert alert-warn mobile-wizard-dirty">Cambios sin guardar</div> : null}
      <div className="mobile-wizard-step-header">
        <span className="mobile-wizard-step-label">{step?.title}</span>
      </div>
      <div className="mobile-wizard-body">{step?.content}</div>
      <div className="mobile-wizard-actions">
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        ) : null}
        {onSaveDraft ? (
          <button type="button" className="btn" disabled={saving} onClick={onSaveDraft}>Borrador</button>
        ) : null}
        {stepIndex > 0 ? (
          <button type="button" className="btn" onClick={() => setStepIndex((i) => i - 1)}>Anterior</button>
        ) : null}
        {stepIndex < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStepIndex((i) => i + 1)}>
            Siguiente
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={onSubmit}>
            {saving ? 'Enviando…' : 'Enviar'}
          </button>
        )}
      </div>
    </div>
  );
}
