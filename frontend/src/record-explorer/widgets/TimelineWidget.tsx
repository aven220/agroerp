import { WidgetShell } from '../components/WidgetShell';
import { TimelineList } from '../timeline/TimelineList';
import type { UreTimelineItem } from '../types';

interface TimelineWidgetProps {
  events: UreTimelineItem[];
}

export function TimelineWidget({ events }: TimelineWidgetProps) {
  return (
    <WidgetShell title="Actividad" id="ure-activity" empty={events.length === 0}>
      <TimelineList items={events} />
    </WidgetShell>
  );
}
