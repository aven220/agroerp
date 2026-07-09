import type { ReactNode } from 'react';
import type { WidgetDefinition } from '../contracts/widget-definition';
import { useInView } from '../../hooks/useInView';

export interface WidgetRendererProps<TData = unknown> {
  widgets: WidgetDefinition<TData>[];
  data: TData;
  slotClassName?: string;
  /** When true, each widget mounts only after entering the viewport. */
  deferUntilVisible?: boolean;
}

function LazyWidgetSlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useInView('200px');
  if (!visible) {
    return <div ref={ref} className={className} style={{ minHeight: 96 }} aria-hidden />;
  }
  return <div ref={ref} className={className}>{children}</div>;
}

/**
 * Renders a resolved widget pipeline without imposing layout chrome.
 */
export function WidgetRenderer<TData = unknown>({
  widgets,
  data,
  slotClassName = 'widget-platform-slot',
  deferUntilVisible = false,
}: WidgetRendererProps<TData>) {
  return (
    <>
      {widgets.map((widget) => {
        const Widget = widget.render;
        const content = <Widget data={data} />;
        if (!deferUntilVisible) {
          return (
            <div key={widget.id} className={slotClassName}>
              {content}
            </div>
          );
        }
        return (
          <LazyWidgetSlot key={widget.id} className={slotClassName}>
            {content}
          </LazyWidgetSlot>
        );
      })}
    </>
  );
}
