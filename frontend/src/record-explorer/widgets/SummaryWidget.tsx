import type { UreRecordSummary } from '../types';

interface SummaryWidgetProps {
  summary: UreRecordSummary;
}

export function SummaryWidget({ summary }: SummaryWidgetProps) {
  return (
    <div className="ure-summary">
      <div className="ure-summary-head">
        <div>
          <span className="ure-entity-type">{summary.entityType}</span>
          <h2 className="ure-summary-title">{summary.title}</h2>
          {summary.subtitle ? <p className="ure-summary-sub">{summary.subtitle}</p> : null}
        </div>
        {summary.status ? (
          <span className="ure-status-badge">{summary.status}</span>
        ) : null}
      </div>
      {summary.badges && summary.badges.length > 0 ? (
        <div className="ure-badges">
          {summary.badges.map((badge) => (
            <span key={badge} className="ure-badge">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {summary.kpis && summary.kpis.length > 0 ? (
        <div className="ure-kpi-row">
          {summary.kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card ure-kpi">
              <span className="ure-kpi-label">{kpi.label}</span>
              <strong className="ure-kpi-value">{kpi.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
