/** Maps validated form submission data into ERP DTO field shapes */

export function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

export function pickString(
  data: Record<string, unknown>,
  keys: string[],
  fallback = '',
): string {
  for (const key of keys) {
    const value = data[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

export function pickNumber(
  data: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

export function pickGps(
  data: Record<string, unknown>,
  submissionGps?: unknown,
): { lat?: number; lng?: number } {
  const gps = (submissionGps ?? data.gpsLocation ?? data.gps) as
    | { lat?: number; lng?: number }
    | undefined;
  return {
    lat: gps?.lat,
    lng: gps?.lng,
  };
}
