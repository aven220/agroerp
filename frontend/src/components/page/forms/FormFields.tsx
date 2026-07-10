import type { ReactNode } from 'react';

interface FieldGroupProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FieldGroup({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = '',
}: FieldGroupProps) {
  const hasError = Boolean(error);
  return (
    <div className={`form-group ds-field${hasError ? ' has-error' : ''} ${className}`.trim()}>
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {required ? <span className="required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

export function FieldSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="edw-form-section form-section field-section">
      <SectionTitle>{title}</SectionTitle>
      {description ? <p className="field-hint ds-mb-4">{description}</p> : null}
      <div className="edw-form-section-body">{children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="form-section-title page-section-title">{children}</h3>;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="field-hint ds-field-hint">{children}</span>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return <span className="field-error ds-field-error" role="alert">{children}</span>;
}

interface FormActionsProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function FormActions({ children, sticky = true, className = '' }: FormActionsProps) {
  const classes = [
    'form-actions',
    sticky ? 'edw-form-actions' : '',
    className,
  ].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

export const StickyActions = FormActions;

export function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-field form-group">
      <span className="ds-field-label">{label}</span>
      <div className="info-field-value">{value ?? '—'}</div>
    </div>
  );
}

export function ReadonlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <FieldGroup label={label}>
      <input
        readOnly
        className="readonly"
        value={value == null || value === '' ? '—' : String(value)}
        aria-readonly="true"
      />
    </FieldGroup>
  );
}
