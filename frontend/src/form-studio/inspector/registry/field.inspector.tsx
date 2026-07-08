import type { FormDefinitionSchema, FormFieldDefinition } from '../../../api/forms';
import { fieldTypeUsesOptions, FieldOptionsEditor } from '../../../components/forms/FieldOptionsEditor';
import { ConditionalRuleEditor } from '../../../components/forms/ConditionalRuleEditor';
import { DYNAMIC_CATALOGS } from '../../form-dynamic-catalogs';
import type { StudioComponentDef } from '../../form-field-catalog';
import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

export interface FieldInspectorContext {
  field: FormFieldDefinition;
  fieldIndex: number;
  fields: FormFieldDefinition[];
  sections?: FormDefinitionSchema['sections'];
  learning?: StudioComponentDef | null;
  onChange: (patch: Partial<FormFieldDefinition>) => void;
}

const FIELD_INSPECTOR: InspectorTypeDefinition<FieldInspectorContext> = {
  type: 'FIELD',
  title: (context) => context.field.label || context.field.key,
  subtitle: (context) => `Tipo: ${context.field.type}`,
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'validation', title: 'Validación', priority: 2 },
    { id: 'appearance', title: 'Apariencia', priority: 3, collapsed: true },
    { id: 'data', title: 'Datos', priority: 4 },
    { id: 'advanced', title: 'Avanzado', priority: 5, collapsed: true },
  ],
  properties: [
    {
      id: 'field.key',
      label: 'Clave',
      groupId: 'general',
      priority: 1,
      render: (context) => (
        <input
          id="field.key"
          value={context.field.key}
          onChange={(event) => context.onChange({ key: event.target.value })}
        />
      ),
    },
    {
      id: 'field.label',
      label: 'Etiqueta',
      groupId: 'general',
      priority: 2,
      render: (context) => (
        <input
          id="field.label"
          value={context.field.label}
          onChange={(event) => context.onChange({ label: event.target.value })}
        />
      ),
    },
    {
      id: 'field.sectionKey',
      label: 'Sección',
      groupId: 'general',
      priority: 3,
      render: (context) => (
        <select
          id="field.sectionKey"
          value={context.field.sectionKey ?? ''}
          onChange={(event) =>
            context.onChange({ sectionKey: event.target.value || undefined })
          }
        >
          <option value="">— Sin sección —</option>
          {(context.sections ?? []).map((section: NonNullable<FormDefinitionSchema['sections']>[number]) => (
            <option key={section.key} value={section.key}>
              {section.title}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'field.description',
      label: 'Descripción / ayuda',
      groupId: 'general',
      priority: 4,
      render: (context) => (
        <textarea
          id="field.description"
          value={context.field.description ?? ''}
          onChange={(event) => context.onChange({ description: event.target.value })}
        />
      ),
    },
    {
      id: 'field.required',
      label: 'Obligatorio',
      groupId: 'validation',
      priority: 1,
      render: (context) => (
        <label className="form-check">
          <input
            id="field.required"
            type="checkbox"
            checked={Boolean(context.field.required)}
            onChange={(event) => context.onChange({ required: event.target.checked })}
          />
          Campo obligatorio
        </label>
      ),
    },
    {
      id: 'field.visibleWhen',
      label: 'Mostrar solo si',
      groupId: 'validation',
      priority: 2,
      presentation: 'raw',
      render: (context) => (
        <ConditionalRuleEditor
          label="Mostrar solo si"
          ruleKey="visibleWhen"
          field={context.field}
          allFields={context.fields}
          onChange={context.onChange}
        />
      ),
    },
    {
      id: 'field.requiredWhen',
      label: 'Obligatorio solo si',
      groupId: 'validation',
      priority: 3,
      presentation: 'raw',
      render: (context) => (
        <ConditionalRuleEditor
          label="Obligatorio solo si"
          ruleKey="requiredWhen"
          field={context.field}
          allFields={context.fields}
          onChange={context.onChange}
        />
      ),
    },
    {
      id: 'field.placeholder',
      label: 'Placeholder',
      groupId: 'appearance',
      priority: 1,
      render: (context) => (
        <input
          id="field.placeholder"
          value={String(context.field.metadata?.placeholder ?? '')}
          onChange={(event) =>
            context.onChange({
              metadata: { ...context.field.metadata, placeholder: event.target.value || undefined },
            })
          }
        />
      ),
    },
    {
      id: 'field.catalogKey',
      label: 'Lista dinámica',
      groupId: 'data',
      priority: 1,
      render: (context) => (
        <select
          id="field.catalogKey"
          value={String(context.field.metadata?.catalogKey ?? '')}
          onChange={(event) => {
            const catalogKey = event.target.value || undefined;
            const catalog = catalogKey ? DYNAMIC_CATALOGS[catalogKey] : undefined;
            context.onChange({
              type: 'select',
              metadata: {
                ...context.field.metadata,
                catalogKey,
                dynamicList: !!catalogKey,
              },
              options:
                catalog && !catalog.dependsOn
                  ? catalog.options.map((option: { value: string; label: string }) => ({
                      value: option.value,
                      label: option.label,
                    }))
                  : context.field.options,
            });
          }}
        >
          <option value="">— Manual —</option>
          {Object.values(DYNAMIC_CATALOGS).map((catalog: (typeof DYNAMIC_CATALOGS)[string]) => (
            <option key={catalog.key} value={catalog.key}>
              {catalog.label}
              {catalog.dependsOn ? ` (depende de ${catalog.dependsOn})` : ''}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'field.options',
      label: 'Opciones',
      groupId: 'data',
      priority: 2,
      visible: (context) => fieldTypeUsesOptions(context.field.type),
      render: (context) => (
        <FieldOptionsEditor
          options={context.field.options}
          onChange={(options: FormFieldDefinition['options']) => context.onChange({ options })}
        />
      ),
    },
    {
      id: 'field.learning',
      label: 'Modo aprendizaje',
      groupId: 'advanced',
      priority: 1,
      visible: (context) => Boolean(context.learning),
      render: (context) =>
        context.learning ? (
          <div className="form-studio-learning compact">
            <p>{context.learning.description}</p>
            <p className="muted">Ejemplo: {context.learning.example}</p>
          </div>
        ) : null,
    },
  ],
};

export function registerFieldInspector(): void {
  inspectorRegistry.register(FIELD_INSPECTOR);
}
