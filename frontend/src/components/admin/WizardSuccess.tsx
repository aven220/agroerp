export interface WizardSuccessOption {
  id: string;
  label: string;
  description?: string;
  primary?: boolean;
  onClick: () => void;
}

interface WizardSuccessProps {
  title: string;
  message: string;
  question?: string;
  options?: WizardSuccessOption[];
  /** @deprecated use options */
  onYes?: () => void;
  /** @deprecated use options */
  onNo?: () => void;
  yesLabel?: string;
  noLabel?: string;
}

export function WizardSuccess({
  title,
  message,
  question,
  options,
  onYes,
  onNo,
  yesLabel = 'Sí',
  noLabel = 'No, gracias',
}: WizardSuccessProps) {
  const resolvedOptions: WizardSuccessOption[] =
    options ??
    (onYes && onNo
      ? [
          { id: 'yes', label: yesLabel, primary: true, onClick: onYes },
          { id: 'no', label: noLabel, onClick: onNo },
        ]
      : onNo
        ? [{ id: 'continue', label: noLabel, primary: true, onClick: onNo }]
        : []);

  return (
    <div className="admin-wizard-success" role="status">
      <div className="admin-wizard-success-animation" aria-hidden>
        <span className="admin-wizard-success-check">✓</span>
      </div>
      <h3>{title}</h3>
      <p className="muted">{message}</p>
      {question ? <p className="admin-wizard-success-question">{question}</p> : null}
      <div className="admin-wizard-success-options" role="list">
        {resolvedOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="listitem"
            className={`admin-wizard-success-option${opt.primary ? ' admin-wizard-success-option--primary' : ''}`}
            onClick={opt.onClick}
          >
            <span className="admin-wizard-success-option-radio" aria-hidden>
              ○
            </span>
            <span>
              <strong>{opt.label}</strong>
              {opt.description ? <span className="muted">{opt.description}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
