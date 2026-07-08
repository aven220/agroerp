import { Injectable } from '@nestjs/common';
import { ProducersService } from '@/core/prm/application/producers.service';
import { FarmsService } from '@/core/ftip/application/farms.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import { mapDocuments } from '../application/workspace-entity.helpers';

@Injectable()
export class DocumentsProvider implements WorkspaceProvider {
  readonly key = 'documents';

  constructor(
    private readonly producers: ProducersService,
    private readonly farms: FarmsService,
    private readonly lots: LotsService,
  ) {}

  async fetch(context: WorkspaceQueryContext) {
    const documents = await this.loadDocuments(context);

    return {
      section: { id: 'documents', title: 'Documentos', priority: 50 },
      widgets: [
        {
          id: 'documents:main',
          type: 'documents',
          title: 'Documentos asociados',
          priority: 1,
          data: { documents, total: documents.length },
        },
      ],
    };
  }

  private async loadDocuments(context: WorkspaceQueryContext) {
    switch (context.entityType) {
      case 'Producer': {
        const profile = await this.producers.findOne(
          context.organizationId,
          context.entityId,
        );
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      case 'Farm': {
        const profile = await this.farms.findOne(context.organizationId, context.entityId);
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      case 'Lot': {
        const profile = await this.lots.findOne(context.organizationId, context.entityId);
        return mapDocuments((profile as { documents?: unknown[] }).documents);
      }
      default:
        return [];
    }
  }
}
