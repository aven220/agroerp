import { Injectable } from '@nestjs/common';
import {
  DATA_PROVIDER_TYPES,
  type FormDefinitionSchema,
  type FormEntityMapping,
  type FormFieldDefinition,
  type FormUcemFieldOrigin,
  type FormUcemPreview,
  type FieldDataProvider,
} from '@agroerp/shared';

const LAYOUT_TYPES = new Set([
  'heading', 'separator', 'html', 'markdown', 'hyperlink', 'button', 'indicator', 'hidden',
]);

function inferDataProvider(field: FormFieldDefinition): FieldDataProvider {
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

  if (field.apiSource?.url) {
    return {
      type: DATA_PROVIDER_TYPES.EXTERNAL_API,
      apiUrl: field.apiSource.url,
      valueField: field.apiSource.valueField,
      labelField: field.apiSource.labelField,
    };
  }

  if (field.relationTo) {
    return { type: DATA_PROVIDER_TYPES.ERP_ENTITY, entityType: field.relationTo };
  }

  return { type: DATA_PROVIDER_TYPES.MANUAL };
}

function flattenFormFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  const result: FormFieldDefinition[] = [];
  for (const field of fields) {
    result.push(field);
    if (field.fields?.length) result.push(...flattenFormFields(field.fields));
  }
  return result;
}

@Injectable()
export class UcemPreviewService {
  buildPreview(
    schema: FormDefinitionSchema,
    entityMapping?: FormEntityMapping,
  ): FormUcemPreview {
    const mappingByField = new Map(
      (entityMapping?.mappings ?? []).map((m) => [m.fieldKey, m]),
    );
    const catalogMap = new Map(
      (schema.universalCatalogs ?? []).map((c) => [c.catalogKey, c]),
    );

    const fieldOrigins: FormUcemFieldOrigin[] = flattenFormFields(schema.fields ?? [])
      .filter((f) => !LAYOUT_TYPES.has(f.type))
      .map((field) => {
        const provider = inferDataProvider(field);
        const mapping = mappingByField.get(field.key);
        const catalog = provider.catalogKey ? catalogMap.get(provider.catalogKey) : undefined;
        const dependencies = catalog?.dependencies?.length
          ? catalog.dependencies
          : provider.dependsOnField
            ? [provider.dependsOnField]
            : undefined;

        return {
          fieldKey: field.key,
          label: field.label,
          dataProviderType: provider.type,
          catalogKey: provider.catalogKey,
          dependencies,
          entityProperty: mapping?.entityProperty,
          entityType: mapping?.entityType ?? entityMapping?.targetEntity,
        };
      });

    return {
      entityMapping,
      universalCatalogs: schema.universalCatalogs ?? [],
      fieldOrigins,
    };
  }
}
