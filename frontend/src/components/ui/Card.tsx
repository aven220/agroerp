import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  title,
  actions,
  footer,
  elevated,
  interactive,
  className = '',
  children,
  ...props
}: CardProps) {
  const classes = [
    'card',
    elevated ? 'card-elevated' : '',
    interactive ? 'card-interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {title || actions ? (
        <div className="card-header">
          {title ? <h3 className="ds-h3">{title}</h3> : <div />}
          {actions ? <div className="ds-cluster">{actions}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
