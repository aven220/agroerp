export interface WorkspaceAction {
  id: string;
  label: string;
  action: string;
  href?: string;
  variant?: 'primary' | 'default' | 'danger';
}
