import type { ReactNode } from 'react';

interface PageSummaryProps {
  children: ReactNode;
  className?: string;
}

/** KPI / metric row below entity header */
export function PageSummary({ children, className = '' }: PageSummaryProps) {
  return <div className={`kpi-grid page-summary ${className}`.trim()}>{children}</div>;
}

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'green' | 'teal' | 'coffee' | 'blue';
}

export function MetricCard({ label, value, hint, tone = 'default' }: MetricCardProps) {
  const toneClass = tone === 'default' ? '' : `kpi-${tone}`;
  return (
    <div className={`kpi-card ${toneClass}`.trim()}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {hint ? <small className="kpi-hint muted">{hint}</small> : null}
    </div>
  );
}
