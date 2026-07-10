import type { ReactNode } from 'react';
import { PageHeader, type PageHeaderProps } from './PageHeader';
import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';

export interface EntityBadge {
  label: string;
  variant?: BadgeVariant;
}

interface EntityHeaderProps extends PageHeaderProps {
  badges?: EntityBadge[];
  meta?: ReactNode;
}

/** Entity detail/list header — PageHeader + optional badges */
export function EntityHeader({ badges, meta, ...headerProps }: EntityHeaderProps) {
  return (
    <>
      <PageHeader {...headerProps} />
      {badges?.length || meta ? (
        <div className="entity-header-meta ds-cluster ds-mb-4">
          {badges?.map((b) => (
            <Badge key={b.label} variant={b.variant}>{b.label}</Badge>
          ))}
          {meta}
        </div>
      ) : null}
    </>
  );
}
