/**
 * PM-44 — Widgets del Dashboard Inteligente (persistencia local existente).
 */

import type { WorkspaceRole } from './workspaceRoles';

export type SmartWidgetId =
  | 'sd-welcome'
  | 'sd-summary'
  | 'sd-next'
  | 'sd-movements'
  | 'sd-alerts'
  | 'sd-frequent';

export interface SmartWidgetDef {
  id: SmartWidgetId;
  label: string;
}

export const SMART_DASH_WIDGETS: SmartWidgetDef[] = [
  { id: 'sd-welcome', label: 'Inicio' },
  { id: 'sd-summary', label: 'Resumen' },
  { id: 'sd-next', label: 'Qué hacer ahora' },
  { id: 'sd-movements', label: 'Últimos movimientos' },
  { id: 'sd-alerts', label: 'Alertas' },
  { id: 'sd-frequent', label: 'Accesos frecuentes' },
];

export const SMART_WIDGET_IDS: SmartWidgetId[] = SMART_DASH_WIDGETS.map((w) => w.id);

/** Orden por defecto según rol — trabajo primero */
export function defaultSmartOrder(role: WorkspaceRole): SmartWidgetId[] {
  if (role === 'executive' || role === 'consulta') {
    return ['sd-welcome', 'sd-summary', 'sd-alerts', 'sd-next', 'sd-frequent', 'sd-movements'];
  }
  if (role === 'admin') {
    return ['sd-welcome', 'sd-summary', 'sd-next', 'sd-alerts', 'sd-frequent', 'sd-movements'];
  }
  if (role === 'supervisor') {
    return ['sd-welcome', 'sd-summary', 'sd-alerts', 'sd-next', 'sd-movements', 'sd-frequent'];
  }
  if (role === 'quality') {
    return ['sd-welcome', 'sd-summary', 'sd-next', 'sd-alerts', 'sd-frequent', 'sd-movements'];
  }
  if (role === 'inventory') {
    return ['sd-welcome', 'sd-summary', 'sd-next', 'sd-movements', 'sd-alerts', 'sd-frequent'];
  }
  if (role === 'field') {
    return ['sd-welcome', 'sd-summary', 'sd-next', 'sd-frequent', 'sd-alerts', 'sd-movements'];
  }
  // purchasing
  return ['sd-welcome', 'sd-summary', 'sd-next', 'sd-movements', 'sd-alerts', 'sd-frequent'];
}

/** Widgets ocultos por defecto (información irrelevante al rol) */
export function defaultSmartHidden(role: WorkspaceRole): SmartWidgetId[] {
  if (role === 'consulta') return ['sd-next', 'sd-movements'];
  if (role === 'executive') return ['sd-movements'];
  if (role === 'field') return ['sd-movements'];
  if (role === 'admin') return [];
  return [];
}

export function normalizeSmartLayout(
  order: string[],
  hidden: string[],
  role: WorkspaceRole,
): { order: SmartWidgetId[]; hidden: SmartWidgetId[] } {
  const defaults = defaultSmartOrder(role);
  const known = new Set<string>(SMART_WIDGET_IDS);
  const fromSaved = order.filter((id): id is SmartWidgetId => known.has(id));
  const missing = defaults.filter((id) => !fromSaved.includes(id));
  const nextOrder = fromSaved.length ? [...fromSaved, ...missing] : defaults;
  const defaultHidden = defaultSmartHidden(role);
  const nextHidden = (hidden.length || order.length
    ? hidden.filter((id): id is SmartWidgetId => known.has(id))
    : defaultHidden);
  return { order: nextOrder, hidden: nextHidden };
}
