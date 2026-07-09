import { useState, type ReactNode } from 'react';
import type { InspectorGroupDefinition } from './types';

export interface InspectorSectionProps {
  group: InspectorGroupDefinition;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function InspectorSection({
  group,
  defaultCollapsed = false,
  children,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed && !group.collapsed);

  return (
    <section className="inspector-section">
      <details
        className="inspector-section-details"
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="inspector-section-summary">{group.title}</summary>
        {open ? <div className="inspector-section-body">{children}</div> : null}
      </details>
    </section>
  );
}
