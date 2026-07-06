import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EneacInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async findInbox(
    organizationId: string,
    userId: string,
    filters?: {
      status?: string;
      search?: string;
      severity?: string;
      groupKey?: string;
      important?: boolean;
    },
  ) {
    return this.prisma.notificationMessage.findMany({
      where: {
        organizationId,
        recipientId: userId,
        deletedAt: null,
        status: filters?.status
          ? (filters.status as 'unread')
          : { not: 'deleted' },
        alertSeverity: filters?.severity
          ? (filters.severity as 'info')
          : undefined,
        groupKey: filters?.groupKey,
        isImportant: filters?.important,
        OR: filters?.search
          ? [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { body: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { deliveries: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: [{ isImportant: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async markRead(organizationId: string, messageId: string, userId: string) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    const updated = await this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: { status: 'read', readAt: new Date() },
    });
    await this.prisma.notificationDelivery.updateMany({
      where: { messageId, readAt: null },
      data: { readAt: new Date() },
    });
    await this.core.emitNotificationRead(organizationId, messageId, { userId });
    return updated;
  }

  async markImportant(
    organizationId: string,
    messageId: string,
    userId: string,
    important: boolean,
  ) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    return this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: { isImportant: important },
    });
  }

  async archive(organizationId: string, messageId: string, userId: string) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    return this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  async remove(organizationId: string, messageId: string, userId: string) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    return this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  }

  async assign(
    organizationId: string,
    messageId: string,
    assigneeId: string,
    actorId: string,
  ) {
    const msg = await this.prisma.notificationMessage.findFirst({
      where: { id: messageId, organizationId, deletedAt: null },
    });
    if (!msg) throw new NotFoundException('Notificación no encontrada');

    return this.prisma.notificationMessage.update({
      where: { id: messageId },
      data: {
        assignedToId: assigneeId,
        comments: [
          ...((msg.comments as object[]) ?? []),
          { actorId, action: 'assigned', assigneeId, at: new Date().toISOString() },
        ],
      },
    });
  }

  async comment(
    organizationId: string,
    messageId: string,
    userId: string,
    content: string,
  ) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    return this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: {
        comments: [
          ...((msg.comments as object[]) ?? []),
          { userId, content, at: new Date().toISOString() },
        ],
      },
    });
  }

  async attend(organizationId: string, messageId: string, userId: string) {
    const msg = await this.findUserMessage(organizationId, messageId, userId);
    const updated = await this.prisma.notificationMessage.update({
      where: { id: msg.id },
      data: { attendedAt: new Date(), status: msg.status === 'unread' ? 'read' : msg.status, readAt: msg.readAt ?? new Date() },
    });
    await this.prisma.notificationDelivery.updateMany({
      where: { messageId },
      data: { attendedAt: new Date() },
    });
    await this.core.emitNotificationAttended(organizationId, messageId, { userId });
    return updated;
  }

  async reply(
    organizationId: string,
    messageId: string,
    userId: string,
    content: string,
  ) {
    return this.comment(organizationId, messageId, userId, `[reply] ${content}`);
  }

  private async findUserMessage(
    organizationId: string,
    messageId: string,
    userId: string,
  ) {
    const msg = await this.prisma.notificationMessage.findFirst({
      where: {
        id: messageId,
        organizationId,
        recipientId: userId,
        deletedAt: null,
      },
    });
    if (!msg) throw new NotFoundException('Notificación no encontrada');
    return msg;
  }
}
