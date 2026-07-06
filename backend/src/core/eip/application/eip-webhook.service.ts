import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipStatus, EipWebhookDirection } from '@agroerp/prisma-eip-client';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import {
  computeRetryDelay,
  generateEipKey,
  signPayload,
  validateOrigin,
  verifySignature,
} from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipWebhookService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly audit: EipAuditService,
  ) {}

  list(organizationId: string, direction?: EipWebhookDirection) {
    return this.prisma.eipWebhookEndpoint.findMany({
      where: { organizationId, ...(direction ? { direction } : {}) },
      orderBy: { webhookKey: 'asc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    webhookKey: string,
    name: string,
    direction: EipWebhookDirection,
    opts: {
      targetUrl?: string;
      secret?: string;
      eventTypes?: string[];
      originHosts?: string[];
      maxRetries?: number;
    },
  ) {
    const existing = await this.prisma.eipWebhookEndpoint.findFirst({ where: { organizationId, webhookKey } });
    if (existing) throw new BadRequestException(`Webhook ${webhookKey} ya existe`);
    const webhook = await this.prisma.eipWebhookEndpoint.create({
      data: {
        organizationId,
        webhookKey,
        name,
        direction,
        targetUrl: opts.targetUrl,
        secret: opts.secret,
        eventTypes: opts.eventTypes ?? [],
        originHosts: opts.originHosts ?? [],
        maxRetries: opts.maxRetries ?? 5,
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EipWebhook', webhookKey, 'webhook_created', userId, { direction });
    return webhook;
  }

  async setStatus(organizationId: string, userId: string, webhookKey: string, status: EipStatus) {
    const webhook = await this.prisma.eipWebhookEndpoint.findFirst({ where: { organizationId, webhookKey } });
    if (!webhook) throw new NotFoundException('Webhook no encontrado');
    const updated = await this.prisma.eipWebhookEndpoint.update({
      where: { id: webhook.id },
      data: { status },
    });
    await this.audit.log(
      organizationId,
      'EipWebhook',
      webhookKey,
      status === 'active' ? 'webhook_activated' : 'webhook_deactivated',
      userId,
      { status },
    );
    return updated;
  }

  async receiveIncoming(
    organizationId: string,
    webhookKey: string,
    payload: Record<string, unknown>,
    headers: { origin?: string; signature?: string },
  ) {
    const webhook = await this.prisma.eipWebhookEndpoint.findFirst({
      where: { organizationId, webhookKey, direction: 'incoming', status: 'active' },
    });
    if (!webhook) throw new NotFoundException('Webhook entrante no encontrado');
    if (!validateOrigin(webhook.originHosts, headers.origin)) {
      throw new BadRequestException('Origen no autorizado');
    }
    const body = JSON.stringify(payload);
    if (webhook.secret && headers.signature) {
      if (!verifySignature(webhook.secret, body, headers.signature)) {
        throw new BadRequestException('Firma inválida');
      }
    }
    const seq = await this.prisma.eipWebhookDelivery.count({ where: { organizationId } });
    return this.prisma.eipWebhookDelivery.create({
      data: {
        organizationId,
        webhookId: webhook.id,
        deliveryKey: generateEipKey('WHD', seq + 1),
        status: 'completed',
        attempt: 1,
        payload: payload as object,
        signature: headers.signature,
        deliveredAt: new Date(),
      },
    });
  }

  async dispatchOutgoing(organizationId: string, webhookKey: string, payload: Record<string, unknown>) {
    const webhook = await this.prisma.eipWebhookEndpoint.findFirst({
      where: { organizationId, webhookKey, direction: 'outgoing', status: 'active' },
    });
    if (!webhook) throw new NotFoundException('Webhook saliente no encontrado');
    const body = JSON.stringify(payload);
    const signature = webhook.secret ? signPayload(webhook.secret, body) : undefined;
    const seq = await this.prisma.eipWebhookDelivery.count({ where: { organizationId } });
    const delivery = await this.prisma.eipWebhookDelivery.create({
      data: {
        organizationId,
        webhookId: webhook.id,
        deliveryKey: generateEipKey('WHD', seq + 1),
        status: 'pending',
        attempt: 0,
        payload: payload as object,
        signature,
        nextRetryAt: new Date(),
      },
    });
    return this.attemptDelivery(organizationId, delivery.id);
  }

  async attemptDelivery(organizationId: string, deliveryId: string) {
    const delivery = await this.prisma.eipWebhookDelivery.findFirst({
      where: { id: deliveryId, organizationId },
      include: { webhook: true },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');
    const webhook = delivery.webhook;
    const attempt = delivery.attempt + 1;
    try {
      const body = JSON.stringify(delivery.payload);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (delivery.signature) headers['X-EIP-Signature'] = delivery.signature;
      let responseCode = 200;
      if (webhook.targetUrl?.startsWith('http')) {
        const res = await fetch(webhook.targetUrl, { method: 'POST', headers, body });
        responseCode = res.status;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      const updated = await this.prisma.eipWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'completed', attempt, responseCode, deliveredAt: new Date() },
      });
      await this.audit.log(organizationId, 'EipWebhook', webhook.webhookKey, 'webhook_delivered', undefined, { deliveryKey: delivery.deliveryKey });
      return updated;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'delivery failed';
      const maxRetries = webhook.maxRetries;
      const status = attempt >= maxRetries ? 'dlq' : 'failed';
      const nextRetryAt = status === 'failed'
        ? new Date(Date.now() + computeRetryDelay(attempt, webhook.retryBackoffMs))
        : undefined;
      const updated = await this.prisma.eipWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status, attempt, errorMessage, nextRetryAt },
      });
      await this.audit.log(organizationId, 'EipWebhook', webhook.webhookKey, 'webhook_failed', undefined, { attempt, errorMessage });
      return updated;
    }
  }

  history(organizationId: string, webhookKey?: string, limit = 100) {
    return this.prisma.eipWebhookDelivery.findMany({
      where: {
        organizationId,
        ...(webhookKey ? { webhook: { webhookKey } } : {}),
      },
      include: { webhook: { select: { webhookKey: true, name: true, direction: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async retryPending(organizationId: string) {
    const pending = await this.prisma.eipWebhookDelivery.findMany({
      where: {
        organizationId,
        status: 'failed',
        nextRetryAt: { lte: new Date() },
      },
      take: 50,
    });
    const results = [];
    for (const d of pending) {
      results.push(await this.attemptDelivery(organizationId, d.id));
    }
    return { retried: results.length, results };
  }

  retryQueue(organizationId: string) {
    return this.prisma.eipWebhookDelivery.findMany({
      where: { organizationId, status: { in: ['pending', 'failed'] } },
      orderBy: { nextRetryAt: 'asc' },
      take: 100,
    });
  }
}
