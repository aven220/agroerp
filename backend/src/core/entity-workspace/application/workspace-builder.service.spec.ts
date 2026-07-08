import { WorkspaceBuilderService } from './workspace-builder.service';
import { WorkspaceLayoutService } from './workspace-layout.service';
import { WorkspaceSectionService } from './workspace-section.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';

describe('WorkspaceBuilderService', () => {
  const sectionService = new WorkspaceSectionService();
  const layoutService = new WorkspaceLayoutService();

  it('merges providers into ordered sections and deduplicates actions', async () => {
    const providers: WorkspaceProvider[] = [
      {
        key: 'summary',
        fetch: async () => ({
          section: { id: 'summary', title: 'Resumen', priority: 1 },
          widgets: [
            {
              id: 'summary:main',
              type: 'summary',
              title: 'Resumen',
              priority: 1,
              data: { title: 'Productor Demo' },
            },
          ],
          actions: [
            { id: 'edit', label: 'Editar', action: 'navigate', href: '/edit' },
          ],
          workspaceMeta: { title: 'Productor Demo', subtitle: 'Doc. 123' },
        }),
      },
      {
        key: 'forms',
        fetch: async () => ({
          section: { id: 'forms', title: 'Formularios', priority: 30 },
          widgets: [
            {
              id: 'forms:main',
              type: 'forms',
              title: 'Formularios',
              priority: 1,
              data: { total: 2 },
            },
          ],
          actions: [
            { id: 'edit', label: 'Editar duplicado', action: 'navigate' },
          ],
        }),
      },
    ];

    const builder = new WorkspaceBuilderService(providers, sectionService, layoutService);
    const workspace = await builder.build({
      organizationId: 'org-1',
      entityType: 'Producer',
      entityId: 'p-1',
      aggregateType: 'Producer',
      entityParam: 'producer',
    });

    expect(workspace.title).toBe('Productor Demo');
    expect(workspace.subtitle).toBe('Doc. 123');
    expect(workspace.sections.map((section) => section.id)).toEqual(['summary', 'forms']);
    expect(workspace.actions).toHaveLength(1);
    expect(workspace.actions[0].id).toBe('edit');
  });

  it('sorts widgets inside each section by priority', async () => {
    const providers: WorkspaceProvider[] = [
      {
        key: 'analytics',
        fetch: async () => ({
          section: { id: 'analytics', title: 'Analítica', priority: 70 },
          widgets: [
            {
              id: 'analytics:secondary',
              type: 'analytics',
              title: 'Secundario',
              priority: 2,
              data: {},
            },
            {
              id: 'analytics:main',
              type: 'analytics',
              title: 'Principal',
              priority: 1,
              data: {},
            },
          ],
        }),
      },
    ];

    const builder = new WorkspaceBuilderService(providers, sectionService, layoutService);
    const workspace = await builder.build({
      organizationId: 'org-1',
      entityType: 'Farm',
      entityId: 'f-1',
      aggregateType: 'FarmUnit',
      entityParam: 'farm',
    });

    expect(workspace.sections[0].widgets.map((widget) => widget.id)).toEqual([
      'analytics:main',
      'analytics:secondary',
    ]);
  });
});
