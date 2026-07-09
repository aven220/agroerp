import type { WidgetDefinition } from '../contracts/widget-definition';

export interface WidgetShellProps {
  title: string;
  id?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Generic platform shell for card-based widgets.
 * Domain-specific shells (e.g. URE) may use their own CSS classes.
 */
export function WidgetShell({
  title,
  id,
  children,
  empty,
  emptyMessage = 'Aún no hay información para mostrar',
  className = 'widget-platform-shell card',
}: WidgetShellProps) {
  return (
    <section className={className} id={id}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {empty ? <p className="widget-platform-empty">{emptyMessage}</p> : children}
      </div>
    </section>
  );
}
