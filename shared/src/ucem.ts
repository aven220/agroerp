/**
 * UCEM — Universal Catalog & Entity Mapping Engine
 * Low-code data binding for Smart Form Studio / Capture
 */

export const DATA_PROVIDER_TYPES = {
  MANUAL: 'MANUAL',
  STATIC_LIST: 'STATIC_LIST',
  ERP_CATALOG: 'ERP_CATALOG',
  ERP_ENTITY: 'ERP_ENTITY',
  DEPENDENT: 'DEPENDENT',
  FORM_RESULT: 'FORM_RESULT',
  EXTERNAL_API: 'EXTERNAL_API',
} as const;

export type DataProviderType =
  (typeof DATA_PROVIDER_TYPES)[keyof typeof DATA_PROVIDER_TYPES];

export interface FieldDataProvider {
  type: DataProviderType;
  catalogKey?: string;
  entityType?: string;
  entityField?: string;
  dependsOnField?: string;
  dependsOnCatalog?: string;
  apiUrl?: string;
  valueField?: string;
  labelField?: string;
  sourceFieldKey?: string;
  staticOptions?: Array<{ value: string; label: string }>;
}

export const UCEM_CATALOG_DOMAINS = {
  LOCATION: 'Ubicación',
  AGRONOMY: 'Agronomía',
  ENTERPRISE: 'Empresa',
  PRODUCTION: 'Producción',
  CUSTOM: 'Personalizados',
} as const;

export type UcemCatalogDomain =
  (typeof UCEM_CATALOG_DOMAINS)[keyof typeof UCEM_CATALOG_DOMAINS];

export interface UniversalCatalogDefinition {
  catalogKey: string;
  displayName: string;
  domain: UcemCatalogDomain | string;
  offlineCapable: boolean;
  dependencies?: string[];
  version: string;
}

export interface FormFieldEntityMapping {
  fieldKey: string;
  entityType: string;
  entityProperty: string;
}

export interface FormEntityMapping {
  targetEntity: string;
  mappings: FormFieldEntityMapping[];
}

export interface FormUcemFieldOrigin {
  fieldKey: string;
  label: string;
  dataProviderType: DataProviderType;
  catalogKey?: string;
  dependencies?: string[];
  entityProperty?: string;
  entityType?: string;
}

export interface FormUcemPreview {
  entityMapping?: FormEntityMapping;
  universalCatalogs: UniversalCatalogDefinition[];
  fieldOrigins: FormUcemFieldOrigin[];
}

/** ERP entity property catalog for mapping UI */
export const UCEM_ERP_ENTITIES: Record<
  string,
  Array<{ property: string; label: string; dtoPath: string }>
> = {
  Producer: [
    { property: 'name', label: 'Nombre', dtoPath: 'legalName' },
    { property: 'document', label: 'Documento', dtoPath: 'documentNumber' },
    { property: 'city', label: 'Municipio', dtoPath: 'municipalityCode' },
    { property: 'mainCrop', label: 'Cultivo principal', dtoPath: 'metadata.mainCrop' },
    { property: 'phone', label: 'Teléfono', dtoPath: 'metadata.phone' },
    { property: 'email', label: 'Correo', dtoPath: 'metadata.email' },
  ],
  Farm: [
    { property: 'name', label: 'Nombre finca', dtoPath: 'name' },
    { property: 'area', label: 'Área', dtoPath: 'areaHa' },
    { property: 'municipality', label: 'Municipio', dtoPath: 'municipalityCode' },
  ],
  Production: [
    { property: 'quantity', label: 'Cantidad', dtoPath: 'quantity' },
    { property: 'crop', label: 'Cultivo', dtoPath: 'cropCode' },
  ],
};
