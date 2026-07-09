import { ProcessChecklist } from './ProcessChecklist';
import { ProcessMilestoneBanner } from './ProcessMilestoneBanner';
import type { FlowId } from '../../lib/businessFlows';

interface ProcessWorkspacePanelProps {
  flowId: FlowId;
  currentStepId?: string;
  entityName?: string;
  showChecklist?: boolean;
  showMilestone?: boolean;
  className?: string;
}

/**
 * PM-02 — Panel de continuidad de proceso: hito recién completado + checklist de avance.
 */
export function ProcessWorkspacePanel({
  flowId,
  currentStepId,
  entityName,
  showChecklist = true,
  showMilestone = true,
  className = '',
}: ProcessWorkspacePanelProps) {
  return (
    <div className={`process-workspace-panel${className ? ` ${className}` : ''}`}>
      {showMilestone ? (
        <ProcessMilestoneBanner flowId={flowId} entityName={entityName} />
      ) : null}
      {showChecklist ? (
        <ProcessChecklist flowId={flowId} currentStepId={currentStepId} />
      ) : null}
    </div>
  );
}
