export type EntityResolutionEntityType = 'Producer' | 'Farm' | 'Lot' | string;

export interface EntityResolutionRequest {
  entityType: EntityResolutionEntityType;
  organizationId: string;
  processingType?: string | null;
  payload: Record<string, unknown>;
}

export interface ResolutionAlternative {
  entityId: string;
  entityType: string;
  confidence: number;
  matchedBy: string;
  matchedValue: string;
}

export interface ResolutionResult {
  resolved: boolean;
  confidence: number;
  entityId: string | null;
  entityType: string;
  matchedBy: string | null;
  matchedValue: string | null;
  alternatives: ResolutionAlternative[];
}

export interface ResolvedEntityRef {
  entityType: string;
  entityId: string;
}

export function unresolvedResult(
  entityType: string,
  alternatives: ResolutionAlternative[] = [],
): ResolutionResult {
  return {
    resolved: false,
    confidence: 0,
    entityId: null,
    entityType,
    matchedBy: null,
    matchedValue: null,
    alternatives,
  };
}

export function resolvedResult(input: {
  entityType: string;
  entityId: string;
  confidence: number;
  matchedBy: string;
  matchedValue: string;
  alternatives?: ResolutionAlternative[];
}): ResolutionResult {
  return {
    resolved: true,
    confidence: input.confidence,
    entityId: input.entityId,
    entityType: input.entityType,
    matchedBy: input.matchedBy,
    matchedValue: input.matchedValue,
    alternatives: input.alternatives ?? [],
  };
}
