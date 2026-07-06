export type CatalogOption = { value: string; label: string; parent?: string };

export type DynamicCatalog = {
  key: string;
  label: string;
  dependsOn?: string;
  options: CatalogOption[];
};

export const DYNAMIC_CATALOGS: Record<string, DynamicCatalog> = {
  paises: {
    key: 'paises',
    label: 'Países',
    options: [
      { value: 'co', label: 'Colombia' },
      { value: 'pe', label: 'Perú' },
      { value: 'ec', label: 'Ecuador' },
    ],
  },
  departamentos: {
    key: 'departamentos',
    label: 'Departamentos',
    dependsOn: 'pais',
    options: [
      { value: 'ant', label: 'Antioquia', parent: 'co' },
      { value: 'cun', label: 'Cundinamarca', parent: 'co' },
      { value: 'val', label: 'Valle del Cauca', parent: 'co' },
      { value: 'lim', label: 'Lima', parent: 'pe' },
      { value: 'pic', label: 'Pichincha', parent: 'ec' },
    ],
  },
  municipios: {
    key: 'municipios',
    label: 'Municipios',
    dependsOn: 'departamento',
    options: [
      { value: 'med', label: 'Medellín', parent: 'ant' },
      { value: 'rion', label: 'Rionegro', parent: 'ant' },
      { value: 'bog', label: 'Bogotá', parent: 'cun' },
      { value: 'cali', label: 'Cali', parent: 'val' },
      { value: 'lima', label: 'Lima', parent: 'lim' },
      { value: 'quito', label: 'Quito', parent: 'pic' },
    ],
  },
  veredas: {
    key: 'veredas',
    label: 'Veredas',
    dependsOn: 'municipio',
    options: [
      { value: 'v1', label: 'La Esperanza', parent: 'med' },
      { value: 'v2', label: 'El Porvenir', parent: 'med' },
      { value: 'v3', label: 'San José', parent: 'rion' },
      { value: 'v4', label: 'Subachoque', parent: 'bog' },
    ],
  },
  fincas: {
    key: 'fincas',
    label: 'Fincas',
    dependsOn: 'vereda',
    options: [
      { value: 'f1', label: 'Finca El Roble', parent: 'v1' },
      { value: 'f2', label: 'Finca La Palma', parent: 'v2' },
      { value: 'f3', label: 'Finca Los Naranjos', parent: 'v3' },
    ],
  },
  lotes: {
    key: 'lotes',
    label: 'Lotes',
    dependsOn: 'finca',
    options: [
      { value: 'l1', label: 'Lote A — 2.5 ha', parent: 'f1' },
      { value: 'l2', label: 'Lote B — 1.8 ha', parent: 'f1' },
      { value: 'l3', label: 'Lote Norte', parent: 'f2' },
    ],
  },
  cultivos: {
    key: 'cultivos',
    label: 'Cultivos',
    options: [
      { value: 'cafe', label: 'Café' },
      { value: 'cacao', label: 'Cacao' },
      { value: 'platano', label: 'Plátano' },
      { value: 'maiz', label: 'Maíz' },
      { value: 'aguacate', label: 'Aguacate' },
    ],
  },
  productos: {
    key: 'productos',
    label: 'Productos',
    options: [
      { value: 'urea', label: 'Urea 46%' },
      { value: 'cobre', label: 'Oxicloruro de cobre' },
      { value: 'glifosato', label: 'Glifosato' },
      { value: 'abamectina', label: 'Abamectina' },
      { value: 'semilla_maiz', label: 'Semilla de maíz híbrido' },
    ],
  },
  clientes: {
    key: 'clientes',
    label: 'Clientes',
    options: [
      { value: 'cli1', label: 'Café del Norte S.A.S.' },
      { value: 'cli2', label: 'Exportadora Andina' },
      { value: 'cli3', label: 'Cooperativa Agrícola' },
    ],
  },
  proveedores: {
    key: 'proveedores',
    label: 'Proveedores',
    options: [
      { value: 'prov1', label: 'Agroinsumos del Valle' },
      { value: 'prov2', label: 'Maquinaria Técnica Ltda.' },
      { value: 'prov3', label: 'Fertilizantes Andinos' },
    ],
  },
};

export const CATALOG_CHAIN = ['pais', 'departamento', 'municipio', 'vereda', 'finca', 'lote'] as const;

export function resolveCatalogOptions(
  catalogKey: string,
  data: Record<string, unknown>,
): { value: string; label: string }[] {
  const catalog = DYNAMIC_CATALOGS[catalogKey];
  if (!catalog) return [];
  if (!catalog.dependsOn) {
    return catalog.options.map(({ value, label }) => ({ value, label }));
  }
  const parent = data[catalog.dependsOn];
  if (!parent) return [];
  return catalog.options
    .filter((o) => o.parent === parent)
    .map(({ value, label }) => ({ value, label }));
}

export function catalogFieldDefaults(catalogKey: string, label: string, key: string) {
  const catalog = DYNAMIC_CATALOGS[catalogKey];
  return {
    key,
    type: 'select' as const,
    label: label || catalog?.label || key,
    options: catalog && !catalog.dependsOn
      ? catalog.options.map(({ value, label: l }) => ({ value, label: l }))
      : [],
    metadata: { catalogKey, dynamicList: true },
  };
}

/** Campos en cadena geográfica Departamento → Municipio → Vereda → Finca → Lote */
export function buildGeoCascadeFields(prefix = ''): import('../api/forms').FormFieldDefinition[] {
  const p = prefix ? `${prefix}_` : '';
  return [
    catalogFieldDefaults('paises', 'País', `${p}pais`),
    catalogFieldDefaults('departamentos', 'Departamento', `${p}departamento`),
    catalogFieldDefaults('municipios', 'Municipio', `${p}municipio`),
    catalogFieldDefaults('veredas', 'Vereda', `${p}vereda`),
    catalogFieldDefaults('fincas', 'Finca', `${p}finca`),
    catalogFieldDefaults('lotes', 'Lote', `${p}lote`),
  ].map((f, i) => ({
    ...f,
    visibleWhen: i === 0 ? undefined : { field: i === 1 ? `${p}pais` : `${p}${CATALOG_CHAIN[i - 1]}`, operator: 'not_empty' },
  }));
}
