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
    description:
      'Acceso total. Preferible slug «admin» (o administrador). Incluye crear, editar y desactivar en todos los módulos.',
    matchPermission: () => true,
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '📋',
    color: '#2563eb',
    description: 'Supervisa campo, aprueba formularios y ejecuta procesos.',
    matchPermission: (key) => {
      const [res, act] = splitPerm(key);
      const field = ['producer', 'farm', 'field_lot', 'lot', 'form', 'workflow', 'bpms', 'gis', 'coffee'];
      const acts = [
        'read',
        'create',
        'update',
        'approve',
        'execute',
        'submit',
        'assign',
        'receive',
        'weigh',
        'weigh:manual',
        'quality',
        'quality:decide',
      ];
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
      const [res, act] = splitPerm(key);
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
      const [res, act] = splitPerm(key);
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
      const [, act] = splitPerm(key);
      return act === 'read' || act === 'export' || act === 'audit:read' || act === 'audit';
    },
  },
  {
    id: 'compras',
    name: 'Compras',
    icon: '☕',
    color: '#92400e',
    description:
      'Compras de café completas: recepción, pesaje IoT y manual, calidad, liquidación, catálogos y parametrización.',
    matchPermission: (key) => {
      const [res, act] = splitPerm(key);
      if (res !== 'coffee' && !res.startsWith('coffee')) return false;
      const acts = [
        'read',
        'receive',
        'weigh',
        'weigh:manual',
        'weigh:configure',
        'quality',
        'quality:decide',
        'quality:configure',
        'settle',
        'settle:pay',
        'settle:void',
        'inventory',
        'config:read',
        'config:manage',
        'catalog:manage',
        'audit:read',
        'admin',
      ];
      return acts.includes(act);
    },
  },
  {
    id: 'inventario',
    name: 'Inventario',
    icon: '📦',
    color: '#0f766e',
    description: 'Consulta, crea, edita y desactiva artículos; parámetros y bodegas.',
    matchPermission: (key) => {
      const [res, act] = splitPerm(key);
      if (res === 'inventory' || res === 'eims') {
        return ['read', 'item', 'warehouse', 'catalog', 'config', 'audit', 'admin'].includes(act);
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
      const [, act] = splitPerm(key);
      return act === 'read' || act === 'export' || act === 'config:read' || act === 'audit:read';
    },
  },
];

function splitPerm(key: string): [string, string] {
  const sep = key.indexOf(':');
  if (sep <= 0) return [key, ''];
  return [key.slice(0, sep), key.slice(sep + 1)];
}

export function permissionsForTemplate(
  template: RoleTemplate,
  permissions: Permission[],
): string[] {
  return permissions.filter((p) => template.matchPermission(permKey(p))).map(permKey);
}
