import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Workspace, WorkspaceQueryContext } from '../domain/workspace';
import type { WorkspaceAction } from '../domain/workspace-action';
import {
  WORKSPACE_PROVIDERS,
  type WorkspaceProvider,
} from '../interfaces/workspace-provider.interface';
import { WorkspaceLayoutService } from './workspace-layout.service';
import { WorkspaceSectionService } from './workspace-section.service';

@Injectable()
export class WorkspaceBuilderService {
  constructor(
    @Optional()
    @Inject(WORKSPACE_PROVIDERS)
    private readonly providers: WorkspaceProvider[] = [],
    private readonly sectionService: WorkspaceSectionService,
    private readonly layoutService: WorkspaceLayoutService,
  ) {}

  async build(context: WorkspaceQueryContext): Promise<Workspace> {
    const results = await Promise.all(
      this.providers.map((provider) => provider.fetch(context)),
    );

    const sections = results.map((result) =>
      this.sectionService.buildSection(result.section, result.widgets),
    );

    const actions = this.deduplicateActions(
      results.flatMap((result) => result.actions ?? []),
    );

    const workspaceMeta = results.reduce(
      (acc, result) => ({
        title: result.workspaceMeta?.title ?? acc.title,
        subtitle: result.workspaceMeta?.subtitle ?? acc.subtitle,
      }),
      { title: context.entityId, subtitle: null as string | null },
    );

    return {
      id: `${context.entityType}:${context.entityId}`,
      entityType: context.entityType,
      entityId: context.entityId,
      title: workspaceMeta.title,
      subtitle: workspaceMeta.subtitle,
      sections: this.layoutService.applyLayout(sections),
      actions,
    };
  }

  deduplicateActions(actions: WorkspaceAction[]): WorkspaceAction[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
      if (seen.has(action.id)) return false;
      seen.add(action.id);
      return true;
    });
  }
}
