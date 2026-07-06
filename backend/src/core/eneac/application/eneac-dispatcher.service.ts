import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationAlertSeverity,
  NotificationChannel,
  NotificationChannelConfig,
} from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EneacDispatcherService {
  private readonly logger = new Logger(EneacDispatcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatchMessage(messageId: string, channels: NotificationChannelConfig[]) {
    const message = await this.prisma.notificationMessage.findUnique({
      where: { id: messageId },
      include: { recipient: { select: { id: true, email: true, phone: true } } },
    });
    if (!message) return [];

    const results = [];
    for (const ch of channels) {
      const delivery = await this.prisma.notificationDelivery.create({
        data: {
          messageId: message.id,
          organizationId: message.organizationId,
          channel: ch.channel,
          status: 'pending',
          recipientRef: this.resolveRecipientRef(ch.channel, message.recipient),
        },
      });

      const start = Date.now();
      try {
        await this.dispatchChannel(ch, message);
        const latencyMs = Date.now() - start;
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: ch.channel === 'internal' ? 'delivered' : 'sent',
            deliveredAt: new Date(),
            lastAttemptAt: new Date(),
            attemptCount: 1,
            latencyMs,
          },
        });
        results.push({ deliveryId: delivery.id, channel: ch.channel, status: 'sent' });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'failed',
            error,
            lastAttemptAt: new Date(),
            attemptCount: 1,
            latencyMs: Date.now() - start,
          },
        });
        results.push({ deliveryId: delivery.id, channel: ch.channel, status: 'failed', error });
      }
    }
    return results;
  }

  async dispatchWorkflowNotification(notif: {
    id: string;
    channel: string;
    recipientId: string | null;
    subject: string | null;
    body: string | null;
    organizationId: string;
    instanceId: string;
  }) {
    const channels: NotificationChannelConfig[] = [
      {
        channel: notif.channel as NotificationChannel,
        subject: notif.subject ?? undefined,
        template: notif.body ?? undefined,
      },
    ];

    const message = await this.prisma.notificationMessage.create({
      data: {
        organizationId: notif.organizationId,
        recipientId: notif.recipientId,
        sourceEventType: 'WorkflowNotificationQueued',
        alertSeverity: 'operational',
        channel: (notif.channel as NotificationChannel) ?? 'internal',
        title: notif.subject ?? 'Notificación de proceso',
        body: notif.body,
        payload: { workflowNotificationId: notif.id, instanceId: notif.instanceId },
      },
    });

    await this.dispatchMessage(message.id, channels);

    await this.prisma.workflowNotification.update({
      where: { id: notif.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }

  async retryFailed(organizationId: string, limit = 100) {
    const failed = await this.prisma.notificationDelivery.findMany({
      where: { organizationId, status: 'failed' },
      include: { message: true },
      take: limit,
    });

    let retried = 0;
    for (const delivery of failed) {
      if (delivery.attemptCount >= 3) continue;
      try {
        await this.dispatchChannel(
          { channel: delivery.channel },
          delivery.message,
        );
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'sent',
            deliveredAt: new Date(),
            lastAttemptAt: new Date(),
            attemptCount: delivery.attemptCount + 1,
          },
        });
        retried++;
      } catch (err) {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            attemptCount: delivery.attemptCount + 1,
            lastAttemptAt: new Date(),
            error: err instanceof Error ? err.message : 'Retry failed',
          },
        });
      }
    }
    return { retried };
  }

  private resolveRecipientRef(
    channel: NotificationChannel,
    recipient: { email?: string; phone?: string | null; id?: string } | null,
  ) {
    if (!recipient) return null;
    switch (channel) {
      case 'email':
        return recipient.email ?? null;
      case 'sms':
      case 'whatsapp':
        return recipient.phone ?? null;
      case 'push':
        return recipient.id ?? null;
      default:
        return recipient.id ?? null;
    }
  }

  private async dispatchChannel(
    ch: NotificationChannelConfig,
    message: {
      title: string;
      body: string | null;
      recipientId: string | null;
      organizationId: string;
      payload: unknown;
    },
  ) {
    switch (ch.channel) {
      case 'internal':
      case 'push':
        break;
      case 'email':
        this.logger.log(`ENEAC email → ${message.recipientId}: ${ch.subject ?? message.title}`);
        break;
      case 'sms':
      case 'whatsapp':
      case 'telegram':
        this.logger.log(`ENEAC ${ch.channel} → ${message.recipientId}: ${message.body}`);
        break;
      case 'teams':
      case 'slack':
        this.logger.log(`ENEAC ${ch.channel} → ${message.title}`);
        break;
      case 'webhook':
      case 'external_api':
        this.logger.log(`ENEAC webhook → ${ch.webhookUrl ?? 'default'}: ${message.title}`);
        break;
      default:
        break;
    }
  }
}
