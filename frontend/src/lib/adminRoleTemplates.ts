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
  {
    id: 'compras',
    name: 'Compras',
    icon: '☕',
    color: '#92400e',
    description:
      'Acceso al módulo Compras de café: consulta, recepción, pesaje, calidad y liquidación. Incluye coffee:read (obligatorio para entrar).',
    matchPermission: (key) => {
      const [res, act] = key.split(':');
      if (res !== 'coffee' && !res.startsWith('coffee')) return false;
      const acts = [
        'read',
        'receive',
        'weigh',
        'weigh:manual',
        'quality',
        'quality:decide',
        'settle',
        'inventory',
        'config:read',
        'audit:read',
      ];
      return acts.includes(act);
    },
  },
  {
    id: 'inventario',
    name: 'Inventario',
    icon: '📦',
    color: '#0f766e',
    description: 'Consulta y operación de inventario general y de café.',
    matchPermission: (key) => {
      const [res, act] = key.split(':');
      if (res === 'inventory' || res === 'eims') {
        return ['read', 'item', 'warehouse', 'catalog', 'config', 'audit'].includes(act);
      }
      if (res === 'coffee') return act === 'read' || act === 'inventory';
      return false;
    },
  },
  {
    id: 'consulta',
    name: 'Consulta',
    icon: '👁',
    color: '#64748b',
    description: 'Solo lectura en operación: puede ver, no crear ni editar.',
    matchPermission: (key) => {
      const [, act] = key.split(':');
      return act === 'read' || act === 'export' || act === 'config:read' || act === 'audit:read';
    },
  },
];

export function permissionsForTemplate(
  template: RoleTemplate,
  permissions: Permission[],
): string[] {
  return permissions.filter((p) => template.matchPermission(permKey(p))).map(permKey);
}
