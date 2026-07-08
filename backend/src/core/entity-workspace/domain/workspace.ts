import type { WorkspaceAction } from './workspace-action';
import type { WorkspaceSection } from './workspace-section';

export interface Workspace {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string | null;
  sections: WorkspaceSection[];
  actions: WorkspaceAction[];
}

export interface WorkspaceQueryContext {
  organizationId: string;
  entityType: string;
  entityId: string;
  aggregateType: string;
  entityParam: string;
}
