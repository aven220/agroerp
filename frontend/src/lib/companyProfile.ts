/**
 * PM-34 — Perfil empresarial de la organización.
 * Persistencia vía API existente de parámetros café (sin endpoints nuevos).
 */

import { listCoffeeParameters, upsertCoffeeParameter } from '../api/coffee';

export const COMPANY_PARAM_KEY = 'implementation.company';

export interface CompanyProfile {
  legalName: string;
  taxId: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  email: string;
  /** URL opcional; carga de archivo no disponible sin API de media. */
  logoUrl: string;
  currency: string;
  timezone: string;
  language: string;
}

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  legalName: '',
  taxId: '',
  address: '',
  city: '',
  department: '',
  country: 'Colombia',
  phone: '',
  email: '',
  logoUrl: '',
  currency: 'COP',
  timezone: 'America/Bogota',
  language: 'es-CO',
};

/** Campos requeridos para marcar Empresa como completa (FASE 5). */
export function companyRequiredComplete(p: CompanyProfile | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    p.legalName.trim() &&
      p.taxId.trim() &&
      p.currency.trim() &&
      p.timezone.trim(),
  );
}

export function companyMissingFields(p: CompanyProfile | null | undefined): string[] {
  const missing: string[] = [];
  if (!p?.legalName.trim()) missing.push('Razón social');
  if (!p?.taxId.trim()) missing.push('NIT');
  if (!p?.currency.trim()) missing.push('Moneda');
  if (!p?.timezone.trim()) missing.push('Zona horaria');
  return missing;
}

function parseProfile(value: unknown): CompanyProfile | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return {
    legalName: String(v.legalName ?? ''),
    taxId: String(v.taxId ?? ''),
    address: String(v.address ?? ''),
    city: String(v.city ?? ''),
    department: String(v.department ?? ''),
    country: String(v.country ?? 'Colombia'),
    phone: String(v.phone ?? ''),
    email: String(v.email ?? ''),
    logoUrl: String(v.logoUrl ?? ''),
    currency: String(v.currency ?? 'COP'),
    timezone: String(v.timezone ?? 'America/Bogota'),
    language: String(v.language ?? 'es-CO'),
  };
}

export async function loadCompanyProfile(): Promise<CompanyProfile> {
  try {
    const rows = await listCoffeeParameters(COMPANY_PARAM_KEY);
    const row = Array.isArray(rows) ? (rows[0] as { value?: unknown } | undefined) : undefined;
    return parseProfile(row?.value) ?? { ...EMPTY_COMPANY_PROFILE };
  } catch {
    return { ...EMPTY_COMPANY_PROFILE };
  }
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  await upsertCoffeeParameter({
    parameterKey: COMPANY_PARAM_KEY,
    name: 'Perfil empresarial',
    scopeType: 'organization',
    value: { ...profile },
    dataType: 'json',
    reason: 'Actualización ficha de empresa (implementación)',
  });
}

/** Roles mínimos del paquete cooperativa (nombre o slug). */
export const REQUIRED_COOP_ROLES: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: 'admin', label: 'Administrador', pattern: /admin|administrador/i },
  { key: 'compras', label: 'Compras', pattern: /compra|coffee|caf[eé]/i },
  { key: 'inventario', label: 'Inventario', pattern: /inventario|inventory/i },
  { key: 'calidad', label: 'Calidad', pattern: /calidad|quality/i },
  { key: 'supervisor', label: 'Supervisor', pattern: /supervisor|manager|gerencia/i },
  { key: 'consulta', label: 'Consulta', pattern: /consulta|viewer|lectura|read.?only/i },
];

export function matchRequiredRoles(
  roles: Array<{ name: string; slug: string }>,
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of REQUIRED_COOP_ROLES) {
    const hit = roles.some((r) => req.pattern.test(r.name) || req.pattern.test(r.slug));
    if (hit) matched.push(req.label);
    else missing.push(req.label);
  }
  return { matched, missing };
}
