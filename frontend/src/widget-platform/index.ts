import type { ComponentType } from 'react';
import type { WidgetDefinition } from './contracts/widget-definition';
import { widgetRegistry } from './registry/widget-registry';

/** Priority step used when registering legacy widgets without explicit priority. */
const LEGACY_PRIORITY_STEP = 10;

export interface LegacyWidgetLike<TData = unknown> {
  id: string;
  render: ComponentType<{ data: TData }>;
}

/**
 * Registers legacy widget definitions into the platform registry (idempotent).
 */
export function registerLegacyWidgets<TData = unknown>(
  widgets: LegacyWidgetLike<TData>[],
  startPriority = LEGACY_PRIORITY_STEP,
): void {
  widgets.forEach((widget, index) => {
    if (widgetRegistry.exists(widget.id)) return;
    const definition: WidgetDefinition<TData> = {
      id: widget.id,
      priority: startPriority + index * LEGACY_PRIORITY_STEP,
      render: widget.render,
    };
    widgetRegistry.register(definition);
  });
}

export function registerWidget<TData = unknown>(
  definition: WidgetDefinition<TData>,
): void {
  widgetRegistry.register(definition);
}

export { widgetRegistry, WidgetRegistry } from './registry/widget-registry';
export { WidgetEngine, createWidgetEngine } from './engine/widget-engine';

export type {
  WidgetDefinition,
  WidgetRenderProps,
  WidgetContextValue,
  WidgetLayoutDefinition,
  WidgetEngineOptions,
  WidgetPermissionChecker,
} from './contracts/widget-definition';

export {
  WidgetContextProvider,
  useWidgetContext,
  WidgetContext,
} from './context/widget-context';

export { useWidgets } from './hooks/useWidgets';
export type { UseWidgetsOptions, UseWidgetsResult } from './hooks/useWidgets';

export { WidgetRenderer } from './components/WidgetRenderer';
export { WidgetShell } from './components/WidgetShell';

export {
  URE_DEFAULT_LAYOUT_ID,
  URE_DEFAULT_WIDGET_IDS,
  WIDGET_LAYOUTS,
  getLayout,
  registerLayout,
} from './layouts/default-layout';
