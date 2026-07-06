import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EneacRecipientResolver } from './eneac-recipient.resolver';
import { EneacNotificationService } from './eneac-notification.service';
import { NotificationRecipientDefinition } from '@agroerp/shared';

@Injectable()
export class EneacEscalationService {
  private readonly logger = new Logger(EneacEscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly recipients: EneacRecipientResolver,
    private readonly notifications: EneacNotificationService,
  ) {}

  async processEscalations(organizationId: string) {
    const now = new Date();
    const unread = await this.prisma.notificationMessage.findMany({
      where: {
        organizationId,
        status: 'unread',
        attendedAt: null,
        deletedAt: null,
        ruleId: { not: null },
      },
      include: { rule: true },
      take: 300,
    });

    let escalated = 0;
    for (const msg of unread) {
      if (!msg.rule) continue;
      const escalation = msg.rule.escalation as {
        afterMinutes?: number;
        escalateTo?: NotificationRecipientDefinition[];
        increasePriority?: boolean;
      };
      if (!escalation?.afterMinutes) continue;

      const ageMinutes = (now.getTime() - msg.createdAt.getTime()) / 60000;
      if (ageMinutes < escalation.afterMinutes) continue;

      const escalateTo = await this.recipients.resolve(escalation.escalateTo, {
        organizationId,
        payload: msg.payload as Record<string, unknown>,
      });

      for (const userId of escalateTo) {
        await this.notifications.sendDirect(organizationId, {
          recipientId: userId,
          title: `[Escalado] ${msg.title}`,
          body: msg.body ?? undefined,
          alertSeverity: escalation.increasePriority ? 'critical' : msg.alertSeverity,
          payload: { escalatedFrom: msg.id },
        });
      }

      if (escalation.increasePriority) {
        await this.prisma.notificationMessage.update({
          where: { id: msg.id },
          data: { isImportant: true, alertSeverity: 'critical' },
        });
      }

      await this.core.emitNotificationEscalated(organizationId, msg.id, {
        ruleId: msg.ruleId,
        escalatedTo: escalateTo,
      });

      escalated++;
    }

    return { escalated };
  }
}
