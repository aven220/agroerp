import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  default: '',
  success: 'ds-badge-success',
  warning: 'ds-badge-warning',
  error: 'ds-badge-error',
  info: 'ds-badge-info',
};

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span className={`badge ds-badge ${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
