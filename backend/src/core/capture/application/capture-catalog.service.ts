import { Injectable } from '@nestjs/common';
import { FormDefinitionSchema, FormFieldDefinition } from '@agroerp/shared';
import {
  CAPTURE_CATALOG_REGISTRY,
  CAPTURE_CATALOG_REGISTRY_VERSION,
} from '../domain/catalogs/capture-catalog.registry';
import type { CaptureCatalog } from '../domain';

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

  extractCatalogKeysFromSchemas(schemas: unknown[]): string[] {
    const keys = new Set<string>();
    for (const schema of schemas) {
      const def = schema as FormDefinitionSchema;
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
    const catalogKey = field.metadata?.catalogKey;
    if (typeof catalogKey === 'string' && catalogKey.trim()) {
      keys.add(catalogKey);
    }
  }
}
