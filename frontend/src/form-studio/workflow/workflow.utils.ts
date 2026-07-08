import type { FormWorkflowDefinition, FormWorkflowState, FormWorkflowTransition } from './workflow.types';

export function defaultWorkflow(): FormWorkflowDefinition {
  return {
    enabled: false,
    states: [],
    transitions: [],
  };
}

export function mergeWorkflow(partial?: Partial<FormWorkflowDefinition>): FormWorkflowDefinition {
  const base = defaultWorkflow();
  return {
    enabled: partial?.enabled ?? base.enabled,
    states: partial?.states ?? base.states,
    transitions: partial?.transitions ?? base.transitions,
  };
}

export function workflowFromMetadata(
  metadata?: Record<string, unknown> | { workflow?: FormWorkflowDefinition },
): FormWorkflowDefinition {
  const raw = metadata?.workflow as FormWorkflowDefinition | undefined;
  if (!raw) return defaultWorkflow();
  return mergeWorkflow(raw);
}

export function workflowToMetadata(
  value: FormWorkflowDefinition,
): FormWorkflowDefinition | undefined {
  if (!value.enabled && value.states.length === 0 && value.transitions.length === 0) {
    return undefined;
  }
  return {
    enabled: value.enabled,
    states: value.states,
    transitions: value.transitions,
  };
}

export function createWorkflowState(name?: string, existing: FormWorkflowState[] = []): FormWorkflowState {
  const id = `state_${Date.now().toString(36)}`;
  return {
    id,
    name: name ?? `Estado ${existing.length + 1}`,
  };
}

export function addWorkflowState(value: FormWorkflowDefinition): FormWorkflowDefinition {
  return {
    ...value,
    states: [...value.states, createWorkflowState(undefined, value.states)],
  };
}

export function updateWorkflowState(
  value: FormWorkflowDefinition,
  stateId: string,
  patch: Partial<FormWorkflowState>,
): FormWorkflowDefinition {
  return {
    ...value,
    states: value.states.map((state) => (state.id === stateId ? { ...state, ...patch } : state)),
  };
}

export function removeWorkflowState(value: FormWorkflowDefinition, stateId: string): FormWorkflowDefinition {
  return {
    ...value,
    states: value.states.filter((state) => state.id !== stateId),
    transitions: value.transitions.filter(
      (transition) => transition.from !== stateId && transition.to !== stateId,
    ),
  };
}

export function createWorkflowTransition(
  from = '',
  to = '',
  action = 'SUBMIT',
): FormWorkflowTransition {
  return { from, to, action };
}

export function addWorkflowTransition(value: FormWorkflowDefinition): FormWorkflowDefinition {
  const from = value.states[0]?.id ?? '';
  const to = value.states[1]?.id ?? value.states[0]?.id ?? '';
  return {
    ...value,
    transitions: [...value.transitions, createWorkflowTransition(from, to)],
  };
}

export function updateWorkflowTransition(
  value: FormWorkflowDefinition,
  index: number,
  patch: Partial<FormWorkflowTransition>,
): FormWorkflowDefinition {
  return {
    ...value,
    transitions: value.transitions.map((transition, transitionIndex) =>
      transitionIndex === index ? { ...transition, ...patch } : transition,
    ),
  };
}

export function removeWorkflowTransition(
  value: FormWorkflowDefinition,
  index: number,
): FormWorkflowDefinition {
  return {
    ...value,
    transitions: value.transitions.filter((_, transitionIndex) => transitionIndex !== index),
  };
}
