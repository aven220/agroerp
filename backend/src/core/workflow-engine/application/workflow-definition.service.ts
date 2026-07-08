import { Injectable } from '@nestjs/common';
import type {
  WorkflowDefinition,
  WorkflowValidationResult,
} from '../domain/workflow-definition';
import type { WorkflowState } from '../domain/workflow-state';
import type { WorkflowTransition } from '../domain/workflow-transition';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

@Injectable()
export class WorkflowDefinitionService {
  resolveFromFormMetadata(metadata: unknown): WorkflowDefinition | null {
    const root = asRecord(metadata);
    const raw = asRecord(root.workflow);
    if (!raw.enabled) return null;

    const states = this.parseStates(raw.states);
    const transitions = this.parseTransitions(raw.transitions);

    return {
      enabled: true,
      states,
      transitions,
    };
  }

  validate(definition: WorkflowDefinition): WorkflowValidationResult {
    const errors: string[] = [];

    if (!definition.enabled) {
      errors.push('Workflow is not enabled');
    }
    if (!definition.states.length) {
      errors.push('Workflow must define at least one state');
    }

    const stateIds = new Set(definition.states.map((state) => state.id));
    for (const state of definition.states) {
      if (!state.id?.trim()) errors.push('State id is required');
      if (!state.name?.trim()) errors.push(`State ${state.id} name is required`);
    }

    for (const transition of definition.transitions) {
      if (!stateIds.has(transition.from)) {
        errors.push(`Transition references unknown source state: ${transition.from}`);
      }
      if (!stateIds.has(transition.to)) {
        errors.push(`Transition references unknown target state: ${transition.to}`);
      }
      if (!transition.action?.trim()) {
        errors.push('Transition action is required');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  resolveInitialState(definition: WorkflowDefinition): WorkflowState | null {
    if (!definition.states.length) return null;

    const targetIds = new Set(definition.transitions.map((transition) => transition.to));
    const entryStates = definition.states.filter((state) => !targetIds.has(state.id));
    return entryStates[0] ?? definition.states[0] ?? null;
  }

  findState(definition: WorkflowDefinition, stateId: string): WorkflowState | undefined {
    return definition.states.find((state) => state.id === stateId);
  }

  private parseStates(raw: unknown): WorkflowState[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => asRecord(item))
      .filter((item) => typeof item.id === 'string')
      .map((item) => ({
        id: String(item.id),
        name: String(item.name ?? item.id),
      }));
  }

  private parseTransitions(raw: unknown): WorkflowTransition[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => asRecord(item))
      .filter(
        (item) =>
          typeof item.from === 'string' &&
          typeof item.to === 'string' &&
          typeof item.action === 'string',
      )
      .map((item) => ({
        from: String(item.from),
        to: String(item.to),
        action: String(item.action),
      }));
  }
}
