import type { InputHTMLAttributes } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Switch({ label, id, className = '', ...props }: SwitchProps) {
  const switchId = id ?? `switch-${label?.replace(/\s+/g, '-').toLowerCase() ?? 'toggle'}`;

  return (
    <label className={`ds-switch ${className}`.trim()} htmlFor={switchId}>
      <input type="checkbox" role="switch" id={switchId} {...props} />
      <span className="ds-switch-track" aria-hidden />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, id, className = '', ...props }: CheckboxProps) {
  const checkId = id ?? `check-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`ds-checkbox ${className}`.trim()}>
      <label htmlFor={checkId}>
        <input type="checkbox" id={checkId} {...props} />
        {label}
      </label>
    </div>
  );
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Radio({ label, id, className = '', ...props }: RadioProps) {
  const radioId = id ?? `radio-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`ds-radio ${className}`.trim()}>
      <label htmlFor={radioId}>
        <input type="radio" id={radioId} {...props} />
        {label}
      </label>
    </div>
  );
}
