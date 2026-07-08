import type { ReactNode } from 'react';
import { useInspectorContext } from './InspectorContext';

export function InspectorHeader() {
  const { view } = useInspectorContext();

  if (!view) return null;

  return (
    <header className="inspector-header">
      <div className="inspector-header-main">
        <h3>{view.title}</h3>
        {view.subtitle ? <p className="muted inspector-header-subtitle">{view.subtitle}</p> : null}
      </div>
      <span className="badge inspector-type-badge">{view.type}</span>
    </header>
  );
}

export interface InspectorHeaderSlotProps {
  title?: string;
  subtitle?: string | null;
  typeLabel?: string;
  children?: ReactNode;
}

export function InspectorHeaderSlot({
  title = 'Propiedades',
  subtitle,
  typeLabel,
  children,
}: InspectorHeaderSlotProps) {
  return (
    <header className="inspector-header">
      <div className="inspector-header-main">
        <h3>{title}</h3>
        {subtitle ? <p className="muted inspector-header-subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {typeLabel ? <span className="badge inspector-type-badge">{typeLabel}</span> : null}
    </header>
  );
}
