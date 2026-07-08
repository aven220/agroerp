import { Injectable } from '@nestjs/common';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import { extractPhotos, mapDocuments } from '../application/workspace-entity.helpers';

@Injectable()
export class GalleryProvider implements WorkspaceProvider {
  readonly key = 'gallery';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly lots: LotsService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const photos = await this.loadPhotos(context);

    return {
      section: { id: 'gallery', title: 'Galería', priority: 60, collapsed: true },
      widgets: [
        {
          id: 'gallery:main',
          type: 'gallery',
          title: 'Fotos y medios',
          priority: 1,
          data: { photos, total: photos.length },
        },
      ],
    };
  }

  private async loadPhotos(context: WorkspaceQueryContext) {
    switch (context.entityType) {
      case 'Producer': {
        const profile = await this.producers.findOne(
          context.organizationId,
          context.entityId,
        );
        return extractPhotos(mapDocuments((profile as { documents?: unknown[] }).documents));
      }
      case 'Farm': {
        const profile = await this.farms.findOne(context.organizationId, context.entityId);
        return extractPhotos(mapDocuments((profile as { documents?: unknown[] }).documents));
      }
      case 'Lot': {
        const profile = await this.lots.findOne(context.organizationId, context.entityId);
        return extractPhotos(mapDocuments((profile as { documents?: unknown[] }).documents));
      }
      default:
        return [];
    }
  }
}
