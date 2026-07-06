import { createHash, randomBytes } from 'crypto';

export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

export function errorFingerprint(component: string, message: string, stackTrace?: string): string {
  const base = `${component}|${message}|${(stackTrace ?? '').split('\n')[0] ?? ''}`;
  return createHash('sha256').update(base).digest('hex').slice(0, 32);
}

export function buildTraceTree(
  spans: Array<{ spanId: string; parentSpanId: string | null; name: string; durationMs: number; serviceName: string }>,
) {
  const byId = new Map(spans.map((s) => [s.spanId, { ...s, children: [] as unknown[] }]));
  const roots: unknown[] = [];
  for (const span of byId.values()) {
    if (span.parentSpanId && byId.has(span.parentSpanId)) {
      (byId.get(span.parentSpanId) as { children: unknown[] }).children.push(span);
    } else {
      roots.push(span);
    }
  }
  return roots;
}
