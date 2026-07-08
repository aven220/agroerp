import type {
  InspectorGroupDefinition,
  InspectorPropertyDefinition,
  InspectorSelection,
  InspectorTargetType,
  InspectorTypeDefinition,
  ResolvedInspectorView,
} from './types';
import type { CompositeInspectorView, ResolvedInspectorEntry } from './composite-types';

function resolveText<TContext>(
  value: string | ((context: TContext) => string),
  context: TContext,
): string {
  return typeof value === 'function' ? value(context) : value;
}

function resolveOptionalText<TContext>(
  value: string | ((context: TContext) => string | null | undefined) | undefined,
  context: TContext,
): string | null {
  if (value == null) return null;
  const resolved = typeof value === 'function' ? value(context) : value;
  return resolved ?? null;
}

export class InspectorRegistry {
  private readonly definitions = new Map<InspectorTargetType, InspectorTypeDefinition>();

  register<TContext>(definition: InspectorTypeDefinition<TContext>): void {
    this.definitions.set(definition.type, definition as InspectorTypeDefinition);
  }

  get<TContext>(type: InspectorTargetType): InspectorTypeDefinition<TContext> | undefined {
    return this.definitions.get(type) as InspectorTypeDefinition<TContext> | undefined;
  }

  resolve<TContext>(selection: InspectorSelection<TContext>): ResolvedInspectorView<TContext> | null {
    const definition = this.get<TContext>(selection.type);
    if (!definition) return null;

    const grouped = new Map<InspectorGroupDefinition, InspectorPropertyDefinition<TContext>[]>();

    for (const group of definition.groups) {
      grouped.set(group, []);
    }

    const sortedProperties = [...definition.properties].sort((a, b) => a.priority - b.priority);

    for (const property of sortedProperties) {
      if (property.visible && !property.visible(selection.context)) continue;

      const group = definition.groups.find((item) => item.id === property.groupId);
      if (!group) continue;

      const bucket = grouped.get(group) ?? [];
      bucket.push(property);
      grouped.set(group, bucket);
    }

    const groups = [...grouped.entries()]
      .filter(([, properties]) => properties.length > 0)
      .sort((a, b) => a[0].priority - b[0].priority)
      .map(([definitionGroup, properties]) => ({
        definition: definitionGroup,
        properties,
      }));

    return {
      type: selection.type,
      title: resolveText(definition.title, selection.context),
      subtitle: resolveOptionalText(definition.subtitle, selection.context),
      groups,
      footer: definition.footer?.(selection.context),
    };
  }

  resolveMany(selections: InspectorSelection[]): CompositeInspectorView | null {
    const entries: ResolvedInspectorEntry[] = [];

    for (const selection of selections) {
      const view = this.resolve(selection);
      if (view) {
        entries.push({ selection, view });
      }
    }

    if (!entries.length) return null;

    return {
      title: entries.map((entry) => entry.view.title).join(' · '),
      subtitle: entries[0]?.view.subtitle ?? null,
      entries,
    };
  }

  listTypes(): InspectorTargetType[] {
    return [...this.definitions.keys()];
  }
}

export const inspectorRegistry = new InspectorRegistry();
