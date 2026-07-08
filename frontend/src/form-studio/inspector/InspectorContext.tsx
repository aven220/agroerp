import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { inspectorRegistry } from './InspectorRegistry';
import type { CompositeInspectorView } from './composite-types';
import type {
  InspectorGroupId,
  InspectorSelection,
  ResolvedInspectorView,
} from './types';

export interface InspectorContextValue<TContext = unknown> {
  selection: InspectorSelection<TContext> | null;
  selections: InspectorSelection<TContext>[];
  view: ResolvedInspectorView<TContext> | null;
  compositeView: CompositeInspectorView | null;
  activeGroupId: InspectorGroupId | null;
  setActiveGroupId: (groupId: InspectorGroupId | null) => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export interface InspectorProviderProps<TContext> {
  selection?: InspectorSelection<TContext> | null;
  selections?: InspectorSelection<TContext>[];
  children: ReactNode;
}

export function InspectorProvider<TContext>({
  selection = null,
  selections,
  children,
}: InspectorProviderProps<TContext>) {
  const resolvedSelections = useMemo(
    () => selections ?? (selection ? [selection] : []),
    [selection, selections],
  );

  const compositeView = useMemo(
    () =>
      resolvedSelections.length
        ? inspectorRegistry.resolveMany(resolvedSelections as InspectorSelection[])
        : null,
    [resolvedSelections],
  );

  const primarySelection = resolvedSelections[0] ?? null;
  const view = compositeView?.entries[0]?.view ?? null;

  const [activeGroupId, setActiveGroupId] = useState<InspectorGroupId | null>(null);

  const resolvedActiveGroupId = useMemo(() => {
    if (!view?.groups.length || resolvedSelections.length > 1) return null;
    if (activeGroupId && view.groups.some((group) => group.definition.id === activeGroupId)) {
      return activeGroupId;
    }
    return view.groups[0]?.definition.id ?? null;
  }, [activeGroupId, view, resolvedSelections.length]);

  const value = useMemo<InspectorContextValue<TContext>>(
    () => ({
      selection: primarySelection,
      selections: resolvedSelections,
      view: view as ResolvedInspectorView<TContext> | null,
      compositeView,
      activeGroupId: resolvedActiveGroupId,
      setActiveGroupId,
    }),
    [primarySelection, resolvedSelections, view, compositeView, resolvedActiveGroupId],
  );

  return (
    <InspectorContext.Provider value={value as InspectorContextValue}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspectorContext<TContext = unknown>(): InspectorContextValue<TContext> {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error('useInspectorContext must be used within InspectorProvider');
  }
  return context as InspectorContextValue<TContext>;
}
