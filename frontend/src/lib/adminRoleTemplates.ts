import type { Permission } from '../types';
import { permKey } from './adminPermissions';

export interface RoleTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  matchPermission: (key: string) => boolean;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'admin',
    name: 'Administrador',
    icon: '👑',
    color: '#b45309',
    description: 'Gestiona usuarios, roles, políticas y toda la operación.',
    matchPermission: () => true,
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '📋',
    color: '#2563eb',
    description: 'Supervisa campo, aprueba formularios y ejecuta procesos.',
    matchPermission: (key) => {
      const [res, act] = key.split(':');
      const field = ['producer', 'farm', 'field_lot', 'lot', 'form', 'workflow', 'bpms', 'gis'];
      const acts = ['read', 'create', 'update', 'approve', 'execute', 'submit', 'assign'];
      return field.some((r) => res === r || res.startsWith(r)) && acts.includes(act);
    },
  },
  {
    id: 'operario',
    name: 'Operario',
    icon: '👷',
    color: '#16a34a',
    description: 'Registra datos de campo y consulta su trabajo asignado.',
    matchPermission: (key) => {
      const [res, act] = key.split(':');
      const field = ['producer', 'farm', 'field_lot', 'lot', 'form'];
      return field.some((r) => res === r || res.startsWith(r)) && ['read', 'create', 'submit'].includes(act);
    },
  },
  {
    id: 'agronomo',
    name: 'Agrónomo',
    icon: '🌾',
    color: '#15803d',
    description: 'Consulta y actualiza información agrícola y técnicos de cultivo.',
    matchPermission: (key) => {
      const [res, act] = key.split(':');
      const ag = ['producer', 'farm', 'field_lot', 'lot', 'gis', 'form', 'analytics', 'dashboard'];
      return ag.some((r) => res === r || res.startsWith(r)) && ['read', 'create', 'update', 'export'].includes(act);
    },
  },
  {
    id: 'auditor',
    name: 'Auditor',
    icon: '🔍',
    color: '#7c3aed',
    description: 'Consulta registros y auditoría sin modificar datos operativos.',
    matchPermission: (key) => {
      const [, act] = key.split(':');
      return act === 'read' || act === 'export';
    },
  },
];

export function permissionsForTemplate(
  template: RoleTemplate,
  permissions: Permission[],
): string[] {
  return permissions.filter((p) => template.matchPermission(permKey(p))).map(permKey);
}
