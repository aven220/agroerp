import { apiRequest } from './client';
import type { Permission, Role, SystemUser } from '../types';

export function listRoles() {
  return apiRequest<Role[]>('/identity/roles');
}

export function createRole(payload: {
  name: string;
  slug: string;
  description?: string;
  permissionKeys?: string[];
}) {
  return apiRequest<Role>('/identity/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRole(
  id: string,
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    permissionKeys?: string[];
  },
) {
  return apiRequest<Role>(`/identity/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listPermissions() {
  return apiRequest<Permission[]>('/identity/permissions');
}

export function listUsers() {
  return apiRequest<SystemUser[]>('/users');
}

export function createUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleSlugs?: string[];
  documentNumber?: string;
}) {
  return apiRequest<SystemUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  id: string,
  payload: {
    firstName?: string;
    lastName?: string;
    status?: 'active' | 'inactive' | 'locked' | 'pending' | 'expired';
    roleSlugs?: string[];
    documentNumber?: string;
    password?: string;
  },
) {
  return apiRequest<SystemUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return apiRequest<{ success: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export function ensureDomainSchemas() {
  const schemas = [
    {
      resourceType: 'producer',
      label: 'Productor',
      fields: [
        { key: 'name', type: 'string', label: 'Nombre', required: true },
        { key: 'document_id', type: 'string', label: 'Documento' },
        { key: 'phone', type: 'string', label: 'Teléfono' },
        { key: 'email', type: 'string', label: 'Email' },
        { key: 'municipality', type: 'string', label: 'Municipio' },
      ],
      states: ['active', 'inactive'],
    },
    {
      resourceType: 'farm',
      label: 'Finca',
      fields: [
        { key: 'name', type: 'string', label: 'Nombre', required: true },
        { key: 'area_ha', type: 'number', label: 'Área (ha)' },
        { key: 'municipality', type: 'string', label: 'Municipio' },
        { key: 'crop_type', type: 'string', label: 'Cultivo' },
      ],
      states: ['active'],
    },
    {
      resourceType: 'coffee_purchase',
      label: 'Compra de café',
      fields: [
        { key: 'weight_kg', type: 'number', label: 'Peso (kg)', required: true },
        { key: 'price_per_kg', type: 'number', label: 'Precio/kg', required: true },
        { key: 'quality_score', type: 'number', label: 'Calidad' },
        { key: 'purchase_date', type: 'string', label: 'Fecha' },
      ],
      states: ['active'],
    },
    {
      resourceType: 'inventory_lot',
      label: 'Lote inventario',
      fields: [
        { key: 'name', type: 'string', label: 'Nombre', required: true },
        { key: 'stock_kg', type: 'number', label: 'Stock (kg)', required: true },
        { key: 'warehouse', type: 'string', label: 'Bodega' },
      ],
      states: ['active'],
    },
  ];

  return Promise.allSettled(
    schemas.map((s) =>
      apiRequest('/metadata/schemas', {
        method: 'POST',
        body: JSON.stringify(s),
      }),
    ),
  );
}
