import type { ReactNode } from 'react';

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`page-section-title form-section-title ${className}`.trim()}>{children}</h3>;
}
