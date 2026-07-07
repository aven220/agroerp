import type { WidgetLayoutDefinition } from '../contracts/widget-definition';

export const URE_DEFAULT_LAYOUT_ID = 'ure-default';

/** Default widget order for Universal Record Explorer (mirrors legacy pipeline). */
export const URE_DEFAULT_WIDGET_IDS: readonly string[] = [
  'summary',
  'quick-actions',
  'info',
  'activity',
  'forms',
  'relationships',
  'documents',
  'photos',
  'analytics',
] as const;

export const WIDGET_LAYOUTS: Record<string, WidgetLayoutDefinition> = {
  [URE_DEFAULT_LAYOUT_ID]: {
    id: URE_DEFAULT_LAYOUT_ID,
    description: 'Universal Record Explorer default widget pipeline',
    widgetIds: [...URE_DEFAULT_WIDGET_IDS],
  },
};

export function getLayout(layoutId: string): WidgetLayoutDefinition {
  const layout = WIDGET_LAYOUTS[layoutId];
  if (!layout) {
    throw new Error(`Unknown widget layout: ${layoutId}`);
  }
  return layout;
}

export function registerLayout(layout: WidgetLayoutDefinition): void {
  WIDGET_LAYOUTS[layout.id] = layout;
}
