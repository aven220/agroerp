export interface WorkspaceLayout {
  sectionOrder: string[];
  defaultCollapsed: string[];
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  sectionOrder: [
    'summary',
    'health',
    'insights',
    'timeline',
    'forms',
    'relationships',
    'documents',
    'gallery',
    'analytics',
  ],
  defaultCollapsed: ['analytics', 'gallery'],
};
