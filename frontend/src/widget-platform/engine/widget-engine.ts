import type {
  WidgetDefinition,
  WidgetEngineOptions,
  WidgetLayoutDefinition,
  WidgetPermissionChecker,
} from '../contracts/widget-definition';
import { widgetRegistry, type WidgetRegistry } from '../registry/widget-registry';
import { getLayout } from '../layouts/default-layout';

const DEFAULT_PRIORITY = 100;

/**
 * Resolves, filters and orders widgets for a given layout.
 */
export class WidgetEngine {
  constructor(
    private readonly registry: WidgetRegistry = widgetRegistry,
    private readonly permissionChecker: WidgetPermissionChecker = () => true,
  ) {}

  resolve<TData = unknown>(
    options: WidgetEngineOptions = {},
  ): WidgetDefinition<TData>[] {
    const layout = this.resolveLayout(options);
    const widgetIds = options.layoutWidgetIds ?? layout.widgetIds;

    const widgets = widgetIds
      .map((id: string) => this.registry.get<TData>(id))
      .filter(
        (widget): widget is WidgetDefinition<TData> => widget !== undefined,
      );

    return this.filterByPermissions(widgets).sort(
      (a, b) => this.compareByPriority(a, b),
    );
  }

  resolveLayout(options: WidgetEngineOptions): WidgetLayoutDefinition {
    if (options.layoutWidgetIds?.length) {
      return {
        id: options.layoutId ?? 'custom',
        widgetIds: options.layoutWidgetIds,
      };
    }
    return getLayout(options.layoutId ?? 'ure-default');
  }

  private filterByPermissions<TData>(
    widgets: WidgetDefinition<TData>[],
  ): WidgetDefinition<TData>[] {
    return widgets.filter((widget) => {
      if (!widget.permissions?.length) return true;
      return widget.permissions.every((perm) => this.permissionChecker(perm));
    });
  }

  private compareByPriority<TData>(
    a: WidgetDefinition<TData>,
    b: WidgetDefinition<TData>,
  ): number {
    return (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY);
  }
}

export function createWidgetEngine(
  permissionChecker?: WidgetPermissionChecker,
  registry: WidgetRegistry = widgetRegistry,
): WidgetEngine {
  return new WidgetEngine(registry, permissionChecker ?? (() => true));
}
