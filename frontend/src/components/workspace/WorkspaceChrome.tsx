import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function WsKpi({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: string | number;
  to?: string;
  tone?: 'coffee' | 'teal' | 'warn' | 'ok';
}) {
  const inner = (
    <>
      <span className="ews-kpi-label">{label}</span>
      <strong className="ews-kpi-value">{value}</strong>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`ews-kpi ews-kpi-${tone ?? 'neutral'}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`ews-kpi ews-kpi-${tone ?? 'neutral'}`}>{inner}</div>;
}

export function WsCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  action?: { label: string; to: string };
}) {
  return (
    <section className="ews-card">
      <header className="ews-card-head">
        <h2>
          {icon ? <span aria-hidden>{icon}</span> : null} {title}
        </h2>
        {action ? (
          <Link to={action.to} className="ews-card-action">
            {action.label}
          </Link>
        ) : null}
      </header>
      <div className="ews-card-body">{children}</div>
    </section>
  );
}

export function WsList({
  items,
  empty,
}: {
  items: Array<{ id: string; label: string; meta?: string; to?: string }>;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="ews-empty">{empty}</p>;
  }
  return (
    <ul className="ews-list">
      {items.map((item) => (
        <li key={item.id}>
          {item.to ? (
            <Link to={item.to}>
              <strong>{item.label}</strong>
              {item.meta ? <span className="ews-meta">{item.meta}</span> : null}
            </Link>
          ) : (
            <>
              <strong>{item.label}</strong>
              {item.meta ? <span className="ews-meta">{item.meta}</span> : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function WsPrimaryAction({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn btn-primary ews-primary">
      {label}
    </Link>
  );
}
