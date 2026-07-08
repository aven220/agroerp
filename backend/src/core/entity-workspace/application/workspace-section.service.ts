import { Injectable } from '@nestjs/common';
import type { WorkspaceSection } from '../domain/workspace-section';
import type { WorkspaceWidget } from '../domain/workspace-widget';
import type { WorkspaceProviderSection } from '../interfaces/workspace-provider.interface';

@Injectable()
export class WorkspaceSectionService {
  buildSection(
    definition: WorkspaceProviderSection,
    widgets: WorkspaceWidget[],
  ): WorkspaceSection {
    const sortedWidgets = [...widgets].sort((a, b) => a.priority - b.priority);

    return {
      id: definition.id,
      title: definition.title,
      priority: definition.priority,
      widgets: sortedWidgets,
      collapsed: definition.collapsed ?? false,
    };
  }
}
