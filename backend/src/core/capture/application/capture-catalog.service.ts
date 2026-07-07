import { Injectable } from '@nestjs/common';
import { FormDefinitionSchema, FormFieldDefinition } from '@agroerp/shared';
import {
  CAPTURE_CATALOG_REGISTRY,
  CAPTURE_CATALOG_REGISTRY_VERSION,
} from '../domain/catalogs/capture-catalog.registry';
import type { CaptureCatalog } from '../domain';
import {
  UNIVERSAL_CATALOG_REGISTRY,
  UNIVERSAL_CATALOG_REGISTRY_MAP,
} from '../domain/catalogs/universal-catalog.registry';
import type { UniversalCatalogDefinition } from '@agroerp/shared';

@Injectable()
export class CaptureCatalogService {
  getCatalogs(keys?: string[]): { version: string; catalogs: CaptureCatalog[] } {
    const catalogList = keys?.length
      ? keys
          .map((key) => CAPTURE_CATALOG_REGISTRY[key])
          .filter((c): c is CaptureCatalog => Boolean(c))
      : Object.values(CAPTURE_CATALOG_REGISTRY);

    return {
      version: CAPTURE_CATALOG_REGISTRY_VERSION,
      catalogs: catalogList,
    };
  }

  getUniversalCatalogs(keys?: string[]): UniversalCatalogDefinition[] {
    if (keys?.length) {
      return keys
        .map((key) => UNIVERSAL_CATALOG_REGISTRY_MAP[key])
        .filter((c): c is UniversalCatalogDefinition => Boolean(c));
    }
    return UNIVERSAL_CATALOG_REGISTRY;
  }

  extractCatalogKeysFromSchemas(schemas: unknown[]): string[] {
    const keys = new Set<string>();
    for (const schema of schemas) {
      const def = schema as FormDefinitionSchema;
      for (const catalog of def.universalCatalogs ?? []) {
        keys.add(catalog.catalogKey);
      }
      for (const field of this.flattenFields(def?.fields ?? [])) {
        this.collectCatalogKey(field, keys);
      }
    }
    return Array.from(keys).sort();
  }

  private flattenFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
    const result: FormFieldDefinition[] = [];
    for (const field of fields) {
      result.push(field);
      if (field.fields?.length) {
        result.push(...this.flattenFields(field.fields));
      }
    }
    return result;
  }

  private collectCatalogKey(field: FormFieldDefinition, keys: Set<string>) {
    const catalogKey =
      field.dataProvider?.catalogKey ?? (field.metadata?.catalogKey as string | undefined);
    if (typeof catalogKey === 'string' && catalogKey.trim()) {
      keys.add(catalogKey);
    }
  }
}
