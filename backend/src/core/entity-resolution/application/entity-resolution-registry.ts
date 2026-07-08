import { Inject, Injectable, Optional } from '@nestjs/common';
import type { EntityResolver } from '../interfaces/entity-resolver.interface';
import { ENTITY_RESOLVERS } from '../interfaces/entity-resolver.interface';

@Injectable()
export class EntityResolverRegistry {
  private readonly resolvers = new Map<string, EntityResolver>();

  constructor(@Optional() @Inject(ENTITY_RESOLVERS) resolvers: EntityResolver[] = []) {
    for (const resolver of resolvers) {
      this.register(resolver);
    }
  }

  register(resolver: EntityResolver): void {
    this.resolvers.set(resolver.key, resolver);
  }

  unregister(key: string): boolean {
    return this.resolvers.delete(key);
  }

  get(key: string): EntityResolver | undefined {
    return this.resolvers.get(key);
  }

  getAll(): EntityResolver[] {
    return Array.from(this.resolvers.values());
  }

  exists(key: string): boolean {
    return this.resolvers.has(key);
  }
}
