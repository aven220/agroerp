interface ProgressProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  label?: string;
  className?: string;
}

export function Progress({ value = 0, max = 100, indeterminate, label, className = '' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {label ? (
        <div className="ds-label" style={{ marginBottom: '0.35rem' }}>{label}</div>
      ) : null}
      <div
        className={`ds-progress${indeterminate ? ' ds-progress-indeterminate' : ''}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div className="ds-progress-bar" style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  );
}
