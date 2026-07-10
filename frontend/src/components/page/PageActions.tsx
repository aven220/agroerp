import type { ReactNode } from 'react';

export function PageActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`row-actions page-actions ${className}`.trim()}>{children}</div>;
}
