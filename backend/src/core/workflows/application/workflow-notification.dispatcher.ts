import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EneacDispatcherService } from '@/core/eneac/application/eneac-dispatcher.service';

@Injectable()
export class WorkflowNotificationDispatcher {
  private readonly logger = new Logger(WorkflowNotificationDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => EneacDispatcherService))
    private readonly eneac?: EneacDispatcherService,
  ) {}

  async dispatchPending(organizationId: string, limit = 100) {
    const pending = await this.prisma.workflowNotification.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const results = [];
    for (const notif of pending) {
      try {
        if (this.eneac) {
          await this.eneac.dispatchWorkflowNotification({
            id: notif.id,
            channel: notif.channel,
            recipientId: notif.recipientId,
            subject: notif.subject,
            body: notif.body,
            organizationId: notif.organizationId,
            instanceId: notif.instanceId,
          });
        } else {
          await this.dispatchOneLegacy(notif);
        }
        results.push({ id: notif.id, status: 'sent' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await this.prisma.workflowNotification.update({
          where: { id: notif.id },
          data: { status: 'failed', error: message },
        });
        results.push({ id: notif.id, status: 'failed', error: message });
      }
    }
    return { processed: results.length, results };
  }

  private async dispatchOneLegacy(notif: {
    id: string;
    channel: string;
    recipientId: string | null;
    subject: string | null;
    body: string | null;
  }) {
    switch (notif.channel) {
      case 'internal':
      case 'push':
        break;
      case 'email':
        this.logger.log(
          `Email queued to ${notif.recipientId}: ${notif.subject ?? notif.body}`,
        );
        break;
      case 'sms':
      case 'whatsapp':
        this.logger.log(
          `SMS/WhatsApp queued to ${notif.recipientId}: ${notif.body}`,
        );
        break;
      case 'webhook':
        this.logger.log(`Webhook notification ${notif.id} deferred to action executor`);
        break;
      default:
        break;
    }

    await this.prisma.workflowNotification.update({
      where: { id: notif.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }
}
