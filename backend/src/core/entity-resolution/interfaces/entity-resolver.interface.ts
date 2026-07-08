import type { EntityResolutionRequest } from '../domain/entity-resolution.types';
import type { ResolutionResult } from '../domain/entity-resolution.types';

export interface EntityResolver {
  readonly key: string;

  supports(request: EntityResolutionRequest): boolean;

  resolve(request: EntityResolutionRequest): Promise<ResolutionResult>;
}

export const ENTITY_RESOLVERS = Symbol('ENTITY_RESOLVERS');
