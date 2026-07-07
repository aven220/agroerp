import type { ComponentType } from 'react';

/** Contract for a pluggable UI widget in the platform. */
export interface WidgetDefinition<TData = unknown> {
  /** Unique widget identifier within the registry. */
  id: string;
  /** Optional human-readable label (analytics, admin tooling). */
  label?: string;
  /** Lower values render first. Defaults to 100. */
  priority?: number;
  /** All listed permissions must be satisfied; omitted = public. */
  permissions?: string[];
  /** React component receiving contextual data from WidgetContext. */
  render: ComponentType<WidgetRenderProps<TData>>;
  /** Optional layout slot identifier for multi-zone layouts. */
  slot?: string;
}

export interface WidgetRenderProps<TData = unknown> {
  data: TData;
}

export type WidgetPermissionChecker = (permission: string) => boolean;

export interface WidgetEngineOptions {
  layoutId?: string;
  layoutWidgetIds?: string[];
  permissions?: WidgetPermissionChecker;
}

export interface WidgetLayoutDefinition {
  id: string;
  widgetIds: string[];
  description?: string;
}

export interface WidgetContextValue<TData = unknown> {
  data: TData;
  entityType?: string;
  recordId?: string;
  layoutId?: string;
}
