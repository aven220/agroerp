import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  clearLatestMilestoneBanner,
  getLatestMilestone,
  getMilestoneCompletionLabel,
  getProcessNextStep,
  type ProcessMilestone,
} from '../../lib/processWorkspace';
import type { FlowId } from '../../lib/businessFlows';

interface ProcessMilestoneBannerProps {
  flowId: FlowId;
  /** Paso que se acaba de completar (override del hito en sesión) */
  stepId?: string;
  entityName?: string;
  className?: string;
}

export function ProcessMilestoneBanner({
  flowId,
  stepId,
  entityName,
  className = '',
}: ProcessMilestoneBannerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [milestone, setMilestone] = useState<ProcessMilestone | null>(null);
  const [visible, setVisible] = useState(false);

  const urlComplete = searchParams.get('paso') === 'completado';

  useEffect(() => {
    if (!urlComplete && !stepId) {
      setVisible(false);
      return;
    }
    const latest = getLatestMilestone(flowId);
    const active = stepId
      ? { flowId, stepId, completedAt: new Date().toISOString(), entityName }
      : latest;
    if (active) {
      setMilestone(active as ProcessMilestone);
      setVisible(true);
    }
  }, [flowId, stepId, entityName, urlComplete]);

  if (!visible || !milestone) return null;

  const label = getMilestoneCompletionLabel(flowId, milestone.stepId);
  const displayName = entityName ?? milestone.entityName;
  const next = getProcessNextStep(flowId, milestone.stepId);

  function dismiss() {
    setVisible(false);
    clearLatestMilestoneBanner(flowId, milestone?.stepId);
    if (urlComplete) {
      const params = new URLSearchParams(searchParams);
      params.delete('paso');
      const qs = params.toString();
      navigate({ search: qs ? `?${qs}` : '' }, { replace: true });
    }
  }

  return (
    <div className={`process-milestone-banner${className ? ` ${className}` : ''}`} role="status">
      <div className="process-milestone-icon" aria-hidden>✓</div>
      <div className="process-milestone-body">
        <strong className="process-milestone-title">
          {label}
          {displayName ? `: ${displayName}` : ''}
        </strong>
        {next ? (
          <p className="muted process-milestone-next">
            Siguiente paso recomendado: <strong>{next.label}</strong>
          </p>
        ) : (
          <p className="muted process-milestone-next">Ha completado este tramo del proceso.</p>
        )}
      </div>
      <div className="process-milestone-actions">
        {next ? (
          <Link to={next.route} className="btn btn-primary btn-sm" onClick={dismiss}>
            {next.label} →
          </Link>
        ) : null}
        <button type="button" className="btn btn-sm" onClick={dismiss}>
          Entendido
        </button>
      </div>
    </div>
  );
}
