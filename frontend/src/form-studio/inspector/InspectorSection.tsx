import type { ReactNode } from 'react';
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
  return (
    <section className="inspector-section">
      <details className="inspector-section-details" open={!defaultCollapsed && !group.collapsed}>
        <summary className="inspector-section-summary">{group.title}</summary>
        <div className="inspector-section-body">{children}</div>
      </details>
    </section>
  );
}
