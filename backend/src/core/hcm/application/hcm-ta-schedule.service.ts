import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { DEFAULT_TA_SCHEDULES, generateTaKey } from '../domain/hcm-time-attendance.engine';
import type { HcmTaWorkMode } from '@prisma/client';

@Injectable()
export class HcmTaScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.hcmTaWorkSchedule.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const s of DEFAULT_TA_SCHEDULES) {
      const existing = await this.prisma.hcmTaWorkSchedule.findFirst({ where: { organizationId, scheduleKey: s.scheduleKey } });
      if (existing) continue;
      await this.prisma.hcmTaWorkSchedule.create({
        data: {
          organizationId,
          scheduleKey: s.scheduleKey,
          name: s.name,
          workMode: s.workMode as HcmTaWorkMode,
          weeklyHours: s.weeklyHours,
          dailyHours: s.dailyHours,
          flexibleStart: 'flexibleStart' in s ? s.flexibleStart : false,
          flexWindowMinutes: 'flexWindowMinutes' in s ? s.flexWindowMinutes : 0,
          breakRules: [{ durationMinutes: 15, paid: true }],
          lunchRules: [{ durationMinutes: 60, paid: false }],
        },
      });
    }
    await this.audit.log(organizationId, 'HcmTaWorkSchedule', 'defaults', 'seeded', userId);
  }

  async upsert(organizationId: string, userId: string, input: {
    scheduleKey?: string; name: string; workMode: HcmTaWorkMode;
    weeklyHours?: number; dailyHours?: number; flexibleStart?: boolean; flexWindowMinutes?: number;
    breakRules?: unknown[]; lunchRules?: unknown[];
  }) {
    if (input.scheduleKey) {
      const existing = await this.prisma.hcmTaWorkSchedule.findFirst({ where: { organizationId, scheduleKey: input.scheduleKey } });
      if (existing) {
        return this.prisma.hcmTaWorkSchedule.update({
          where: { id: existing.id },
          data: {
            name: input.name, workMode: input.workMode, weeklyHours: input.weeklyHours,
            dailyHours: input.dailyHours, flexibleStart: input.flexibleStart,
            flexWindowMinutes: input.flexWindowMinutes,
            breakRules: (input.breakRules ?? existing.breakRules) as object,
            lunchRules: (input.lunchRules ?? existing.lunchRules) as object,
          },
        });
      }
    }
    const scheduleKey = input.scheduleKey ?? generateTaKey('SCH', (await this.prisma.hcmTaWorkSchedule.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmTaWorkSchedule.create({
      data: {
        organizationId, scheduleKey, name: input.name, workMode: input.workMode,
        weeklyHours: input.weeklyHours ?? 48, dailyHours: input.dailyHours ?? 8,
        flexibleStart: input.flexibleStart ?? false, flexWindowMinutes: input.flexWindowMinutes ?? 0,
        breakRules: (input.breakRules ?? []) as object,
        lunchRules: (input.lunchRules ?? []) as object,
      },
    });
  }
}
