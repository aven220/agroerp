import type { AuditLog } from '../types';

const ACTION_LABELS: Record<string, string> = {
  create: 'creó',
  created: 'creó',
  update: 'actualizó',
  updated: 'actualizó',
  delete: 'eliminó',
  deleted: 'eliminó',
  publish: 'publicó',
  published: 'publicó',
  approve: 'aprobó',
  approved: 'aprobó',
  reject: 'rechazó',
  rejected: 'rechazó',
  submit: 'envió',
  submitted: 'envió',
  login: 'inició sesión',
  logout: 'cerró sesión',
  assign: 'asignó',
  assigned: 'asignó',
  complete: 'completó',
  completed: 'completó',
  start: 'inició',
  started: 'inició',
  cancel: 'canceló',
  cancelled: 'canceló',
  archive: 'archivó',
  archived: 'archivó',
  restore: 'restauró',
  restored: 'restauró',
  export: 'exportó',
  imported: 'importó',
  import: 'importó',
};

const ENTITY_LABELS: Record<string, string> = {
  producer: 'un productor',
  farm: 'una finca',
  lot: 'un lote',
  form: 'un formulario',
  form_definition: 'un formulario',
  form_submission: 'una captura',
  workflow: 'un proceso',
  workflow_instance: 'una solicitud',
  user: 'un usuario',
  role: 'un rol',
  purchase: 'una compra',
  coffee_purchase: 'una compra de café',
  inventory: 'un artículo de inventario',
  document: 'un documento',
  organization: 'la organización',
  permission: 'un permiso',
  campaign: 'una campaña',
  assignment: 'una asignación',
};

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function resolveActionVerb(action: string): string {
  const key = normalizeKey(action);
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  const tail = key.split('_').pop() ?? key;
  if (tail && ACTION_LABELS[tail]) return ACTION_LABELS[tail];
  return 'registró actividad en';
}

function resolveEntityLabel(entityType: string): string {
  const key = normalizeKey(entityType);
  if (ENTITY_LABELS[key]) return ENTITY_LABELS[key];
  const words = key.replace(/_/g, ' ');
  return `un registro de ${words}`;
}

function extractActorName(log: AuditLog): string | null {
  const meta = log.newValues as Record<string, unknown> | undefined;
  if (meta?.actorName && typeof meta.actorName === 'string') return meta.actorName;
  if (meta?.userName && typeof meta.userName === 'string') return meta.userName;
  return null;
}

function extractEntityName(log: AuditLog): string | null {
  const meta = log.newValues as Record<string, unknown> | undefined;
  const candidates = ['name', 'title', 'label', 'formName', 'producerName'];
  for (const key of candidates) {
    const val = meta?.[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

/** Convierte un registro de auditoría en lenguaje de negocio legible */
export function formatActivityMessage(log: AuditLog, fallbackActor = 'Un usuario'): string {
  const actor = extractActorName(log) ?? fallbackActor;
  const verb = resolveActionVerb(log.action);
  const entity = resolveEntityLabel(log.entityType);
  const name = extractEntityName(log);

  if (name) {
    return `${actor} ${verb} ${entity}: ${name}`;
  }
  return `${actor} ${verb} ${entity}`;
}
