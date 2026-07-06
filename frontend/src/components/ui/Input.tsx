import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function Input({
  label,
  hint,
  error,
  required,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`form-group ds-field${error ? ' has-error' : ''}`}>
      {label ? (
        <label htmlFor={inputId} className="ds-field-label">
          {label}
          {required ? <span className="ds-field-required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`ds-input${error ? ' ds-input-error' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        required={required}
        {...props}
      />
      {hint && !error ? (
        <span id={`${inputId}-hint`} className="ds-field-hint">{hint}</span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} className="ds-field-error" role="alert">{error}</span>
      ) : null}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function Textarea({ label, hint, error, required, id, className = '', ...props }: TextareaProps) {
  const inputId = id ?? (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`form-group ds-field${error ? ' has-error' : ''}`}>
      {label ? (
        <label htmlFor={inputId} className="ds-field-label">
          {label}
          {required ? <span className="ds-field-required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={`ds-input${error ? ' ds-input-error' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        required={required}
        {...props}
      />
      {hint && !error ? <span className="ds-field-hint">{hint}</span> : null}
      {error ? <span className="ds-field-error" role="alert">{error}</span> : null}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Select({ label, hint, error, required, id, className = '', children, ...props }: SelectProps) {
  const inputId = id ?? (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`form-group ds-field${error ? ' has-error' : ''}`}>
      {label ? (
        <label htmlFor={inputId} className="ds-field-label">
          {label}
          {required ? <span className="ds-field-required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      <select
        id={inputId}
        className={`ds-input${error ? ' ds-input-error' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        required={required}
        {...props}
      >
        {children}
      </select>
      {hint && !error ? <span className="ds-field-hint">{hint}</span> : null}
      {error ? <span className="ds-field-error" role="alert">{error}</span> : null}
    </div>
  );
}
