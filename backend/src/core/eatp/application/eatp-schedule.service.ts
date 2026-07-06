import { Injectable } from '@nestjs/common';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EatpAuditService } from './eatp-audit.service';
import { generateEatpKey } from '../domain/eatp.engine';

@Injectable()
export class EatpScheduleService {
  constructor(
    private readonly prisma: EatpPrismaService,
    private readonly audit: EatpAuditService,
  ) {}

  calendar(organizationId: string, from?: Date, to?: Date) {
    const start = from ?? new Date();
    const end = to ?? new Date(Date.now() + 90 * 86400000);
    return this.prisma.eatpScheduleEntry.findMany({
      where: {
        organizationId,
        startsAt: { gte: start, lte: end },
      },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
  }

  listTasks(organizationId: string, from?: Date, to?: Date) {
    const start = from ?? new Date(Date.now() - 30 * 86400000);
    const end = to ?? new Date(Date.now() + 90 * 86400000);
    return this.prisma.eatpFieldTask.findMany({
      where: {
        organizationId,
        OR: [
          { scheduledDate: { gte: start, lte: end } },
          { completedDate: { gte: start, lte: end } },
        ],
      },
      orderBy: { scheduledDate: 'asc' },
      take: 500,
    });
  }

  async createEntry(
    organizationId: string,
    userId: string,
    data: {
      title: string;
      entryType: string;
      startsAt: Date;
      endsAt?: Date;
      campaignId?: string;
      fieldLotId?: string;
      farmUnitId?: string;
      crewIds?: string[];
      equipmentIds?: string[];
      resourceRefs?: unknown[];
    },
  ) {
    const count = await this.prisma.eatpScheduleEntry.count({ where: { organizationId } });
    const entryKey = generateEatpKey('SCH', count + 1);
    const row = await this.prisma.eatpScheduleEntry.create({
      data: {
        organizationId,
        entryKey,
        title: data.title,
        entryType: data.entryType,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        campaignId: data.campaignId,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        crewIds: data.crewIds ?? [],
        equipmentIds: data.equipmentIds ?? [],
        resourceRefs: (data.resourceRefs ?? []) as object,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Schedule', entryKey, 'schedule_changed', userId);
    return row;
  }
}
