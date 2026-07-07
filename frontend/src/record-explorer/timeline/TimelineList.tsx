import type { UreTimelineItem } from '../types';

interface TimelineListProps {
  items: UreTimelineItem[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function TimelineList({ items }: TimelineListProps) {
  if (items.length === 0) {
    return <p className="ure-empty">Sin actividad registrada</p>;
  }

  return (
    <ul className="ure-timeline">
      {items.map((item) => (
        <li key={item.id} className="ure-timeline-item">
          <div className="ure-timeline-dot" />
          <div className="ure-timeline-content">
            <div className="ure-timeline-meta">
              <span className="ure-timeline-type">{item.type}</span>
              <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
            </div>
            <strong>{item.title}</strong>
            {item.detail ? <p>{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
