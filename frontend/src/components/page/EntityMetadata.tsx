import type { ReactNode } from 'react';

interface EntityMetadataProps {
  children: ReactNode;
  className?: string;
}

/** Score chips / quick metadata row on entity detail pages */
export function EntityMetadata({ children, className = '' }: EntityMetadataProps) {
  return (
    <div className={`detail-scores entity-metadata chip-row ${className}`.trim()} role="group">
      {children}
    </div>
  );
}

export function MetadataChip({ children }: { children: ReactNode }) {
  return <span className="score-chip">{children}</span>;
}
