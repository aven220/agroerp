import type { WorkspaceWidget } from './workspace-widget';

export interface WorkspaceSection {
  id: string;
  title: string;
  priority: number;
  widgets: WorkspaceWidget[];
  collapsed: boolean;
}
