import { Injectable } from '@nestjs/common';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EatpAuditService } from './eatp-audit.service';

@Injectable()
export class EatpCampaignService {
  constructor(
    private readonly prisma: EatpPrismaService,
    private readonly audit: EatpAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eatpCampaign.findMany({
      where: { organizationId },
      include: { tasks: { take: 5 }, schedules: { take: 5 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listSeasons(organizationId: string) {
    return this.prisma.eatpSeason.findMany({ where: { organizationId }, orderBy: { yearFrom: 'desc' } });
  }

  async createSeason(organizationId: string, seasonKey: string, name: string, yearFrom: number, yearTo?: number) {
    return this.prisma.eatpSeason.upsert({
      where: { organizationId_seasonKey: { organizationId, seasonKey } },
      create: { organizationId, seasonKey, name, yearFrom, yearTo },
      update: { name, yearFrom, yearTo },
    });
  }

  async createCampaign(
    organizationId: string,
    userId: string,
    campaignKey: string,
    name: string,
    opts: {
      seasonKey?: string;
      startDate?: Date;
      endDate?: Date;
      budgetAmount?: number;
      objectives?: unknown[];
      responsibleId?: string;
    },
  ) {
    const row = await this.prisma.eatpCampaign.upsert({
      where: { organizationId_campaignKey: { organizationId, campaignKey } },
      create: {
        organizationId,
        campaignKey,
        name,
        seasonKey: opts.seasonKey,
        startDate: opts.startDate,
        endDate: opts.endDate,
        budgetAmount: opts.budgetAmount ?? 0,
        objectives: (opts.objectives ?? []) as object,
        responsibleId: opts.responsibleId,
        createdBy: userId,
        status: 'active',
      },
      update: {
        name,
        seasonKey: opts.seasonKey,
        startDate: opts.startDate,
        endDate: opts.endDate,
        budgetAmount: opts.budgetAmount,
        objectives: (opts.objectives ?? []) as object,
        responsibleId: opts.responsibleId,
      },
    });
    await this.audit.log(organizationId, 'Campaign', campaignKey, 'campaign_created', userId);
    return row;
  }

  async updateStatus(organizationId: string, userId: string, campaignKey: string, status: 'active' | 'completed' | 'archived') {
    const row = await this.prisma.eatpCampaign.update({
      where: { organizationId_campaignKey: { organizationId, campaignKey } },
      data: { status },
    });
    await this.audit.log(organizationId, 'Campaign', campaignKey, 'campaign_updated', userId, { status });
    return row;
  }
}
