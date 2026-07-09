import type { FormDefinition } from '../api/forms';

export const FORM_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  published: 'Publicado',
  deprecated: 'Obsoleto',
  archived: 'Archivado',
};

export const FORM_LIFECYCLE_STEPS = [
  { id: 'template', label: 'Plantilla', hint: 'Elija una base reutilizable' },
  { id: 'draft', label: 'Borrador', hint: 'Edite y guarde sin publicar' },
  { id: 'preview', label: 'Vista previa', hint: 'Valide reglas y experiencia' },
  { id: 'published', label: 'Publicado', hint: 'Listo para uso operativo' },
  { id: 'sync', label: 'Sincronización móvil', hint: 'Disponible en dispositivos de campo tras la próxima descarga' },
  { id: 'archived', label: 'Archivado', hint: 'Retirado del catálogo activo' },
] as const;

export type FormLifecycleStepId = (typeof FORM_LIFECYCLE_STEPS)[number]['id'];

export function getActiveLifecycleStep(status: string): FormLifecycleStepId {
  switch (status) {
    case 'in_review':
    case 'approved':
    case 'rejected':
      return 'preview';
    case 'published':
    case 'deprecated':
      return 'sync';
    case 'archived':
      return 'archived';
    case 'draft':
    default:
      return 'draft';
  }
}

export function getLifecycleStepIndex(stepId: FormLifecycleStepId): number {
  return FORM_LIFECYCLE_STEPS.findIndex((s) => s.id === stepId);
}

export type AndroidAvailability =
  | 'ready'
  | 'requires-publish'
  | 'web-only'
  | 'deprecated'
  | 'archived';

export type WebAvailability = 'execute' | 'design-only' | 'unavailable';

export function getAndroidAvailability(form: FormDefinition): AndroidAvailability {
  if (form.status === 'archived') return 'archived';
  if (form.status === 'deprecated') return 'deprecated';
  if (form.status !== 'published') return 'requires-publish';
  if (form.schema?.settings?.offlineCapable === false) return 'web-only';
  return 'ready';
}

export function getWebAvailability(form: FormDefinition): WebAvailability {
  if (form.status === 'archived') return 'unavailable';
  if (form.status === 'published') return 'execute';
  return 'design-only';
}

export const ANDROID_AVAILABILITY_LABELS: Record<AndroidAvailability, string> = {
  ready: 'Listo para Android',
  'requires-publish': 'Requiere publicar',
  'web-only': 'Solo Web',
  deprecated: 'Versión obsoleta',
  archived: 'Archivado',
};

export const WEB_AVAILABILITY_LABELS: Record<WebAvailability, string> = {
  execute: 'Ejecutable en Web',
  'design-only': 'Solo diseño / vista previa',
  unavailable: 'No disponible',
};

export function groupLatestVersions(forms: FormDefinition[]): FormDefinition[] {
  const map = new Map<string, FormDefinition>();
  for (const form of forms) {
    const existing = map.get(form.formKey);
    if (!existing || form.version > existing.version) {
      map.set(form.formKey, form);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.formKey.localeCompare(b.formKey));
}

export function formatFormDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatModifiedBy(
  createdBy: string | null | undefined,
  currentUserId?: string,
  currentUserName?: string,
): string {
  if (!createdBy) return '—';
  if (currentUserId && createdBy === currentUserId && currentUserName) {
    return currentUserName;
  }
  return `${createdBy.slice(0, 8)}…`;
}

export function getNextLifecycleHint(status: string): string {
  switch (status) {
    case 'draft':
    case 'rejected':
      return 'Revise en vista previa y publique cuando esté listo. Los borradores no se sincronizan con Android.';
    case 'in_review':
      return 'En revisión. Apruebe o rechace antes de publicar.';
    case 'approved':
      return 'Aprobado. Puede publicar para habilitar Web y sincronización móvil.';
    case 'published':
      return 'Publicado. Los dispositivos Android lo descargarán en el próximo sync (login o sincronización manual).';
    case 'deprecated':
      return 'Versión reemplazada por una publicación más reciente de la misma clave.';
    case 'archived':
      return 'Archivado. Restaure para volver a editar o publicar.';
    default:
      return '';
  }
}
