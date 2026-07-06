import type { ReactNode } from 'react';

interface LegacyTableProps {
  gridId: string;
  title?: string;
  children: ReactNode;
}

/** Envuelve tablas HTML existentes con el shell visual del Enterprise Data Workspace. */
export function LegacyTable({ gridId, title, children }: LegacyTableProps) {
  return (
    <div className="edw-grid-wrap edw-legacy-wrap" data-grid-id={gridId} role="region" aria-label={title ?? 'Tabla de datos'}>
      {title ? <div className="edw-legacy-title ds-h4">{title}</div> : null}
      <div className="edw-table-scroll edw-legacy-scroll">{children}</div>
    </div>
  );
}
