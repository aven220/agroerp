import { Injectable } from '@nestjs/common';
import type { WorkspaceLayout } from '../domain/workspace-layout';
import { DEFAULT_WORKSPACE_LAYOUT } from '../domain/workspace-layout';
import type { WorkspaceSection } from '../domain/workspace-section';

@Injectable()
export class WorkspaceLayoutService {
  applyLayout(
    sections: WorkspaceSection[],
    layout: WorkspaceLayout = DEFAULT_WORKSPACE_LAYOUT,
  ): WorkspaceSection[] {
    const orderIndex = new Map(
      layout.sectionOrder.map((sectionId, index) => [sectionId, index]),
    );
    const collapsed = new Set(layout.defaultCollapsed);

    return [...sections]
      .map((section) => ({
        ...section,
        collapsed: section.collapsed || collapsed.has(section.id),
      }))
      .sort((a, b) => {
        const aOrder = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.priority - b.priority;
      });
  }
}
