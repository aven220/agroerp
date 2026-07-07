import type { WidgetDefinition } from '../contracts/widget-definition';

export interface WidgetRendererProps<TData = unknown> {
  widgets: WidgetDefinition<TData>[];
  data: TData;
  slotClassName?: string;
}

/**
 * Renders a resolved widget pipeline without imposing layout chrome.
 */
export function WidgetRenderer<TData = unknown>({
  widgets,
  data,
  slotClassName = 'widget-platform-slot',
}: WidgetRendererProps<TData>) {
  return (
    <>
      {widgets.map((widget) => {
        const Widget = widget.render;
        return (
          <div key={widget.id} className={slotClassName}>
            <Widget data={data} />
          </div>
        );
      })}
    </>
  );
}
