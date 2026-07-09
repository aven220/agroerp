import { Link } from 'react-router-dom';

export interface FlowAction {
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: string;
}

interface FlowNextActionsProps {
  title?: string;
  subtitle?: string;
  actions: FlowAction[];
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function FlowNextActions({
  title = 'Continuar con…',
  subtitle,
  actions,
  dismissible = false,
  onDismiss,
  className = '',
}: FlowNextActionsProps) {
  if (actions.length === 0) return null;

  return (
    <aside
      className={`flow-next-actions panel${className ? ` ${className}` : ''}`}
      aria-label={title}
    >
      <header className="flow-next-actions-header">
        <div>
          <h3 className="flow-next-actions-title">{title}</h3>
          {subtitle ? <p className="muted flow-next-actions-subtitle">{subtitle}</p> : null}
        </div>
        {dismissible && onDismiss ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDismiss}
            aria-label="Cerrar sugerencias"
          >
            ✕
          </button>
        ) : null}
      </header>

      <div className="flow-next-actions-grid">
        {actions.map((action) => {
          const content = (
            <>
              {action.icon ? <span className="flow-action-icon" aria-hidden>{action.icon}</span> : null}
              <span className="flow-action-text">
                <strong>{action.label}</strong>
                {action.description ? (
                  <span className="muted flow-action-desc">{action.description}</span>
                ) : null}
              </span>
              <span className="flow-action-arrow" aria-hidden>→</span>
            </>
          );

          if (action.to) {
            return (
              <Link
                key={action.label}
                to={action.to}
                className={`flow-action-card${action.primary ? ' flow-action-primary' : ''}`}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.label}
              type="button"
              className={`flow-action-card${action.primary ? ' flow-action-primary' : ''}`}
              onClick={action.onClick}
            >
              {content}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
