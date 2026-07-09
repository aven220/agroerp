import { kindLabel, type SmartSuggestion } from '../../lib/suggestionEngine';

interface RecommendationCardProps {
  suggestion: SmartSuggestion;
  compact?: boolean;
  onAction: () => void;
  onDismiss?: () => void;
}

export function RecommendationCard({
  suggestion,
  compact = false,
  onAction,
  onDismiss,
}: RecommendationCardProps) {
  return (
    <article className={`smart-rec-card${compact ? ' compact' : ''}`}>
      <div className="smart-rec-icon" aria-hidden>{suggestion.icon}</div>
      <div className="smart-rec-body">
        <span className="smart-rec-kind">{kindLabel(suggestion.kind)}</span>
        <strong className="smart-rec-title">{suggestion.title}</strong>
        {!compact ? <p className="smart-rec-desc">{suggestion.description}</p> : null}
      </div>
      <div className="smart-rec-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={onAction}>
          {suggestion.actionLabel ?? 'Ir'}
        </button>
        {onDismiss ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss} aria-label="Descartar sugerencia">
            ×
          </button>
        ) : null}
      </div>
    </article>
  );
}
