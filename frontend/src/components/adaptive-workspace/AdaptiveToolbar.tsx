import { useAdaptiveWorkspace } from '../../context/AdaptiveWorkspaceProvider';

export function FocusModeToggle() {
  const { focusMode, toggleFocusMode } = useAdaptiveWorkspace();

  return (
    <button
      type="button"
      className={`adaptive-focus-toggle${focusMode ? ' active' : ''}`}
      onClick={toggleFocusMode}
      aria-pressed={focusMode}
      aria-label={focusMode ? 'Salir de modo concentración' : 'Activar modo concentración'}
      title={focusMode ? 'Salir de modo concentración' : 'Modo concentración'}
    >
      <span aria-hidden>{focusMode ? '◉' : '○'}</span>
      <span className="adaptive-focus-label">Enfoque</span>
    </button>
  );
}

export function AdaptiveWorkspaceBanner() {
  const {
    profile,
    showWidgetSuggestion,
    showFocusSuggestion,
    applyWidgetOrderSuggestion,
    dismissWidgetSuggestion,
    acceptFocusSuggestion,
    dismissFocusSuggestion,
    setAdaptiveEnabled,
  } = useAdaptiveWorkspace();

  if (!showWidgetSuggestion && !showFocusSuggestion) return null;

  return (
    <div className="adaptive-banner" role="status" aria-live="polite">
      <div className="adaptive-banner-icon" aria-hidden>✦</div>
      <div className="adaptive-banner-body">
        {showFocusSuggestion ? (
          <>
            <strong>Sesión intensa detectada</strong>
            <p>
              Lleva varios cambios entre módulos. ¿Activar modo concentración para reducir distracciones?
            </p>
          </>
        ) : (
          <>
            <strong>Layout adaptado a {profile.contextLabel.toLowerCase()}</strong>
            <p>
              Podemos reordenar sus widgets del centro de trabajo según su patrón de uso reciente.
            </p>
          </>
        )}
      </div>
      <div className="adaptive-banner-actions">
        {showFocusSuggestion ? (
          <>
            <button type="button" className="btn btn-sm btn-primary" onClick={acceptFocusSuggestion}>
              Activar enfoque
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissFocusSuggestion}>
              Ahora no
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-sm btn-primary" onClick={applyWidgetOrderSuggestion}>
              Aplicar orden
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissWidgetSuggestion}>
              Mantener actual
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-sm btn-ghost adaptive-banner-disable"
          onClick={() => setAdaptiveEnabled(false)}
          title="Desactivar adaptación automática"
        >
          Desactivar
        </button>
      </div>
    </div>
  );
}
