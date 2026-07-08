import { Injectable } from '@nestjs/common';
import type { Workspace } from '../domain/workspace';
import { WorkspaceBuilderService } from './workspace-builder.service';
import { resolveWorkspaceEntity } from './workspace-entity.registry';

@Injectable()
export class EntityWorkspaceService {
  constructor(private readonly builder: WorkspaceBuilderService) {}

  async getWorkspace(
    organizationId: string,
    entityParam: string,
    entityId: string,
  ): Promise<Workspace> {
    const binding = resolveWorkspaceEntity(entityParam);

    return this.builder.build({
      organizationId,
      entityType: binding.entityType,
      entityId,
      aggregateType: binding.aggregateType,
      entityParam: binding.entityParam,
    });
  }
}
