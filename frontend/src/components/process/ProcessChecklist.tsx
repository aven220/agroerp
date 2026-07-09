import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS_FLOWS, resolveFlowStepIndex, type FlowId } from '../../lib/businessFlows';
import { getFlowMilestones } from '../../lib/processWorkspace';

interface ProcessChecklistProps {
  flowId: FlowId;
  currentStepId?: string;
  compact?: boolean;
  className?: string;
}

export function ProcessChecklist({
  flowId,
  currentStepId,
  compact = false,
  className = '',
}: ProcessChecklistProps) {
  const flow = BUSINESS_FLOWS[flowId];
  const milestones = useMemo(() => getFlowMilestones(flowId), [flowId]);
  const activeIndex = resolveFlowStepIndex(
    flow,
    typeof window !== 'undefined' ? window.location.pathname : '/',
    currentStepId,
  );

  const completedCount = flow.steps.filter((s) => milestones[s.id]).length;
  const total = flow.steps.length;

  return (
    <aside
      className={`process-checklist${compact ? ' process-checklist-compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label={`Avance: ${flow.title}`}
    >
      <header className="process-checklist-header">
        <span className="process-checklist-title">Su avance</span>
        <span className="process-checklist-count muted">
          {completedCount}/{total} pasos
        </span>
      </header>

      <ul className="process-checklist-items">
        {flow.steps.map((step, index) => {
          const done = Boolean(milestones[step.id]);
          const current = index === activeIndex;
          const state = done ? 'done' : current ? 'current' : 'pending';

          return (
            <li key={step.id} className={`process-checklist-item process-checklist-${state}`}>
              <span className="process-checklist-marker" aria-hidden>
                {done ? '✓' : current ? '●' : '○'}
              </span>
              <div className="process-checklist-text">
                {done || current ? (
                  <Link to={step.route} className="process-checklist-link">
                    {step.label}
                  </Link>
                ) : (
                  <span className="process-checklist-label">{step.label}</span>
                )}
                {current && !done ? (
                  <span className="process-checklist-hint muted">Paso actual</span>
                ) : null}
                {done && milestones[step.id]?.entityName ? (
                  <span className="process-checklist-entity muted">
                    {milestones[step.id].entityName}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
