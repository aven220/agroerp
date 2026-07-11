/** Etiquetas en español para usuarios finales — oculta jerga técnica del backend */

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  producer: 'Productor',
  farm: 'Finca',
  lot: 'Lote',
  field_lot: 'Lote',
  form: 'Formulario',
  workflow: 'Proceso',
  purchase: 'Compra',
  ticket: 'Compra',
  settlement: 'Liquidación',
  inventory: 'Inventario',
  document: 'Documento',
  user: 'Usuario',
  person: 'Persona',
};

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  escalated: 'Escalada',
  cancelled: 'Cancelada',
};

export const WORKFLOW_TRANSITION_LABELS: Record<string, string> = {
  APPROVE: 'Aprobar',
  REJECT: 'Rechazar',
  COMPLETE: 'Completar',
  SEND_REVIEW: 'Enviar a revisión',
  SUBMIT: 'Enviar',
  CANCEL: 'Cancelar',
  START: 'Iniciar',
  RESUME: 'Reanudar',
  SUSPEND: 'Suspender',
};

export const PROCESSING_TYPE_LABELS: Record<string, string> = {
  PRODUCER_CREATE: 'Registrar productor',
  PRODUCER_UPDATE: 'Actualizar productor',
  FARM_CREATE: 'Registrar finca',
  FARM_UPDATE: 'Actualizar finca',
  LOT_CREATE: 'Registrar lote',
  LOT_UPDATE: 'Actualizar lote',
  CREATE_ENTITY: 'Crear registro',
  UPDATE_ENTITY: 'Actualizar registro',
  SKIP: 'Solo guardar envío',
};

export const FIELD_LABELS: Record<string, string> = {
  producerNumber: 'Código de productor',
  legalName: 'Nombre legal',
  commercialName: 'Nombre comercial',
  firstName: 'Nombres',
  lastName: 'Apellidos',
  documentTypeCode: 'Tipo de documento',
  documentNumber: 'Número de documento',
  taxId: 'NIT / RUT',
  lifecycleStatus: 'Estado',
  municipalityCode: 'Municipio',
  veredaCode: 'Vereda',
  categoryCode: 'Categoría',
  producerTypeCode: 'Tipo de productor',
  qualityScore: 'Índice de calidad',
  lastActivityAt: 'Última actividad',
  activatedAt: 'Fecha de activación',
  farmCode: 'Código de finca',
  farmName: 'Nombre de finca',
  farmTypeCode: 'Tipo de finca',
  totalAreaHa: 'Área total (ha)',
  agriculturalAreaHa: 'Área agrícola (ha)',
  centroidLatitude: 'Latitud',
  centroidLongitude: 'Longitud',
  lotCode: 'Código de lote',
  lotName: 'Nombre de lote',
  lotTypeCode: 'Tipo de lote',
  plantedAreaHa: 'Área sembrada (ha)',
  primaryCropCode: 'Cultivo principal',
  status: 'Estado',
  externalId: 'Identificador externo',
  syncStatus: 'Estado de sincronización',
  createdBy: 'Creado por',
  updatedBy: 'Actualizado por',
  version: 'Versión',
  notes: 'Notas',
  tags: 'Etiquetas',
  formKey: 'Clave del formulario',
  formVersion: 'Versión del formulario',
};

export const SYNC_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de sincronizar',
  synced: 'Sincronizado',
  failed: 'Error de sincronización',
};

export function labelEntityType(type: string): string {
  return ENTITY_TYPE_LABELS[type.toLowerCase()] ?? type;
}

export function labelField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/Code$/, '')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function labelWorkflowStatus(status: string): string {
  return WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function labelWorkflowTransition(key: string): string {
  return (
    WORKFLOW_TRANSITION_LABELS[key] ??
    key
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function labelProcessingType(type: string): string {
  return PROCESSING_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

export function labelSyncStatus(status: string): string {
  return SYNC_STATUS_LABELS[status] ?? status;
}
