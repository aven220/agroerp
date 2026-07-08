import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WidgetShell } from '../../widget-platform/components/WidgetShell';
import { insightsEngine, severityAlertClass } from '../engine/insights-engine';
import type { Insight } from '../contracts/insight';
import type { UreRecordExplorerResponse } from '../../record-explorer/types';

interface InsightsWidgetProps {
  record: UreRecordExplorerResponse;
}

function InsightIcon({ severity }: { severity: Insight['severity'] }) {
  const glyph = severity === 'error' ? '✕' : severity === 'warning' ? '!' : 'i';
  return (
    <span className={severityAlertClass(severity)} aria-hidden="true">
      {glyph}
    </span>
  );
}

function InsightAction({ insight }: { insight: Insight }) {
  if (!insight.actionLabel || !insight.actionRoute) return null;

  if (insight.actionRoute.startsWith('#')) {
    const anchor = insight.actionRoute.slice(1);
    return (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() =>
          document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
        }
      >
        {insight.actionLabel}
      </button>
    );
  }

  return (
    <Link to={insight.actionRoute} className="btn btn-secondary">
      {insight.actionLabel}
    </Link>
  );
}

export function InsightsWidget({ record }: InsightsWidgetProps) {
  const insights = useMemo(() => insightsEngine.evaluate(record), [record]);

  return (
    <WidgetShell
      title="Insights"
      id="ure-insights"
      className="ure-widget card"
      empty={insights.length === 0}
      emptyMessage="No se encontraron alertas para este registro."
    >
      <ul className="ure-doc-list">
        {insights.map((insight) => (
          <li key={insight.id}>
            <InsightIcon severity={insight.severity} />
            <div>
              <strong>{insight.title}</strong>
              <p className="ure-empty">{insight.description}</p>
            </div>
            <InsightAction insight={insight} />
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
