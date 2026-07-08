/** Supported flow actions — decision only, execution is delegated to processors. */
import type { ResolutionResult, ResolvedEntityRef } from '@/core/entity-resolution/domain/entity-resolution.types';

export type { ResolutionResult, ResolvedEntityRef };
export const FLOW_ACTIONS = {
  CREATE_ENTITY: 'CREATE_ENTITY',
  UPDATE_ENTITY: 'UPDATE_ENTITY',
  APPEND_CHILD: 'APPEND_CHILD',
  REGISTER_EVENT: 'REGISTER_EVENT',
  SKIP: 'SKIP',
} as const;

export type FlowAction = (typeof FLOW_ACTIONS)[keyof typeof FLOW_ACTIONS];

export interface FlowExistingEntity {
  entityType: string;
  id: string;
  source: string;
}

export interface FlowContextUser {
  id: string;
}

export interface FlowContext {
  submission: {
    id: string;
    data: unknown;
    context: unknown;
    externalId?: string | null;
    gpsLocation?: unknown;
  };
  form: {
    id: string;
    formKey: string;
    version: number;
    metadata?: unknown;
    schema?: unknown;
  };
  processingType: string | null;
  entityMapping?: import('@agroerp/shared').FormEntityMapping;
  organizationId: string;
  currentUser: FlowContextUser;
  existingEntities: FlowExistingEntity[];
  resolvedEntity?: ResolvedEntityRef | null;
  resolutionResult?: ResolutionResult;
}

export interface SubmissionDecision {
  action: FlowAction;
  targetEntity: string | null;
  targetId: string | null;
  reason: string;
  processor: string | null;
}

export interface FlowDecisionCandidate extends SubmissionDecision {
  ruleId: string;
  priority: number;
}
