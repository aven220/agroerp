import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

export interface LayoutInspectorContext {
  nodeType?: string;
  nodeTitle?: string;
}

const LAYOUT_INSPECTOR: InspectorTypeDefinition<LayoutInspectorContext> = {
  type: 'LAYOUT',
  title: (context) => context.nodeTitle ?? 'Layout',
  subtitle: (context) => (context.nodeType ? `Nodo: ${context.nodeType}` : 'Estructura visual'),
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'appearance', title: 'Apariencia', priority: 2 },
    { id: 'data', title: 'Datos', priority: 3, collapsed: true },
    { id: 'advanced', title: 'Avanzado', priority: 4, collapsed: true },
  ],
  properties: [
    {
      id: 'layout.hint',
      label: 'Editor de layout',
      groupId: 'general',
      priority: 1,
      render: () => (
        <p className="muted">
          Use el árbol de layout para editar secciones, pestañas, matrices y grupos repetibles.
        </p>
      ),
    },
  ],
};

export function registerLayoutInspector(): void {
  inspectorRegistry.register(LAYOUT_INSPECTOR);
}
