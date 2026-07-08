import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

export interface FormInspectorContext {
  formKey?: string;
  name?: string;
  description?: string;
}

const FORM_INSPECTOR: InspectorTypeDefinition<FormInspectorContext> = {
  type: 'FORM',
  title: (context) => context.name ?? 'Formulario',
  subtitle: (context) => context.formKey ?? null,
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'validation', title: 'Validación', priority: 2, collapsed: true },
    { id: 'advanced', title: 'Avanzado', priority: 3, collapsed: true },
  ],
  properties: [
    {
      id: 'form.name',
      label: 'Nombre',
      groupId: 'general',
      priority: 1,
      render: (context) => (
        <input id="form.name" value={context.name ?? ''} readOnly aria-readonly />
      ),
    },
    {
      id: 'form.description',
      label: 'Descripción',
      groupId: 'general',
      priority: 2,
      render: (context) => (
        <textarea id="form.description" value={context.description ?? ''} readOnly aria-readonly />
      ),
    },
  ],
};

export function registerFormInspector(): void {
  inspectorRegistry.register(FORM_INSPECTOR);
}
