import { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { WidgetPicker } from './WidgetPicker';

export function WorkspaceToolbar() {
  const {
    views,
    activeViewId,
    setActiveView,
    editMode,
    setEditMode,
    addView,
    renameView,
    removeView,
    resetWorkspace,
    dashboardRole,
  } = useWorkspace();
  const adaptive = useAdaptiveWorkspaceOptional();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (id: string, name: string) => {
    setRenaming(id);
    setRenameValue(name);
  };

  const commitRename = () => {
    if (renaming && renameValue.trim()) renameView(renaming, renameValue.trim());
    setRenaming(null);
  };

  return (
    <div className="ws-toolbar">
      <div className="ws-toolbar-left">
        <div className="ws-view-tabs" role="tablist" aria-label="Vistas del workspace">
          {views.map((v) => (
            <div key={v.id} className="ws-view-tab-wrap">
              {renaming === v.id ? (
                <input
                  className="ds-input ws-rename-input"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  className={`ws-view-tab${activeViewId === v.id ? ' active' : ''}`}
                  aria-selected={activeViewId === v.id}
                  onClick={() => setActiveView(v.id)}
                  onDoubleClick={() => editMode && startRename(v.id, v.name)}
                >
                  {v.name}
                </button>
              )}
              {editMode && views.length > 1 ? (
                <button type="button" className="ws-view-remove" onClick={() => removeView(v.id)} aria-label={`Eliminar vista ${v.name}`}>×</button>
              ) : null}
            </div>
          ))}
          {editMode ? (
            <button
              type="button"
              className="ws-view-tab ws-view-add"
              onClick={() => addView(`Vista ${views.length + 1}`)}
            >
              + Nueva vista
            </button>
          ) : null}
        </div>
        <p className="ws-toolbar-sub ds-caption">
          Personalice su centro de trabajo o cambie de vista
        </p>
      </div>
      <div className="ws-toolbar-right">
        {adaptive?.showWidgetSuggestion ? (
          <div className="ws-toolbar-adaptive">
            <button
              type="button"
              className="btn btn-sm"
              onClick={adaptive.applyWidgetOrderSuggestion}
              title={`Orden sugerido para ${adaptive.profile.contextLabel.toLowerCase()}`}
            >
              ✦ Orden sugerido
            </button>
          </div>
        ) : null}
        {editMode ? <WidgetPicker /> : null}
        <button
          type="button"
          className={`btn${editMode ? ' btn-primary' : ''}`}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Listo' : 'Personalizar'}
        </button>
        {editMode ? (
          <button type="button" className="btn btn-ghost" onClick={resetWorkspace}>
            Restaurar diseño
          </button>
        ) : null}
      </div>
    </div>
  );
}
