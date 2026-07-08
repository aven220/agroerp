import type { WorkflowState } from './workflow-state';
import type { WorkflowTransition } from './workflow-transition';

export interface WorkflowDefinition {
  enabled: boolean;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowCurrentState {
  stateId: string;
  stateName: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export interface WorkflowTransitionValidationResult {
  valid: boolean;
  transition?: WorkflowTransition;
  error?: string;
}
