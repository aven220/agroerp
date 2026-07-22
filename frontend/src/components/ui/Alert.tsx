import type { HTMLAttributes, ReactNode } from 'react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variantClass: Record<AlertVariant, string> = {
  success: 'alert-success ds-alert-success',
  error: 'alert-error ds-alert-error',
  warning: 'alert-warn ds-alert-warning',
  info: 'alert-info ds-alert-info',
};

export function Alert({ variant = 'info', title, className = '', children, ...props }: AlertProps) {
  return (
    <div
      className={`alert ds-alert ${variantClass[variant]} ${className}`.trim()}
      role="alert"
      {...props}
    >
      <div>
        {title ? <strong className="ds-alert-title">{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
