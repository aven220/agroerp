import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EintNotificationChannel, EintStatus } from '@agroerp/prisma-eint-client';
import { EneacNotificationService } from '@/core/eneac/application/eneac-notification.service';
import { EneacInboxService } from '@/core/eneac/application/eneac-inbox.service';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { generateEintKey } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintNotificationService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly notifications: EneacNotificationService,
    private readonly inbox: EneacInboxService,
    private readonly audit: EintAuditService,
  ) {}

  channels() {
    return ['email', 'push', 'sms', 'in_app', 'enterprise_messaging'] as EintNotificationChannel[];
  }

  listRules(organizationId: string) {
    return this.prisma.eintNotificationRule.findMany({ where: { organizationId }, orderBy: { priority: 'asc' } });
  }

  async createRule(
    organizationId: string,
    ruleKey: string,
    name: string,
    eventType: string,
    opts: { priority?: number; channels?: EintNotificationChannel[]; isPredictive?: boolean; filterExpr?: string },
  ) {
    const existing = await this.prisma.eintNotificationRule.findFirst({ where: { organizationId, ruleKey } });
    if (existing) throw new BadRequestException(`Regla ${ruleKey} ya existe`);
    return this.prisma.eintNotificationRule.create({
      data: {
        organizationId,
        ruleKey,
        name,
        eventType,
        priority: opts.priority ?? 100,
        channels: opts.channels ?? ['in_app'],
        isPredictive: opts.isPredictive ?? false,
        filterExpr: opts.filterExpr,
        status: 'active',
      },
    });
  }

  async dispatch(
    organizationId: string,
    userId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const rules = await this.prisma.eintNotificationRule.findMany({
      where: { organizationId, eventType, status: 'active' },
      orderBy: { priority: 'asc' },
    });
    const deliveries = [];
    for (const rule of rules) {
      for (const channel of rule.channels) {
        const seq = await this.prisma.eintNotificationDelivery.count({ where: { organizationId } });
        const delivery = await this.prisma.eintNotificationDelivery.create({
          data: {
            organizationId,
            ruleId: rule.id,
            deliveryKey: generateEintKey('NTF', seq + 1),
            channel,
            status: 'pending',
            payload: payload as object,
          },
        });
        try {
          if (channel === 'in_app' || channel === 'push') {
            await this.notifications.processDomainEvent({
              organizationId,
              aggregateType: 'EintNotification',
              aggregateId: delivery.id,
              eventType,
              payload,
              metadata: { userId, correlationId: delivery.id, source: 'system' },
            });
          }
          await this.prisma.eintNotificationDelivery.update({
            where: { id: delivery.id },
            data: { status: 'completed', sentAt: new Date() },
          });
          deliveries.push(delivery);
        } catch (e) {
          await this.prisma.eintNotificationDelivery.update({
            where: { id: delivery.id },
            data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'dispatch failed' },
          });
        }
      }
    }
    await this.audit.log(organizationId, 'EintNotification', eventType, 'notification_sent', userId, { count: deliveries.length });
    return { dispatched: deliveries.length, deliveries };
  }

  deliveries(organizationId: string, limit = 100) {
    return this.prisma.eintNotificationDelivery.findMany({
      where: { organizationId },
      include: { rule: { select: { ruleKey: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  getInbox(organizationId: string, userId: string) {
    return this.inbox.findInbox(organizationId, userId);
  }
}
