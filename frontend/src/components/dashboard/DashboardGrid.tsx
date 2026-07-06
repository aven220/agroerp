import { useState } from 'react';
import { WidgetShell } from './WidgetShell';
import { EmptyState } from '../ui/EmptyState';
import { useWorkspace } from '../../context/WorkspaceContext';

export function DashboardGrid() {
  const {
    activeView,
    editMode,
    moveWidget,
    removeWidget,
    resizeWidget,
  } = useWorkspace();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null) return;
    moveWidget(dragIndex, targetIndex);
    setDragIndex(null);
    setDropIndex(null);
  };

  const widgets = activeView?.widgets ?? [];

  if (!widgets.length) {
    return (
      <EmptyState
        illustration="data"
        title="Workspace vacío"
        description="Personalice su dashboard agregando widgets relevantes para su rol."
        hint="Active el modo personalizar desde la barra superior."
      />
    );
  }

  return (
    <div className={`ws-grid${editMode ? ' ws-grid-edit' : ''}`} role="list">
      {widgets.map((placed, index) => (
        <WidgetShell
          key={placed.instanceId}
          placed={placed}
          editMode={editMode}
          isDragging={dragIndex === index}
          isDropTarget={dropIndex === index && dragIndex !== index}
          dragHandleProps={{
            draggable: true,
            onDragStart: () => setDragIndex(index),
            onDragEnd: () => { setDragIndex(null); setDropIndex(null); },
          }}
          onRemove={() => removeWidget(placed.instanceId)}
          onResize={(w) => resizeWidget(placed.instanceId, w)}
          onDragOver={(e) => { e.preventDefault(); setDropIndex(index); }}
          onDrop={() => onDrop(index)}
        />
      ))}
    </div>
  );
}
