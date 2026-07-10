import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { SectionTitle } from './SectionTitle';

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function PageSection({
  title,
  description,
  actions,
  footer,
  children,
  className = '',
  elevated,
}: PageSectionProps) {
  return (
    <Card
      title={title}
      actions={actions}
      footer={footer}
      elevated={elevated}
      className={`page-section ${className}`.trim()}
    >
      {description ? <p className="page-header-desc ds-mb-4">{description}</p> : null}
      {!title && description ? null : null}
      {children}
    </Card>
  );
}

/** Section block without card chrome — for detail grids */
export function PageSectionPlain({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`detail-section page-section-plain ${className}`.trim()}>
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      {children}
    </section>
  );
}
