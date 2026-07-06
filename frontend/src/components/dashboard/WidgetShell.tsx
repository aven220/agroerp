import { lazy, Suspense, type ReactNode } from 'react';
import { WIDGET_MAP, type PlacedWidget } from '../../config/widgetRegistry';
import { Skeleton } from '../ui/Skeleton';

const WidgetBody = lazy(() => import('./WidgetBody').then((m) => ({ default: m.WidgetBody })));

interface WidgetShellProps {
  placed: PlacedWidget;
  editMode: boolean;
  dragHandleProps?: { draggable: boolean; onDragStart: () => void; onDragEnd: () => void };
  onRemove?: () => void;
  onResize?: (w: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export function WidgetShell({
  placed,
  editMode,
  dragHandleProps,
  onRemove,
  onResize,
  isDragging,
  isDropTarget,
  onDragOver,
  onDrop,
}: WidgetShellProps) {
  const def = WIDGET_MAP.get(placed.widgetId);
  if (!def) return null;

  const sizeLabel = placed.w >= 12 ? 'Ancho' : placed.w >= 6 ? 'Medio' : 'Compacto';

  return (
    <article
      className={[
        'ws-widget',
        editMode ? 'ws-widget-edit' : '',
        isDragging ? 'ws-widget-dragging' : '',
        isDropTarget ? 'ws-widget-drop-target' : '',
      ].filter(Boolean).join(' ')}
      style={{
        gridColumn: `span ${Math.min(12, Math.max(3, placed.w))}`,
        minHeight: `${placed.h * 80}px`,
      }}
      onDragOver={editMode ? onDragOver : undefined}
      onDrop={editMode ? (e) => { e.preventDefault(); onDrop?.(); } : undefined}
    >
      <header className="ws-widget-header">
        <div className="ws-widget-title-row">
          {editMode ? (
            <button
              type="button"
              className="ws-drag-handle"
              aria-label={`Mover ${def.label}`}
              {...dragHandleProps}
            >
              ⠿
            </button>
          ) : null}
          <span className="ws-widget-icon" aria-hidden>{def.icon}</span>
          <h3 className="ws-widget-title">{def.label}</h3>
        </div>
        {editMode ? (
          <div className="ws-widget-controls">
            <select
              className="ws-size-select"
              value={placed.w}
              aria-label={`Tamaño de ${def.label}`}
              onChange={(e) => onResize?.(Number(e.target.value))}
            >
              <option value={4}>Compacto</option>
              <option value={6}>Medio</option>
              <option value={8}>Amplio</option>
              <option value={12}>Completo</option>
            </select>
            <button type="button" className="btn-icon ws-remove-btn" onClick={onRemove} aria-label={`Quitar ${def.label}`}>
              ×
            </button>
          </div>
        ) : (
          <span className="ws-widget-size-hint ds-caption">{sizeLabel}</span>
        )}
      </header>
      <div className="ws-widget-body">
        <Suspense fallback={<><Skeleton variant="title" /><Skeleton variant="text" /></>}>
          <WidgetBody kind={def.kind} widgetId={placed.widgetId} definition={def} />
        </Suspense>
      </div>
    </article>
  );
}

export function WidgetLoading({ children }: { children?: ReactNode }) {
  return <div className="ws-widget-loading">{children ?? 'Cargando…'}</div>;
}
