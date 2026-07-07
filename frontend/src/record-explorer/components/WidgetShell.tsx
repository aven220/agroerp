interface WidgetShellProps {
  title: string;
  id?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}

export function WidgetShell({
  title,
  id,
  children,
  empty,
  emptyMessage = 'Sin datos',
}: WidgetShellProps) {
  return (
    <section className="ure-widget card" id={id}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {empty ? <p className="ure-empty">{emptyMessage}</p> : children}
      </div>
    </section>
  );
}
