import type { ComponentType } from 'react';
import type { UreRecordExplorerResponse } from '../types';
import { SummaryWidget } from '../widgets/SummaryWidget';
import { InformationWidget } from '../widgets/InformationWidget';
import { TimelineWidget } from '../widgets/TimelineWidget';
import { FormsWidget } from '../widgets/FormsWidget';
import { RelationshipWidget } from '../widgets/RelationshipWidget';
import { DocumentsWidget } from '../widgets/DocumentsWidget';
import { GalleryWidget } from '../widgets/GalleryWidget';
import { AnalyticsWidget } from '../widgets/AnalyticsWidget';
import { QuickActionsWidget } from '../widgets/QuickActionsWidget';
import { InsightsWidget } from '../../record-insights/widgets/InsightsWidget';
import { RecordHealthWidget } from '../../record-health/widgets/RecordHealthWidget';
import { widgetRegistry } from '../../widget-platform';

export interface UreWidgetDefinition {
  id: string;
  render: ComponentType<{ data: UreRecordExplorerResponse }>;
}

function SummarySlot({ data }: { data: UreRecordExplorerResponse }) {
  return <SummaryWidget summary={data.summary} />;
}

function RecordHealthSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <RecordHealthWidget record={data} />;
}

function InfoSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <InformationWidget entity={data.entity} />;
}

function ActivitySlot({ data }: { data: UreRecordExplorerResponse }) {
  return <TimelineWidget events={data.events} />;
}

function FormsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <FormsWidget forms={data.forms} />;
}

function RelationsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <RelationshipWidget relationships={data.relationships} />;
}

function DocsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <DocumentsWidget documents={data.documents} />;
}

function PhotosSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <GalleryWidget photos={data.photos} />;
}

function AnalyticsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <AnalyticsWidget analytics={data.analytics} />;
}

function ActionsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <QuickActionsWidget actions={data.quickActions} />;
}

function InsightsSlot({ data }: { data: UreRecordExplorerResponse }) {
  return <InsightsWidget record={data} />;
}

const RECORD_HEALTH_WIDGET_DEFINITION: UreWidgetDefinition = {
  id: 'record-health',
  render: RecordHealthSlot,
};

const INSIGHTS_WIDGET_DEFINITION: UreWidgetDefinition = {
  id: 'insights',
  render: InsightsSlot,
};

if (!widgetRegistry.exists('record-health')) {
  widgetRegistry.register({
    id: 'record-health',
    priority: 20,
    render: RecordHealthSlot,
  });
}

if (!widgetRegistry.exists('insights')) {
  widgetRegistry.register({
    id: 'insights',
    priority: 110,
    render: InsightsSlot,
  });
}

/** Default widget pipeline — extensible by registering more definitions */
export const DEFAULT_URE_WIDGETS: UreWidgetDefinition[] = [
  { id: 'summary', render: SummarySlot },
  RECORD_HEALTH_WIDGET_DEFINITION,
  { id: 'info', render: InfoSlot },
  { id: 'activity', render: ActivitySlot },
  { id: 'forms', render: FormsSlot },
  { id: 'relationships', render: RelationsSlot },
  { id: 'documents', render: DocsSlot },
  { id: 'photos', render: PhotosSlot },
  { id: 'analytics', render: AnalyticsSlot },
  { id: 'quick-actions', render: ActionsSlot },
  INSIGHTS_WIDGET_DEFINITION,
];
