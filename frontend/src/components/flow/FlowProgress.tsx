import { Link, useLocation } from 'react-router-dom';
import {
  BUSINESS_FLOWS,
  resolveFlowStepIndex,
  type FlowId,
} from '../../lib/businessFlows';

interface FlowProgressProps {
  flowId: FlowId;
  /** Forzar paso activo (p. ej. tras completar una acción) */
  currentStepId?: string;
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function FlowProgress({
  flowId,
  currentStepId,
  compact = false,
  showTitle = true,
  className = '',
}: FlowProgressProps) {
  const { pathname } = useLocation();
  const flow = BUSINESS_FLOWS[flowId];
  const activeIndex = resolveFlowStepIndex(flow, pathname, currentStepId);

  return (
    <nav
      className={`flow-progress${compact ? ' flow-progress-compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label={`Progreso: ${flow.title}`}
    >
      {showTitle && !compact ? (
        <div className="flow-progress-header">
          <strong className="flow-progress-title">{flow.title}</strong>
          <span className="flow-progress-desc muted">{flow.description}</span>
        </div>
      ) : null}

      <ol className="flow-progress-steps">
        {flow.steps.map((step, index) => {
          const state =
            index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
          const isLink = state !== 'upcoming' || index <= activeIndex + 1;

          return (
            <li key={step.id} className="flow-progress-item">
              {isLink ? (
                <Link to={step.route} className={`flow-step flow-step-${state}`}>
                  <span className="flow-step-marker" aria-hidden>
                    {state === 'done' ? '✓' : index + 1}
                  </span>
                  <span className="flow-step-label">{step.label}</span>
                </Link>
              ) : (
                <span className={`flow-step flow-step-${state}`}>
                  <span className="flow-step-marker" aria-hidden>{index + 1}</span>
                  <span className="flow-step-label">{step.label}</span>
                </span>
              )}
              {index < flow.steps.length - 1 ? (
                <span className="flow-step-connector" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
