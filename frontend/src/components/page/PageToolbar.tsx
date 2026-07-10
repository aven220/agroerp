import type { ReactNode } from 'react';

interface PageToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageToolbar({ left, right, children, className = '' }: PageToolbarProps) {
  if (children) {
    return <div className={`page-toolbar ds-toolbar ${className}`.trim()}>{children}</div>;
  }

  return (
    <div className={`page-toolbar ds-toolbar ${className}`.trim()}>
      {left ? <div className="ds-toolbar-left">{left}</div> : null}
      {right ? <div className="ds-toolbar-right">{right}</div> : null}
    </div>
  );
}
