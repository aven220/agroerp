import { useMemo } from 'react';
import { FormFieldControl } from '../components/forms/FormFieldControl';
import type { FormFieldDefinition } from '../api/forms';
import { resolveCatalogOptions } from './form-dynamic-catalogs';
import { resolvePreviewFields } from './client-conditional';

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
}

function enrichFieldOptions(field: FormFieldDefinition, data: Record<string, unknown>): FormFieldDefinition {
  const catalogKey = field.metadata?.catalogKey as string | undefined;
  if (!catalogKey || !field.metadata?.dynamicList) return field;
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
