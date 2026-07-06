import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EneacNotificationService } from './eneac-notification.service';

@Injectable()
export class EneacSchedulerService {
  private readonly logger = new Logger(EneacSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly notifications: EneacNotificationService,
  ) {}

  async processDue(organizationId: string) {
    const now = new Date();
    const due = await this.prisma.notificationSchedule.findMany({
      where: {
        organizationId,
        status: 'pending',
        fireAt: { lte: now },
      },
      take: 500,
    });

    const fired = [];
    for (const schedule of due) {
      const payload = schedule.payload as Record<string, unknown>;
      await this.notifications.sendDirect(organizationId, {
        recipientId: schedule.recipientId,
        title: (payload.title as string) ?? 'Recordatorio programado',
        body: payload.body as string | undefined,
        alertSeverity: (payload.alertSeverity as string) ?? 'info',
        channels: (payload.channels as []) ?? [{ channel: 'internal' }],
        payload,
      });

      const recurrence = schedule.recurrence as { intervalMinutes?: number };
      const updates: {
        status: 'fired' | 'pending';
        lastFiredAt: Date;
        fireAt?: Date;
        nextFireAt?: Date;
      } = {
        status: 'fired',
        lastFiredAt: now,
      };

      if (recurrence?.intervalMinutes) {
        const next = new Date(now.getTime() + recurrence.intervalMinutes * 60000);
        updates.status = 'pending';
        updates.fireAt = next;
        updates.nextFireAt = next;
      }

      await this.prisma.notificationSchedule.update({
        where: { id: schedule.id },
        data: updates,
      });

      await this.core.emitNotificationScheduleFired(organizationId, schedule.id, {
        scheduleType: schedule.scheduleType,
        recipientId: schedule.recipientId,
      });

      fired.push(schedule.id);
    }

    return { fired: fired.length };
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      recipientId: string;
      scheduleType: string;
      fireAt: string;
      cronExpression?: string;
      recurrence?: Record<string, unknown>;
      payload: Record<string, unknown>;
      ruleId?: string;
    },
  ) {
    return this.prisma.notificationSchedule.create({
      data: {
        organizationId,
        recipientId: data.recipientId,
        scheduleType: data.scheduleType,
        fireAt: new Date(data.fireAt),
        cronExpression: data.cronExpression,
        recurrence: (data.recurrence ?? {}) as object,
        payload: data.payload as object,
        ruleId: data.ruleId,
        createdBy: userId,
        nextFireAt: new Date(data.fireAt),
      },
    });
  }

  findAll(organizationId: string, recipientId?: string) {
    return this.prisma.notificationSchedule.findMany({
      where: {
        organizationId,
        recipientId,
        status: 'pending',
      },
      orderBy: { fireAt: 'asc' },
      take: 200,
    });
  }
}
