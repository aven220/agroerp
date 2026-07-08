/** Deterministic confidence scores for entity resolution strategies. */
export const RESOLVER_CONFIDENCE = {
  DOCUMENT: 1,
  CODE: 0.95,
  UUID: 1,
  EMAIL: 0.92,
  PHONE: 0.92,
  COMPOSITE: 0.85,
  NAME_MUNICIPALITY: 0.78,
  NAME: 0.65,
} as const;

export type ResolverConfidenceKey = keyof typeof RESOLVER_CONFIDENCE;
