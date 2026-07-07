/** UCEM — Universal Catalog registry (frontend mirror of backend) */

export const UCEM_CATALOG_DOMAINS = {
  LOCATION: 'Ubicación',
  AGRONOMY: 'Agronomía',
  ENTERPRISE: 'Empresa',
  PRODUCTION: 'Producción',
  CUSTOM: 'Personalizados',
} as const;

export interface UniversalCatalogDefinition {
  catalogKey: string;
  displayName: string;
  domain: string;
  offlineCapable: boolean;
  dependencies?: string[];
  version: string;
}

export const UNIVERSAL_CATALOG_REGISTRY: UniversalCatalogDefinition[] = [
  { catalogKey: 'paises', displayName: 'Países', domain: UCEM_CATALOG_DOMAINS.LOCATION, offlineCapable: true, version: '1.0.0' },
  { catalogKey: 'departamentos', displayName: 'Departamentos', domain: UCEM_CATALOG_DOMAINS.LOCATION, offlineCapable: true, dependencies: ['pais'], version: '1.0.0' },
  { catalogKey: 'municipios', displayName: 'Municipios', domain: UCEM_CATALOG_DOMAINS.LOCATION, offlineCapable: true, dependencies: ['departamento'], version: '1.0.0' },
  { catalogKey: 'veredas', displayName: 'Veredas', domain: UCEM_CATALOG_DOMAINS.LOCATION, offlineCapable: true, dependencies: ['municipio'], version: '1.0.0' },
  { catalogKey: 'fincas', displayName: 'Fincas', domain: UCEM_CATALOG_DOMAINS.PRODUCTION, offlineCapable: true, dependencies: ['vereda'], version: '1.0.0' },
  { catalogKey: 'lotes', displayName: 'Lotes', domain: UCEM_CATALOG_DOMAINS.PRODUCTION, offlineCapable: true, dependencies: ['finca'], version: '1.0.0' },
  { catalogKey: 'cultivos', displayName: 'Cultivos', domain: UCEM_CATALOG_DOMAINS.AGRONOMY, offlineCapable: true, version: '1.0.0' },
  { catalogKey: 'productos', displayName: 'Productos / Insumos', domain: UCEM_CATALOG_DOMAINS.AGRONOMY, offlineCapable: true, version: '1.0.0' },
  { catalogKey: 'clientes', displayName: 'Clientes', domain: UCEM_CATALOG_DOMAINS.ENTERPRISE, offlineCapable: false, version: '1.0.0' },
  { catalogKey: 'proveedores', displayName: 'Proveedores', domain: UCEM_CATALOG_DOMAINS.ENTERPRISE, offlineCapable: false, version: '1.0.0' },
];

export const UNIVERSAL_CATALOG_MAP = Object.fromEntries(
  UNIVERSAL_CATALOG_REGISTRY.map((c) => [c.catalogKey, c]),
) as Record<string, UniversalCatalogDefinition>;

export const UCEM_ERP_ENTITIES: Record<string, Array<{ property: string; label: string }>> = {
  Producer: [
    { property: 'name', label: 'Nombre' },
    { property: 'document', label: 'Documento' },
    { property: 'city', label: 'Municipio' },
    { property: 'mainCrop', label: 'Cultivo principal' },
    { property: 'phone', label: 'Teléfono' },
    { property: 'email', label: 'Correo' },
  ],
  Farm: [
    { property: 'name', label: 'Nombre finca' },
    { property: 'area', label: 'Área' },
    { property: 'municipality', label: 'Municipio' },
  ],
  Production: [
    { property: 'quantity', label: 'Cantidad' },
    { property: 'crop', label: 'Cultivo' },
  ],
};
