import type { ReactNode } from 'react';

export const INSPECTOR_TARGET_TYPES = [
  'FIELD',
  'SECTION',
  'LAYOUT',
  'FORM',
  'CAPTURE',
  'ERP_MAPPING',
  'WORKFLOW',
] as const;

export type InspectorTargetType = (typeof INSPECTOR_TARGET_TYPES)[number];

export const INSPECTOR_GROUP_IDS = [
  'general',
  'validation',
  'appearance',
  'data',
  'capture',
  'erp',
  'advanced',
] as const;

export type InspectorGroupId = (typeof INSPECTOR_GROUP_IDS)[number];

export const INSPECTOR_GROUP_LABELS: Record<InspectorGroupId, string> = {
  general: 'General',
  validation: 'Validación',
  appearance: 'Apariencia',
  data: 'Datos',
  capture: 'Capture',
  erp: 'ERP',
  advanced: 'Avanzado',
};

export interface InspectorGroupDefinition {
  id: InspectorGroupId;
  title: string;
  priority: number;
  collapsed?: boolean;
}

export interface InspectorPropertyDefinition<TContext = unknown> {
  id: string;
  label: string;
  groupId: InspectorGroupId;
  priority: number;
  presentation?: 'property' | 'raw';
  visible?: (context: TContext) => boolean;
  render: (context: TContext) => ReactNode;
}

export interface InspectorTypeDefinition<TContext = unknown> {
  type: InspectorTargetType;
  title: string | ((context: TContext) => string);
  subtitle?: string | ((context: TContext) => string | null | undefined);
  groups: InspectorGroupDefinition[];
  properties: InspectorPropertyDefinition<TContext>[];
  footer?: (context: TContext) => ReactNode;
}

export interface InspectorSelection<TContext = unknown> {
  type: InspectorTargetType;
  context: TContext;
}

export interface ResolvedInspectorGroup<TContext = unknown> {
  definition: InspectorGroupDefinition;
  properties: InspectorPropertyDefinition<TContext>[];
}

export interface ResolvedInspectorView<TContext = unknown> {
  type: InspectorTargetType;
  title: string;
  subtitle: string | null;
  groups: ResolvedInspectorGroup<TContext>[];
  footer?: ReactNode;
}
