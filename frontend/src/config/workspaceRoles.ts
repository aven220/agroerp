/**
 * PM-42 — Roles de Enterprise Workspace (frontend only).
 */

export type WorkspaceRole =
  | 'admin'
  | 'purchasing'
  | 'quality'
  | 'inventory'
  | 'executive'
  | 'consulta'
  | 'supervisor'
  | 'field';

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Administración',
  purchasing: 'Compras',
  quality: 'Calidad',
  inventory: 'Inventario',
  executive: 'Gerencia',
  consulta: 'Consulta',
  supervisor: 'Supervisión',
  field: 'Campo',
};

export function resolveWorkspaceRole(roles: string[]): WorkspaceRole {
  const r = roles.map((x) => x.toLowerCase());
  if (r.some((x) => x.includes('admin'))) return 'admin';
  if (r.some((x) => x.includes('consulta') || x.includes('viewer') || x.includes('lectura') || x.includes('readonly') || x.includes('read-only'))) {
    return 'consulta';
  }
  if (r.some((x) => x.includes('supervisor'))) return 'supervisor';
  if (r.some((x) => x.includes('quality') || x.includes('calidad') || x.includes('qms'))) return 'quality';
  if (r.some((x) => x.includes('gerencia') || x.includes('executive') || x.includes('manager'))) {
    return 'executive';
  }
  if (r.some((x) => x.includes('compr') || x.includes('purchase') || x.includes('coffee') || x.includes('caf'))) {
    return 'purchasing';
  }
  if (r.some((x) => x.includes('invent') || x.includes('bodega') || x.includes('warehouse'))) {
    return 'inventory';
  }
  if (r.some((x) => x.includes('campo') || x.includes('agri') || x.includes('field') || x.includes('farm'))) {
    return 'field';
  }
  return 'purchasing';
}
