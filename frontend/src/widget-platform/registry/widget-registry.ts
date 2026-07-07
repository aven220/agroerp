import type { WidgetDefinition } from '../contracts/widget-definition';

/**
 * In-memory registry for widget definitions.
 * Singleton instance exported as `widgetRegistry`.
 */
export class WidgetRegistry {
  private readonly definitions = new Map<string, WidgetDefinition>();

  register<TData = unknown>(definition: WidgetDefinition<TData>): void {
    if (this.definitions.has(definition.id)) {
      this.definitions.set(definition.id, definition as WidgetDefinition);
      return;
    }
    this.definitions.set(definition.id, definition as WidgetDefinition);
  }

  unregister(id: string): boolean {
    return this.definitions.delete(id);
  }

  get<TData = unknown>(id: string): WidgetDefinition<TData> | undefined {
    return this.definitions.get(id) as WidgetDefinition<TData> | undefined;
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.definitions.values());
  }

  exists(id: string): boolean {
    return this.definitions.has(id);
  }
}

export const widgetRegistry = new WidgetRegistry();
