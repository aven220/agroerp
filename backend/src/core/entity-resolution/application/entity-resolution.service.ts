import { Injectable } from '@nestjs/common';
import type { EntityResolutionRequest } from '../domain/entity-resolution.types';
import { unresolvedResult } from '../domain/entity-resolution.types';
import type { ResolutionResult } from '../domain/entity-resolution.types';
import { EntityResolverRegistry } from './entity-resolution-registry';

@Injectable()
export class EntityResolutionService {
  constructor(private readonly registry: EntityResolverRegistry) {}

  async resolve(request: EntityResolutionRequest): Promise<ResolutionResult> {
    const resolver = this.registry.getAll().find((item) => item.supports(request));
    if (!resolver) {
      return unresolvedResult(String(request.entityType));
    }

    return resolver.resolve(request);
  }
}
