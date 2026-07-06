import { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getWidgetsForRole } from '../../config/widgetRegistry';

export function WidgetPicker() {
  const { dashboardRole, addWidget, activeView } = useWorkspace();
  const [open, setOpen] = useState(false);
  const catalog = getWidgetsForRole(dashboardRole);
  const placedIds = new Set((activeView?.widgets ?? []).map((w) => w.widgetId));

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        + Agregar widget
      </button>
    );
  }

  return (
    <div className="ws-widget-picker card">
      <div className="card-header">
        <h3 className="ds-h4">Catálogo de widgets</h3>
        <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
      </div>
      <div className="ws-picker-grid">
        {catalog.map((wd) => (
          <button
            key={wd.id}
            type="button"
            className="ws-picker-item"
            disabled={placedIds.has(wd.id)}
            onClick={() => { addWidget(wd.id); setOpen(false); }}
          >
            <span className="ws-picker-icon">{wd.icon}</span>
            <strong>{wd.label}</strong>
            <span className="ds-caption">{wd.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
