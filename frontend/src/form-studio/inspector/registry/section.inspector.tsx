import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

export interface SectionInspectorContext {
  title?: string;
  description?: string;
}

const SECTION_INSPECTOR: InspectorTypeDefinition<SectionInspectorContext> = {
  type: 'SECTION',
  title: (context) => context.title ?? 'Sección',
  subtitle: () => 'Contenedor de campos',
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'appearance', title: 'Apariencia', priority: 2 },
    { id: 'advanced', title: 'Avanzado', priority: 3, collapsed: true },
  ],
  properties: [
    {
      id: 'section.title',
      label: 'Título',
      groupId: 'general',
      priority: 1,
      render: (context) => (
        <input id="section.title" value={context.title ?? ''} readOnly aria-readonly />
      ),
    },
    {
      id: 'section.description',
      label: 'Descripción',
      groupId: 'general',
      priority: 2,
      render: (context) => (
        <textarea
          id="section.description"
          value={context.description ?? ''}
          readOnly
          aria-readonly
        />
      ),
    },
  ],
};

export function registerSectionInspector(): void {
  inspectorRegistry.register(SECTION_INSPECTOR);
}
