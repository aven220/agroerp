import type { ResolutionAlternative } from '../domain/entity-resolution.types';

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function pickString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function toAlternatives(
  matches: Array<{
    entityId: string;
    entityType: string;
    confidence: number;
    matchedBy: string;
    matchedValue: string;
  }>,
): ResolutionAlternative[] {
  return matches.map((match) => ({
    entityId: match.entityId,
    entityType: match.entityType,
    confidence: match.confidence,
    matchedBy: match.matchedBy,
    matchedValue: match.matchedValue,
  }));
}
