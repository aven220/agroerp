/** Etiquetas amigables — ocultan términos técnicos al usuario funcional */

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  number: 'Número',
  currency: 'Moneda',
  percent: 'Porcentaje',
  date: 'Fecha',
  datetime: 'Fecha y hora',
  time: 'Hora',
  select: 'Lista desplegable',
  multiselect: 'Selección múltiple',
  radio: 'Opción única',
  checkbox: 'Casilla',
  toggle: 'Interruptor',
  signature: 'Firma',
  photo: 'Foto',
  file: 'Archivo',
  gps: 'Ubicación GPS',
  barcode: 'Código de barras',
  qrcode: 'Código QR',
  section: 'Sección',
  divider: 'Separador',
  label: 'Etiqueta',
  button: 'Botón',
  matrix: 'Matriz',
  repeat: 'Grupo repetible',
  catalog: 'Catálogo',
  dynamic_list: 'Lista dinámica',
  computed: 'Calculado',
  hidden: 'Oculto',
};

export const GROUP_DISPLAY_LABELS: Record<string, string> = {
  'Texto y datos': 'Texto y entradas',
  Selección: 'Selección',
  'Fecha y hora': 'Fecha',
  Multimedia: 'Multimedia',
  Ubicación: 'Ubicación',
  Códigos: 'Códigos y escaneo',
  Layout: 'Diseño',
  Avanzado: 'Lógica y avanzado',
};

export const PROCESSING_TYPE_LABELS: Record<string, string> = {
  '': 'Solo guardar respuestas',
  PRODUCER_CREATE: 'Crear productor',
  FARM_CREATE: 'Crear finca',
  PRODUCTION_CREATE: 'Registrar producción',
  LOT_UPDATE: 'Actualizar lote',
};

export const ENTITY_LABELS: Record<string, string> = {
  Producer: 'Productor',
  Farm: 'Finca',
  Production: 'Producción',
  Lot: 'Lote',
  FieldLot: 'Lote de campo',
};

export const PROVIDER_LABELS: Record<string, string> = {
  MANUAL: 'Entrada manual',
  STATIC_LIST: 'Lista fija',
  ERP_CATALOG: 'Catálogo del sistema',
  ERP_ENTITY: 'Registro del sistema',
  DEPENDENT: 'Depende de otro campo',
  FORM_RESULT: 'Resultado del formulario',
  EXTERNAL_API: 'Servicio externo',
};

export const LAYOUT_MODE_LABELS: Record<string, string> = {
  flat: 'Continuo',
  tabs: 'Pestañas',
  accordion: 'Acordeón',
};

export function labelFieldType(type: string): string {
  return FIELD_TYPE_LABELS[type] ?? type;
}

export function labelProcessingType(code: string | undefined | null): string {
  if (!code) return PROCESSING_TYPE_LABELS[''];
  return PROCESSING_TYPE_LABELS[code] ?? 'Acción personalizada';
}

export function labelEntity(entity: string | undefined | null): string {
  if (!entity) return '—';
  return ENTITY_LABELS[entity] ?? entity;
}
