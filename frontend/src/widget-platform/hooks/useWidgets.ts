import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { WidgetDefinition, WidgetEngineOptions } from '../contracts/widget-definition';
import { createWidgetEngine } from '../engine/widget-engine';
import { widgetRegistry } from '../registry/widget-registry';

export interface UseWidgetsOptions<TData = unknown> extends WidgetEngineOptions {
  data: TData;
}

export interface UseWidgetsResult<TData = unknown> {
  widgets: WidgetDefinition<TData>[];
  data: TData;
}

/**
 * Resolves widgets for a layout via WidgetEngine (registry + permissions + priority).
 */
export function useWidgets<TData = unknown>(
  options: UseWidgetsOptions<TData>,
): UseWidgetsResult<TData> {
  const { data, layoutId, layoutWidgetIds } = options;
  const { hasPermission } = useAuth();

  const engine = useMemo(
    () => createWidgetEngine(hasPermission, widgetRegistry),
    [hasPermission],
  );

  const widgets = useMemo(
    () =>
      engine.resolve<TData>({
        layoutId,
        layoutWidgetIds,
        permissions: hasPermission,
      }),
    [engine, layoutId, layoutWidgetIds, hasPermission],
  );

  return { widgets, data };
}
