import type { ReactNode } from 'react';

export interface InspectorPropertyProps {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}

export function InspectorProperty({
  id,
  label,
  description,
  children,
}: InspectorPropertyProps) {
  return (
    <div className="form-group inspector-property" data-inspector-property={id}>
      <label htmlFor={id}>{label}</label>
      {description ? <p className="muted inspector-property-description">{description}</p> : null}
      <div className="inspector-property-control">{children}</div>
    </div>
  );
}
