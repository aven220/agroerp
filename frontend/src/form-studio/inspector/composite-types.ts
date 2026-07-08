import type {
  InspectorGroupId,
  InspectorSelection,
  ResolvedInspectorView,
} from './types';

export interface ResolvedInspectorEntry<TContext = unknown> {
  selection: InspectorSelection<TContext>;
  view: ResolvedInspectorView<TContext>;
}

export interface CompositeInspectorView {
  title: string;
  subtitle: string | null;
  entries: ResolvedInspectorEntry[];
}
