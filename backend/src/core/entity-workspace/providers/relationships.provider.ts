import { Injectable } from '@nestjs/common';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import {
  buildFarmRelationships,
  buildLotRelationships,
  buildProducerRelationships,
} from '../application/workspace-entity.helpers';

@Injectable()
export class RelationshipsProvider implements WorkspaceProvider {
  readonly key = 'relationships';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly lots: LotsService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const relationships = await this.loadRelationships(context);

    return {
      section: { id: 'relationships', title: 'Relaciones', priority: 40 },
      widgets: [
        {
          id: 'relationships:main',
          type: 'relationships',
          title: 'Entidades relacionadas',
          priority: 1,
          data: { relationships, total: relationships.length },
        },
      ],
    };
  }

  private async loadRelationships(context: WorkspaceQueryContext) {
    switch (context.entityType) {
      case 'Producer': {
        const profile = await this.producers.findOne(
          context.organizationId,
          context.entityId,
        );
        return buildProducerRelationships(profile);
      }
      case 'Farm': {
        const profile = await this.farms.findOne(context.organizationId, context.entityId);
        return buildFarmRelationships(profile);
      }
      case 'Lot': {
        const profile = await this.lots.findOne(context.organizationId, context.entityId);
        return buildLotRelationships(profile);
      }
      default:
        return [];
    }
  }
}
