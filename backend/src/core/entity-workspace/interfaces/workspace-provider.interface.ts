import type { WorkspaceAction } from '../domain/workspace-action';
import type { WorkspaceQueryContext } from '../domain/workspace';
import type { WorkspaceWidget } from '../domain/workspace-widget';

export interface WorkspaceProviderSection {
  id: string;
  title: string;
  priority: number;
  collapsed?: boolean;
}

export interface WorkspaceProviderResult {
  section: WorkspaceProviderSection;
  widgets: WorkspaceWidget[];
  actions?: WorkspaceAction[];
  workspaceMeta?: {
    title?: string;
    subtitle?: string | null;
  };
}

export interface WorkspaceProvider {
  readonly key: string;

  fetch(context: WorkspaceQueryContext): Promise<WorkspaceProviderResult>;
}

export const WORKSPACE_PROVIDERS = Symbol('WORKSPACE_PROVIDERS');
