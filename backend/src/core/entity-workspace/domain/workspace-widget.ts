export interface WorkspaceWidget {
  id: string;
  type: string;
  title: string;
  priority: number;
  data: Record<string, unknown>;
}
