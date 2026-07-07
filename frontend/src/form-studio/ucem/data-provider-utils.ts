import type { FormFieldDefinition } from '../../api/forms';
import type { FieldDataProvider } from '../../api/forms';

export const DATA_PROVIDER_TYPES = {
  MANUAL: 'MANUAL',
  STATIC_LIST: 'STATIC_LIST',
  ERP_CATALOG: 'ERP_CATALOG',
  ERP_ENTITY: 'ERP_ENTITY',
  DEPENDENT: 'DEPENDENT',
  FORM_RESULT: 'FORM_RESULT',
  EXTERNAL_API: 'EXTERNAL_API',
} as const;

export const DATA_PROVIDER_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  STATIC_LIST: 'Lista estática',
  ERP_CATALOG: 'Catálogo ERP',
  ERP_ENTITY: 'Entidad ERP',
  DEPENDENT: 'Dependiente',
  FORM_RESULT: 'Resultado formulario',
  EXTERNAL_API: 'API externa',
};

const LAYOUT_TYPES = new Set([
  'heading', 'separator', 'html', 'markdown', 'hyperlink', 'button', 'indicator', 'hidden',
]);

export function isDataField(field: FormFieldDefinition): boolean {
  return !LAYOUT_TYPES.has(field.type);
}

export function inferDataProvider(field: FormFieldDefinition): FieldDataProvider {
  if (field.dataProvider) return field.dataProvider;

  const catalogKey = field.metadata?.catalogKey as string | undefined;
  if (catalogKey && field.metadata?.dynamicList) {
    const dependsOn = field.metadata?.dependsOnField as string | undefined;
    return {
      type: dependsOn ? DATA_PROVIDER_TYPES.DEPENDENT : DATA_PROVIDER_TYPES.ERP_CATALOG,
      catalogKey,
      dependsOnField: dependsOn,
    };
  }

  if (field.options?.length) {
    return { type: DATA_PROVIDER_TYPES.STATIC_LIST, staticOptions: field.options };
  }

  if (field.relationTo) {
    return { type: DATA_PROVIDER_TYPES.ERP_ENTITY, entityType: field.relationTo };
  }

  return { type: DATA_PROVIDER_TYPES.MANUAL };
}

export function applyDataProviderToField(
  field: FormFieldDefinition,
  provider: FieldDataProvider,
): FormFieldDefinition {
  const next = { ...field, dataProvider: provider };

  if (provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG || provider.type === DATA_PROVIDER_TYPES.DEPENDENT) {
    next.metadata = {
      ...next.metadata,
      catalogKey: provider.catalogKey,
      dynamicList: true,
      dependsOnField: provider.dependsOnField,
    };
    if (provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG) {
      delete next.metadata?.dependsOnField;
    }
  }

  if (provider.type === DATA_PROVIDER_TYPES.STATIC_LIST && provider.staticOptions) {
    next.options = provider.staticOptions;
  }

  if (provider.type === DATA_PROVIDER_TYPES.ERP_ENTITY && provider.entityType) {
    next.relationTo = provider.entityType;
  }

  if (provider.type === DATA_PROVIDER_TYPES.EXTERNAL_API && provider.apiUrl) {
    next.apiSource = {
      url: provider.apiUrl,
      valueField: provider.valueField ?? 'value',
      labelField: provider.labelField ?? 'label',
    };
  }

  return next;
}

export function buildClientUcemPreview(
  fields: FormFieldDefinition[],
  entityMapping: import('../../api/forms').FormEntityMapping | undefined,
  universalCatalogs: import('./universal-catalog-registry').UniversalCatalogDefinition[],
) {
  const catalogMap = new Map(universalCatalogs.map((c) => [c.catalogKey, c]));
  const mappingMap = new Map((entityMapping?.mappings ?? []).map((m) => [m.fieldKey, m]));

  return fields.filter(isDataField).map((field) => {
    const provider = inferDataProvider(field);
    const catalog = provider.catalogKey ? catalogMap.get(provider.catalogKey) : undefined;
    const mapping = mappingMap.get(field.key);
    return {
      fieldKey: field.key,
      label: field.label,
      dataProviderType: provider.type,
      catalogKey: provider.catalogKey,
      dependencies: catalog?.dependencies ?? (provider.dependsOnField ? [provider.dependsOnField] : undefined),
      entityProperty: mapping?.entityProperty,
      entityType: mapping?.entityType ?? entityMapping?.targetEntity,
    };
  });
}
