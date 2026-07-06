import { EipConnectorProtocol, EipMessageStatus, EipProviderType } from '@agroerp/prisma-eip-client';

export function generateEipKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EIP_CONNECTOR_CATALOG: Array<{
  catalogKey: string;
  name: string;
  protocol: EipConnectorProtocol;
  category: string;
  description: string;
}> = [
  { catalogKey: 'rest', name: 'REST API', protocol: 'rest', category: 'api', description: 'HTTP/REST' },
  { catalogKey: 'graphql', name: 'GraphQL', protocol: 'graphql', category: 'api', description: 'GraphQL endpoint' },
  { catalogKey: 'soap', name: 'SOAP', protocol: 'soap', category: 'api', description: 'SOAP/XML services' },
  { catalogKey: 'grpc', name: 'gRPC', protocol: 'grpc', category: 'api', description: 'gRPC/protobuf' },
  { catalogKey: 'sftp', name: 'SFTP', protocol: 'sftp', category: 'file', description: 'Secure file transfer' },
  { catalogKey: 'ftp', name: 'FTP', protocol: 'ftp', category: 'file', description: 'FTP file transfer' },
  { catalogKey: 'email', name: 'Email', protocol: 'email', category: 'messaging', description: 'SMTP/IMAP' },
  { catalogKey: 'csv', name: 'CSV Files', protocol: 'csv', category: 'file', description: 'CSV import/export' },
  { catalogKey: 'excel', name: 'Excel Files', protocol: 'excel', category: 'file', description: 'XLSX import/export' },
  { catalogKey: 'xml', name: 'XML Files', protocol: 'xml', category: 'file', description: 'XML documents' },
  { catalogKey: 'json', name: 'JSON Files', protocol: 'json', category: 'file', description: 'JSON payloads' },
];

export const EIP_MESSAGING_SLOTS: Array<{
  providerType: EipProviderType;
  name: string;
  description: string;
}> = [
  { providerType: 'rabbitmq', name: 'RabbitMQ', description: 'AMQP broker' },
  { providerType: 'kafka', name: 'Apache Kafka', description: 'Distributed streaming' },
  { providerType: 'azure_service_bus', name: 'Azure Service Bus', description: 'Azure messaging' },
  { providerType: 'aws_sqs', name: 'AWS SQS', description: 'Amazon queue service' },
  { providerType: 'google_pubsub', name: 'Google Pub/Sub', description: 'GCP pub/sub' },
  { providerType: 'in_memory', name: 'In-Memory', description: 'Dev/test broker' },
];

export const EIP_EXTERNAL_TARGETS = [
  { key: 'dian', name: 'DIAN', category: 'government' },
  { key: 'banks', name: 'Bancos', category: 'finance' },
  { key: 'payment_gateways', name: 'Pasarelas de pago', category: 'finance' },
  { key: 'ecommerce', name: 'E-commerce', category: 'commerce' },
  { key: 'crm', name: 'CRM externos', category: 'crm' },
  { key: 'government', name: 'Servicios gubernamentales', category: 'government' },
  { key: 'mobile', name: 'Apps móviles', category: 'mobile' },
  { key: 'legacy', name: 'Sistemas heredados', category: 'legacy' },
];

export function evaluateCondition(expression: string, context: Record<string, unknown>): boolean {
  if (!expression?.trim()) return true;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${expression});`);
    return Boolean(fn(...values));
  } catch {
    return false;
  }
}

export function applyTransform(
  template: Record<string, unknown>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (!template || Object.keys(template).length === 0) return payload;
  const result: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(template)) {
    if (typeof expr === 'string' && expr.startsWith('$')) {
      const path = expr.slice(1).split('.');
      let val: unknown = payload;
      for (const p of path) val = (val as Record<string, unknown>)?.[p];
      result[key] = val;
    } else {
      result[key] = expr;
    }
  }
  return { ...payload, ...result };
}

export function signPayload(secret: string, payload: string): string {
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  return expected === signature;
}

export function validateOrigin(hosts: string[], origin?: string): boolean {
  if (!hosts.length) return true;
  if (!origin) return false;
  return hosts.some((h) => origin.includes(h));
}

export function computeRetryDelay(attempt: number, baseMs: number): number {
  return Math.min(baseMs * Math.pow(2, attempt), 60000);
}

export function shouldMoveToDlq(retryCount: number, maxRetries: number): boolean {
  return retryCount >= maxRetries;
}

export function selectLoadBalanceTarget(targets: string[], strategy: string, index: number): string {
  if (!targets.length) return '';
  if (strategy === 'round_robin') return targets[index % targets.length];
  return targets[0];
}

export function aggregateEipIndicators(data: {
  invocations24h: number;
  failedInvocations24h: number;
  events24h: number;
  dlqCount: number;
  webhooksPending: number;
  esbMessages24h: number;
  avgDurationMs: number;
}) {
  const successRate = data.invocations24h > 0
    ? Math.round(((data.invocations24h - data.failedInvocations24h) / data.invocations24h) * 100)
    : 100;
  return {
    invocations24h: data.invocations24h,
    failedInvocations24h: data.failedInvocations24h,
    successRate24h: successRate,
    events24h: data.events24h,
    dlqCount: data.dlqCount,
    webhooksPending: data.webhooksPending,
    esbMessages24h: data.esbMessages24h,
    avgDurationMs: data.avgDurationMs,
    healthScore: Math.max(0, successRate - data.dlqCount),
  };
}

export function routeEsbMessage(
  routes: Array<{ routeKey: string; sourceRef: string; conditions?: string; priority: number }>,
  sourceRef: string,
  context: Record<string, unknown>,
): string | null {
  const candidates = routes
    .filter((r) => r.sourceRef === sourceRef)
    .filter((r) => evaluateCondition(r.conditions ?? '', context))
    .sort((a, b) => a.priority - b.priority);
  return candidates[0]?.routeKey ?? null;
}

export function mapMessageStatus(success: boolean, retryCount: number, maxRetries: number): EipMessageStatus {
  if (success) return 'completed';
  if (shouldMoveToDlq(retryCount, maxRetries)) return 'dlq';
  return 'failed';
}

export type EipSimulationResult = {
  matched: boolean;
  computed: Record<string, unknown>;
  actionsWouldRun: number;
  durationMs: number;
};

export function simulateRuleLocally(
  conditions: Record<string, unknown>,
  expressions: Array<{ key: string; expression: string }>,
  actions: unknown[],
  context: Record<string, unknown>,
): EipSimulationResult {
  const start = Date.now();
  const computed: Record<string, unknown> = {};
  for (const expr of expressions) {
    try {
      const keys = Object.keys(context);
      const values = Object.values(context);
      const fn = new Function(...keys, `return (${expr.expression});`);
      computed[expr.key] = fn(...values);
    } catch {
      computed[expr.key] = null;
    }
  }
  const matched = evaluateCondition(JSON.stringify(conditions), { ...context, computed });
  return {
    matched,
    computed,
    actionsWouldRun: matched ? (actions as unknown[]).length : 0,
    durationMs: Date.now() - start,
  };
}
