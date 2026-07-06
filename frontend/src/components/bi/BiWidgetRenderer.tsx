import type { ResolvedWidget } from '../../api/bi';

interface BiWidgetRendererProps {
  widget: ResolvedWidget;
}

export function BiWidgetRenderer({ widget }: BiWidgetRendererProps) {
  const data = widget.data ?? {};

  if (widget.type === 'kpi' || widget.type === 'indicator' || widget.type === 'gauge' || widget.type === 'realtime') {
    const value = (data as { value?: unknown }).value ?? (data as { kpis?: Record<string, number> }).kpis;
    const display = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—');
    return (
      <div className="bi-widget bi-widget-kpi">
        <span className="kpi-label">{widget.title}</span>
        <span className="kpi-value">{display}</span>
        {(data as { variancePct?: number }).variancePct != null && (
          <span className={`bi-variance ${Number((data as { variancePct: number }).variancePct) < 0 ? 'negative' : 'positive'}`}>
            {(data as { variancePct: number }).variancePct}%
          </span>
        )}
      </div>
    );
  }

  if (['bar', 'line', 'area', 'pie', 'funnel'].includes(widget.type)) {
    const series = (data as { series?: Array<{ label: string; value: number }> }).series ?? [];
    const max = Math.max(...series.map((s) => s.value), 1);
    return (
      <div className="bi-widget bi-widget-chart">
        <h4>{widget.title}</h4>
        <div className={`bi-chart bi-chart-${widget.type}`}>
          {series.map((s) => (
            <div key={s.label} className="bi-chart-row">
              <span className="bi-chart-label">{s.label}</span>
              <div className="bi-chart-bar-wrap">
                <div
                  className="bi-chart-bar"
                  style={{ width: `${(s.value / max) * 100}%` }}
                />
              </div>
              <span className="bi-chart-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (widget.type === 'table') {
    const rows = (data as { rows?: Record<string, unknown>[] }).rows ?? [];
    const cols = rows.length ? Object.keys(rows[0]) : [];
    return (
      <div className="bi-widget bi-widget-table">
        <h4>{widget.title}</h4>
        <table className="data-table data-table-compact">
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i}>{cols.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (widget.type === 'map') {
    const points = (data as { points?: Array<{ label: string; municipality?: string }> }).points ?? [];
    return (
      <div className="bi-widget bi-widget-map">
        <h4>{widget.title}</h4>
        <ul className="stat-list">
          {points.slice(0, 8).map((p, i) => (
            <li key={i}><span>{p.label}</span><strong>{p.municipality ?? '—'}</strong></li>
          ))}
        </ul>
      </div>
    );
  }

  if (widget.type === 'timeline') {
    const items = (data as { items?: Array<{ at: string; label: string }> }).items ?? [];
    return (
      <div className="bi-widget bi-widget-timeline">
        <h4>{widget.title}</h4>
        <ul className="timeline-list">
          {items.slice(0, 8).map((item, i) => (
            <li key={i}>
              <time>{String(item.at).slice(0, 10)}</time>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="bi-widget">
      <h4>{widget.title}</h4>
      <pre className="bi-raw-data">{JSON.stringify(data, null, 2).slice(0, 300)}</pre>
    </div>
  );
}
