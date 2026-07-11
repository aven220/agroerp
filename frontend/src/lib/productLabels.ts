/**
 * PM-25 — Etiquetas de estado y acciones de negocio (sin jerga técnica).
 */

const TICKET_STATUS_LABELS: Record<string, string> = {
  pending_review: 'En revisión',
  arrived: 'Recibido',
  queued: 'En espera',
  receiving: 'En recepción',
  identity_validated: 'Identidad confirmada',
  weighed: 'Pesado',
  quality_pending: 'Pendiente de calidad',
  quality_approved: 'Aprobado en calidad',
  quality_rejected: 'Rechazado en calidad',
  settled: 'Liquidado',
  inventory_posted: 'En inventario',
  cancelled: 'Anulado',
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completado',
  blocked: 'Bloqueado',
  draft: 'Borrador',
  active: 'Activo',
  inactive: 'Inactivo',
};

export function labelTicketStatus(status: string | undefined | null): string {
  if (!status) return 'Sin estado';
  return TICKET_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function nextActionForTicket(status: string | undefined | null): { label: string; to: string } | null {
  switch (status) {
    case 'arrived':
    case 'queued':
    case 'identity_validated':
      return { label: 'Ir a pesaje', to: '/compras/pesaje' };
    case 'receiving':
    case 'weighed':
    case 'quality_pending':
      return { label: 'Ir a calidad', to: '/compras/calidad' };
    case 'quality_approved':
      return { label: 'Ir a liquidación', to: '/compras/liquidaciones' };
    case 'settled':
      return { label: 'Ver inventario', to: '/compras/inventario' };
    default:
      return null;
  }
}
