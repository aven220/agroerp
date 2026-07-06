import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { DEFAULT_EMFG_CALENDAR_DAYS, generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.emfgProductionCalendar.findMany({
      where: { organizationId },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
  }

  async create(organizationId: string, userId: string, payload: { name: string; timezone?: string; isDefault?: boolean }) {
    const seq = await this.prisma.emfgProductionCalendar.count({ where: { organizationId } });
    const calendarKey = generateEmfgKey('CAL', seq + 1);
    const calendar = await this.prisma.emfgProductionCalendar.create({
      data: {
        organizationId,
        calendarKey,
        name: payload.name,
        timezone: payload.timezone ?? 'America/Bogota',
        isDefault: payload.isDefault ?? false,
      },
    });
    for (const day of DEFAULT_EMFG_CALENDAR_DAYS) {
      await this.prisma.emfgCalendarDay.create({
        data: { organizationId, calendarKey, ...day },
      });
    }
    await this.audit.log(organizationId, 'EmfgProductionCalendar', calendarKey, 'created', userId);
    return this.get(organizationId, calendarKey);
  }

  get(organizationId: string, calendarKey: string) {
    return this.prisma.emfgProductionCalendar.findUnique({
      where: { organizationId_calendarKey: { organizationId, calendarKey } },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
  }

  async updateDay(organizationId: string, userId: string, payload: {
    calendarKey: string; dayOfWeek: number; startTime?: string; endTime?: string;
    availableHours?: number; isWorking?: boolean;
  }) {
    const row = await this.prisma.emfgCalendarDay.upsert({
      where: {
        organizationId_calendarKey_dayOfWeek: {
          organizationId,
          calendarKey: payload.calendarKey,
          dayOfWeek: payload.dayOfWeek,
        },
      },
      create: {
        organizationId,
        calendarKey: payload.calendarKey,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime ?? '06:00',
        endTime: payload.endTime ?? '18:00',
        availableHours: payload.availableHours ?? 8,
        isWorking: payload.isWorking ?? true,
      },
      update: {
        startTime: payload.startTime,
        endTime: payload.endTime,
        availableHours: payload.availableHours,
        isWorking: payload.isWorking,
      },
    });
    await this.audit.log(organizationId, 'EmfgCalendarDay', `${payload.calendarKey}-${payload.dayOfWeek}`, 'updated', userId);
    return row;
  }
}
