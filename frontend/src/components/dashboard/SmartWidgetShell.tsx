import type { ReactNode } from 'react';
import type { SmartWidgetId } from '../../config/smartDashboard';
import { SMART_DASH_WIDGETS } from '../../config/smartDashboard';

interface SmartWidgetShellProps {
  id: SmartWidgetId;
  editMode: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: ReactNode;
}

export function SmartWidgetShell({
  id,
  editMode,
  collapsed,
  onToggleCollapse,
  onHide,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children,
}: SmartWidgetShellProps) {
  const label = SMART_DASH_WIDGETS.find((w) => w.id === id)?.label ?? id;

  return (
    <section className={`sd-widget${collapsed ? ' is-collapsed' : ''}${editMode ? ' is-editing' : ''}`}>
      <header className="sd-widget-head">
        <button
          type="button"
          className="sd-widget-toggle"
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
        >
          <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
          <span>{label}</span>
        </button>
        {editMode ? (
          <div className="sd-widget-controls">
            <button type="button" className="btn btn-ghost btn-sm" disabled={!canMoveUp} onClick={onMoveUp} title="Subir">
              ↑
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!canMoveDown} onClick={onMoveDown} title="Bajar">
              ↓
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onHide} title="Ocultar">
              Ocultar
            </button>
          </div>
        ) : null}
      </header>
      {!collapsed ? <div className="sd-widget-body">{children}</div> : null}
    </section>
  );
}
