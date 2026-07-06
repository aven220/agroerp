import { Injectable } from '@nestjs/common';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceNotificationService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  list(organizationId: string, recipientRef?: string) {
    return this.prisma.eaceNotification.findMany({
      where: { organizationId, ...(recipientRef ? { recipientRef } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  async send(organizationId: string, recipientRef: string, title: string, body: string, channel = 'in_app') {
    const count = await this.prisma.eaceNotification.count({ where: { organizationId } });
    const notification = await this.prisma.eaceNotification.create({
      data: {
        organizationId,
        notificationKey: generateEaceKey('NTF', count + 1),
        recipientRef,
        channel,
        title,
        body,
      },
    });
    await this.audit.log(organizationId, 'Notification', notification.notificationKey, 'notification_sent');
    return notification;
  }

  markRead(organizationId: string, notificationKey: string) {
    return this.prisma.eaceNotification.updateMany({
      where: { organizationId, notificationKey },
      data: { isRead: true },
    });
  }
}
