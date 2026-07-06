import { EamAssetStatus } from '@prisma/client';

export function generateEamKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

const LIFECYCLE_TRANSITIONS: Record<EamAssetStatus, EamAssetStatus[]> = {
  draft: ['registered', 'disposed'],
  registered: ['installed', 'operational', 'on_loan', 'in_transfer', 'sold', 'retired', 'disposed'],
  installed: ['commissioned', 'operational', 'in_transfer', 'retired'],
  commissioned: ['operational', 'in_transfer', 'on_loan', 'retired'],
  operational: ['on_loan', 'in_transfer', 'sold', 'retired', 'disposed'],
  on_loan: ['operational', 'in_transfer'],
  in_transfer: ['operational', 'installed'],
  sold: [],
  retired: ['disposed'],
  disposed: [],
};

export function canTransitionStatus(from: EamAssetStatus, to: EamAssetStatus): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function remainingUsefulLifeMonths(
  commissionedAt: Date | null | undefined,
  usefulLifeMonths: number,
  asOf: Date = new Date(),
): number {
  if (!commissionedAt) return usefulLifeMonths;
  const elapsed =
    (asOf.getFullYear() - commissionedAt.getFullYear()) * 12 +
    (asOf.getMonth() - commissionedAt.getMonth());
  return Math.max(0, usefulLifeMonths - elapsed);
}

export function isWarrantyExpiringSoon(
  warrantyExpiresAt: Date | null | undefined,
  daysAhead = 30,
  asOf: Date = new Date(),
): boolean {
  if (!warrantyExpiresAt) return false;
  const limit = new Date(asOf);
  limit.setDate(limit.getDate() + daysAhead);
  return warrantyExpiresAt <= limit && warrantyExpiresAt >= asOf;
}

export type EamIndicatorInput = {
  totalAssets: number;
  totalValue: number;
  operationalCount: number;
  byLocation: Record<string, number>;
  byResponsible: Record<string, number>;
  byArea: Record<string, number>;
  expiringWarranties: number;
  avgRemainingLifeMonths: number;
};

export function aggregateEamIndicators(input: EamIndicatorInput) {
  const operationalPct = input.totalAssets > 0
    ? Math.round((input.operationalCount / input.totalAssets) * 10000) / 100
    : 0;
  return {
    totalAssets: input.totalAssets,
    totalValue: input.totalValue,
    operationalCount: input.operationalCount,
    operationalPct,
    byLocation: input.byLocation,
    byResponsible: input.byResponsible,
    byArea: input.byArea,
    expiringWarranties: input.expiringWarranties,
    avgRemainingLifeMonths: Math.round(input.avgRemainingLifeMonths * 100) / 100,
  };
}

export function buildLocationTree<T extends { locationKey: string; parentKey: string | null; name: string; locationType: string }>(
  locations: T[],
): Array<T & { children: T[] }> {
  const map = new Map<string, T & { children: T[] }>();
  for (const loc of locations) map.set(loc.locationKey, { ...loc, children: [] });
  const roots: Array<T & { children: T[] }> = [];
  for (const node of map.values()) {
    if (node.parentKey && map.has(node.parentKey)) {
      map.get(node.parentKey)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
