import {
  UCEM_CATALOG_DOMAINS,
  type UniversalCatalogDefinition,
} from '@agroerp/shared';

/**
 * Universal Catalog Engine — domain registry (extends Capture catalogs with UCEM metadata).
 */
export const UNIVERSAL_CATALOG_REGISTRY: UniversalCatalogDefinition[] = [
  {
    catalogKey: 'paises',
    displayName: 'Países',
    domain: UCEM_CATALOG_DOMAINS.LOCATION,
    offlineCapable: true,
    version: '1.0.0',
  },
  {
    catalogKey: 'departamentos',
    displayName: 'Departamentos',
    domain: UCEM_CATALOG_DOMAINS.LOCATION,
    offlineCapable: true,
    dependencies: ['pais'],
    version: '1.0.0',
  },
  {
    catalogKey: 'municipios',
    displayName: 'Municipios',
    domain: UCEM_CATALOG_DOMAINS.LOCATION,
    offlineCapable: true,
    dependencies: ['departamento'],
    version: '1.0.0',
  },
  {
    catalogKey: 'veredas',
    displayName: 'Veredas',
    domain: UCEM_CATALOG_DOMAINS.LOCATION,
    offlineCapable: true,
    dependencies: ['municipio'],
    version: '1.0.0',
  },
  {
    catalogKey: 'fincas',
    displayName: 'Fincas',
    domain: UCEM_CATALOG_DOMAINS.PRODUCTION,
    offlineCapable: true,
    dependencies: ['vereda'],
    version: '1.0.0',
  },
  {
    catalogKey: 'lotes',
    displayName: 'Lotes',
    domain: UCEM_CATALOG_DOMAINS.PRODUCTION,
    offlineCapable: true,
    dependencies: ['finca'],
    version: '1.0.0',
  },
  {
    catalogKey: 'cultivos',
    displayName: 'Cultivos',
    domain: UCEM_CATALOG_DOMAINS.AGRONOMY,
    offlineCapable: true,
    version: '1.0.0',
  },
  {
    catalogKey: 'productos',
    displayName: 'Productos / Insumos',
    domain: UCEM_CATALOG_DOMAINS.AGRONOMY,
    offlineCapable: true,
    version: '1.0.0',
  },
  {
    catalogKey: 'clientes',
    displayName: 'Clientes',
    domain: UCEM_CATALOG_DOMAINS.ENTERPRISE,
    offlineCapable: false,
    version: '1.0.0',
  },
  {
    catalogKey: 'proveedores',
    displayName: 'Proveedores',
    domain: UCEM_CATALOG_DOMAINS.ENTERPRISE,
    offlineCapable: false,
    version: '1.0.0',
  },
];

export const UNIVERSAL_CATALOG_REGISTRY_MAP = Object.fromEntries(
  UNIVERSAL_CATALOG_REGISTRY.map((c) => [c.catalogKey, c]),
) as Record<string, UniversalCatalogDefinition>;
