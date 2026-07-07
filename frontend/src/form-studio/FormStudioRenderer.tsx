import { useMemo } from 'react';
import { FormFieldControl } from '../components/forms/FormFieldControl';
import type { FormFieldDefinition } from '../api/forms';
import { resolveCatalogOptions } from './form-dynamic-catalogs';
import { resolvePreviewFields } from './client-conditional';
import type { FormLayoutNode } from './layout/layout-types';
import { effectiveLayout } from './layout/layout-utils';
import { buildFieldsMap, LayoutRenderer } from './layout/LayoutRenderer';

type Field = FormFieldDefinition & {
  visible?: boolean;
  effectiveRequired?: boolean;
  computedValue?: unknown;
};

interface Props {
  fields: FormFieldDefinition[];
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onButtonAction?: (action: string, field: FormFieldDefinition) => void;
  useServerRender?: boolean;
  serverFields?: Field[];
  layout?: FormLayoutNode[];
}

function enrichFieldOptions(field: FormFieldDefinition, data: Record<string, unknown>): FormFieldDefinition {
  const catalogKey =
    field.dataProvider?.catalogKey ?? (field.metadata?.catalogKey as string | undefined);
  const isDynamic =
    field.dataProvider?.type === 'ERP_CATALOG' ||
    field.dataProvider?.type === 'DEPENDENT' ||
    field.metadata?.dynamicList;
  if (!catalogKey || !isDynamic) return field;
  const dynamic = resolveCatalogOptions(catalogKey, data);
  if (dynamic.length === 0 && field.options?.length) return field;
  return { ...field, options: dynamic.length ? dynamic : field.options };
}

export function FormStudioRenderer({
  fields,
  data,
  onChange,
  onButtonAction,
  serverFields,
  layout,
}: Props) {
  const resolved = useMemo(() => {
    if (serverFields?.length) {
      return serverFields
        .filter((f) => f.visible !== false)
        .map((f) => enrichFieldOptions(f, data));
    }
    return resolvePreviewFields(fields, data)
      .filter((f) => f.visible)
      .map((f) => enrichFieldOptions(f, data));
  }, [fields, data, serverFields]);

  const activeLayout = useMemo(
    () => effectiveLayout(layout, fields),
    [layout, fields],
  );

  const useLayoutEngine = Boolean(layout && layout.length > 0);
  const fieldsByKey = useMemo(() => buildFieldsMap(resolved), [resolved]);

  if (useLayoutEngine) {
    return (
      <LayoutRenderer
        layout={activeLayout}
        fieldsByKey={fieldsByKey}
        data={data}
        onChange={onChange}
        onButtonAction={onButtonAction}
      />
    );
  }

  return (
    <>
      {resolved.map((f) => (
        <FormFieldControl
          key={f.key}
          field={f}
          value={data[f.key]}
          onChange={onChange}
          onButtonAction={onButtonAction}
        />
      ))}
    </>
  );
}
