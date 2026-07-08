import { Module } from '@nestjs/common';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EntityResolutionService } from './application/entity-resolution.service';
import { EntityResolverRegistry } from './application/entity-resolution-registry';
import { ProducerResolver } from './resolvers/producer.resolver';
import { FarmResolver } from './resolvers/farm.resolver';
import { LotResolver } from './resolvers/lot.resolver';
import {
  ENTITY_RESOLVERS,
  type EntityResolver,
} from './interfaces/entity-resolver.interface';

@Module({
  imports: [PrmModule, FtipModule, FmdtModule],
  providers: [
    ProducerResolver,
    FarmResolver,
    LotResolver,
    {
      provide: ENTITY_RESOLVERS,
      useFactory: (
        producer: ProducerResolver,
        farm: FarmResolver,
        lot: LotResolver,
      ): EntityResolver[] => [producer, farm, lot],
      inject: [ProducerResolver, FarmResolver, LotResolver],
    },
    {
      provide: EntityResolverRegistry,
      useFactory: (resolvers: EntityResolver[]) => {
        const registry = new EntityResolverRegistry(resolvers);
        return registry;
      },
      inject: [ENTITY_RESOLVERS],
    },
    EntityResolutionService,
  ],
  exports: [EntityResolutionService, EntityResolverRegistry],
})
export class EntityResolutionModule {}
