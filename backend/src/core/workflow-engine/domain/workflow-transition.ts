import type { WorkflowRuntimeAction } from './workflow-action';

export interface WorkflowTransition {
  from: string;
  to: string;
  action: WorkflowRuntimeAction | string;
}
