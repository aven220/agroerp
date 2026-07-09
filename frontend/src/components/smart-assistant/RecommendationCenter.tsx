import { useSmartAssistant } from '../../context/SmartAssistantProvider';
import { kindLabel } from '../../lib/suggestionEngine';
import { RecommendationCard } from './RecommendationCard';

export function ContextualHints() {
  const { contextual, execute, dismiss } = useSmartAssistant();

  if (contextual.length === 0) return null;

  return (
    <section className="smart-contextual-hints" aria-label="Sugerencias para esta pantalla">
      <div className="smart-contextual-header">
        <span className="smart-contextual-label">💡 Para usted ahora</span>
      </div>
      <div className="smart-contextual-list">
        {contextual.map((s) => (
          <RecommendationCard
            key={s.id}
            suggestion={s}
            compact
            onAction={() => execute(s)}
            onDismiss={() => dismiss(s.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function RecommendationCenter() {
  const { panelOpen, setPanelOpen, suggestions, execute, dismiss } = useSmartAssistant();

  if (!panelOpen) return null;

  const grouped = new Map<string, typeof suggestions>();
  for (const s of suggestions) {
    const key = kindLabel(s.kind);
    const list = grouped.get(key) ?? [];
    list.push(s);
    grouped.set(key, list);
  }

  return (
    <>
      <div className="smart-assistant-backdrop" onClick={() => setPanelOpen(false)} aria-hidden />
      <aside className="smart-assistant-panel" aria-label="Centro de recomendaciones">
        <header className="smart-assistant-header">
          <div>
            <strong>Asistente de trabajo</strong>
            <span className="muted">Recomendaciones basadas en su actividad</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanelOpen(false)} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="smart-assistant-body">
          {suggestions.length === 0 ? (
            <p className="smart-assistant-empty muted">
              No hay sugerencias por ahora. Siga trabajando y el asistente aprenderá de su jornada.
            </p>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <section key={category} className="smart-assistant-group">
                <h3 className="smart-assistant-group-title">{category}</h3>
                <div className="smart-assistant-list">
                  {items.map((s) => (
                    <RecommendationCard
                      key={s.id}
                      suggestion={s}
                      onAction={() => execute(s)}
                      onDismiss={() => dismiss(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="smart-assistant-footer muted">
          Sin IA — solo reglas sobre su historial, workspace y procesos locales.
        </footer>
      </aside>
    </>
  );
}

export function SmartAssistantTrigger() {
  const { togglePanel, badgeCount } = useSmartAssistant();

  return (
    <button
      type="button"
      className="smart-assistant-trigger"
      onClick={togglePanel}
      aria-label="Abrir asistente de trabajo"
      title="Asistente de trabajo"
    >
      <span aria-hidden>💡</span>
      {badgeCount > 0 ? (
        <span className="smart-assistant-badge" aria-hidden>{badgeCount}</span>
      ) : null}
    </button>
  );
}
