export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface UserProfile extends AuthUser {
  status: string;
  organization: Organization;
  lastLoginAt?: string;
}

export interface Resource {
  id: string;
  organizationId: string;
  resourceType: string;
  parentId: string | null;
  status: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  attributes: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function resourceData<T>(resource: Resource): T {
  return resource.data as unknown as T;
}

export interface ProducerData {
  name: string;
  document_id?: string;
  phone?: string;
  email?: string;
  municipality?: string;
  status?: string;
}

export interface FarmData {
  name: string;
  area_ha?: number;
  municipality?: string;
  address?: string;
  crop_type?: string;
}

export interface PurchaseData {
  name?: string;
  weight_kg: number;
  quality_score?: number;
  price_per_kg: number;
  purchase_date: string;
  total?: number;
  notes?: string;
}

export interface InventoryData {
  name: string;
  stock_kg: number;
  warehouse?: string;
  quality_grade?: string;
  purchase_id?: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  rolePermissions: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
      scope: string;
    };
  }>;
  _count?: { userRoles: number };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  description?: string;
}

export interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  lockedAt?: string | null;
  lockedReason?: string | null;
  profile?: Record<string, unknown>;
  userRoles: Array<{ role: { slug: string; name: string } }>;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  oldValues?: unknown;
  newValues?: unknown;
}

export interface DashboardStats {
  producers: number;
  farms: number;
  purchases: number;
  totalKg: number;
  totalValue: number;
  inventoryKg: number;
  documents: number;
}

export const RESOURCE_TYPES = {
  PRODUCER: 'producer',
  FARM: 'farm',
  PURCHASE: 'coffee_purchase',
  INVENTORY: 'inventory_lot',
  FILE: 'file',
} as const;
