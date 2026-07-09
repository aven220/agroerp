import { FORM_STATUS_LABELS } from './form-lifecycle';

export interface FormStudioToolbarProps {
  formName: string;
  formKey: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  activeTab: string;
  tabs: Array<{ id: string; label: string; icon?: string }>;
  canSave: boolean;
  canPublish: boolean;
  onTabChange: (tab: string) => void;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onSimulate: () => void;
  onTemplates: () => void;
  onHistory?: () => void;
  onSettings?: () => void;
}

export function FormStudioToolbar({
  formName,
  formKey,
  status,
  dirty,
  saving,
  lastSavedAt,
  activeTab,
  tabs,
  canSave,
  canPublish,
  onTabChange,
  onBack,
  onSave,
  onPublish,
  onPreview,
  onSimulate,
  onTemplates,
  onHistory,
  onSettings,
}: FormStudioToolbarProps) {
  const statusLabel = FORM_STATUS_LABELS[status] ?? status;

  return (
    <header className="fs-toolbar" role="banner">
      <div className="fs-toolbar-zone fs-toolbar-brand">
        <button
          type="button"
          className="fs-toolbar-back"
          onClick={onBack}
          aria-label="Volver a Mis Formularios"
          title="Volver (Esc)"
        >
          ←
        </button>
        <div className="fs-toolbar-identity">
          <h1 className="fs-toolbar-name" title={formKey || undefined}>
            {formName || 'Formulario sin título'}
          </h1>
          <div className="fs-toolbar-meta">
            <span className={`fs-status-badge fs-status-${status}`}>{statusLabel}</span>
            {dirty ? (
              <span className="fs-save-indicator fs-save-dirty" aria-live="polite">
                <span className="fs-save-dot" aria-hidden /> Cambios pendientes
              </span>
            ) : saving ? (
              <span className="fs-save-indicator fs-save-saving" aria-live="polite">
                Guardando…
              </span>
            ) : lastSavedAt ? (
              <span className="fs-save-indicator fs-save-ok" aria-live="polite">
                <span className="fs-save-dot" aria-hidden /> Guardado
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="fs-toolbar-zone fs-toolbar-nav" aria-label="Áreas del estudio">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fs-nav-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            {t.icon ? <span className="fs-nav-icon" aria-hidden>{t.icon}</span> : null}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="fs-toolbar-zone fs-toolbar-actions">
        <div className="fs-action-group" role="group" aria-label="Recursos">
          <button type="button" className="fs-action-btn" onClick={onTemplates} title="Plantillas">
            Plantillas
          </button>
          {onHistory ? (
            <button type="button" className="fs-action-btn" onClick={onHistory} title="Historial de versiones">
              Historial
            </button>
          ) : null}
          {onSettings ? (
            <button type="button" className="fs-action-btn" onClick={onSettings} title="Configuración">
              Configuración
            </button>
          ) : null}
        </div>

        <div className="fs-action-divider" aria-hidden />

        <div className="fs-action-group" role="group" aria-label="Vista y prueba">
          <button type="button" className="fs-action-btn" onClick={onPreview} title="Vista previa (Ctrl+Shift+P)">
            Vista previa
          </button>
          <button type="button" className="fs-action-btn" onClick={onSimulate} title="Simular (Ctrl+Shift+T)">
            Simular
          </button>
        </div>

        <div className="fs-action-divider" aria-hidden />

        <div className="fs-action-group" role="group" aria-label="Publicación">
          <button
            type="button"
            className="fs-action-btn"
            onClick={onSave}
            disabled={!canSave || saving}
            title="Guardar borrador (Ctrl+S)"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {canPublish ? (
            <button
              type="button"
              className="fs-action-btn fs-action-primary"
              onClick={onPublish}
              disabled={dirty || saving}
              title="Publicar formulario"
            >
              Publicar
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
