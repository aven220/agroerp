import { Injectable } from '@nestjs/common';
import type {
  WorkflowDefinition,
  WorkflowTransitionValidationResult,
} from '../domain/workflow-definition';
import { isWorkflowRuntimeAction } from '../domain/workflow-action';
import { WorkflowDefinitionService } from './workflow-definition.service';

@Injectable()
export class WorkflowTransitionService {
  constructor(private readonly definitions: WorkflowDefinitionService) {}

  validate(
    definition: WorkflowDefinition,
    currentStateId: string,
    action: string,
  ): WorkflowTransitionValidationResult {
    if (!this.definitions.findState(definition, currentStateId)) {
      return {
        valid: false,
        error: `Current state does not exist: ${currentStateId}`,
      };
    }

    if (!isWorkflowRuntimeAction(action)) {
      return {
        valid: false,
        error: `Unsupported workflow action: ${action}`,
      };
    }

    const transition = definition.transitions.find(
      (item) => item.from === currentStateId && item.action === action,
    );

    if (!transition) {
      return {
        valid: false,
        error: `No transition for action ${action} from state ${currentStateId}`,
      };
    }

    if (!this.definitions.findState(definition, transition.to)) {
      return {
        valid: false,
        error: `Target state does not exist: ${transition.to}`,
      };
    }

    return { valid: true, transition };
  }
}
