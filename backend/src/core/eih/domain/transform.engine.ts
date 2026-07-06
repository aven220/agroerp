import { EihDataFormat } from '@agroerp/shared';

export function detectFormat(payload: unknown): EihDataFormat {
  if (payload == null) return 'plain_text';
  if (typeof payload === 'object') return 'json';
  const text = String(payload).trim();
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  if (text.startsWith('<')) return 'xml';
  if (text.includes(',') && text.includes('\n')) return 'csv';
  if (text.startsWith('{"type":"Feature')) return 'geojson';
  return 'plain_text';
}

export function transformData(
  input: unknown,
  inputFormat: EihDataFormat,
  outputFormat: EihDataFormat,
): unknown {
  let parsed: unknown = input;
  if (inputFormat === 'json' && typeof input === 'string') {
    parsed = JSON.parse(input);
  }
  if (inputFormat === 'xml' && typeof input === 'string') {
    parsed = { _xml: input };
  }
  if (inputFormat === 'csv' && typeof input === 'string') {
    const lines = input.trim().split('\n');
    const headers = lines[0]?.split(',') ?? [];
    parsed = lines.slice(1).map((line) => {
      const vals = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim()]));
    });
  }
  if (outputFormat === 'json') return parsed;
  if (outputFormat === 'xml') return `<root>${JSON.stringify(parsed)}</root>`;
  if (outputFormat === 'csv' && Array.isArray(parsed)) {
    const rows = parsed as Record<string, unknown>[];
    if (!rows.length) return '';
    const keys = Object.keys(rows[0]);
    return [keys.join(','), ...rows.map((r) => keys.map((k) => String(r[k] ?? '')).join(','))].join('\n');
  }
  if (outputFormat === 'plain_text') return String(parsed);
  if (outputFormat === 'geojson') {
    return { type: 'FeatureCollection', features: Array.isArray(parsed) ? parsed : [parsed] };
  }
  return parsed;
}
