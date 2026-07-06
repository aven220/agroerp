import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { detectScheduleConflicts, generateEamCmmsKey } from '../domain/eam-cmms.engine';

@Injectable()
export class EamCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, from?: Date, to?: Date) {
    return this.prisma.eamCalendarEntry.findMany({
      where: {
        organizationId,
        ...(from && to ? { startsAt: { gte: from }, endsAt: { lte: to } } : {}),
      },
      include: { workOrder: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async schedule(
    organizationId: string,
    workOrderKey: string,
    technicianKey: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const existing = await this.prisma.eamCalendarEntry.findMany({
      where: { organizationId, technicianKey },
    });
    const slots = existing.map((e) => ({
      technicianKey: e.technicianKey ?? '',
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    }));
    const hasConflict = detectScheduleConflicts(slots, { technicianKey, startsAt, endsAt });
    const seq = await this.prisma.eamCalendarEntry.count({ where: { organizationId } });
    return this.prisma.eamCalendarEntry.create({
      data: {
        organizationId,
        entryKey: generateEamCmmsKey('CAL', seq + 1),
        workOrderKey,
        technicianKey,
        startsAt,
        endsAt,
        hasConflict,
      },
    });
  }

  dayView(organizationId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.list(organizationId, start, end);
  }

  weekView(organizationId: string, weekStart: Date) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return this.list(organizationId, weekStart, end);
  }

  monthView(organizationId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return this.list(organizationId, start, end);
  }
}
