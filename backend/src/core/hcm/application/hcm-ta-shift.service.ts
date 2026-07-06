import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { DEFAULT_TA_SHIFTS, generateTaKey } from '../domain/hcm-time-attendance.engine';
import type { HcmTaShiftType, HcmTaSwapStatus, HcmTaWorkMode } from '@prisma/client';

@Injectable()
export class HcmTaShiftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listShifts(organizationId: string) {
    return this.prisma.hcmTaShift.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const [i, s] of DEFAULT_TA_SHIFTS.entries()) {
      const existing = await this.prisma.hcmTaShift.findFirst({ where: { organizationId, code: s.code } });
      if (existing) continue;
      await this.prisma.hcmTaShift.create({
        data: {
          organizationId,
          shiftKey: generateTaKey('SHF', i + 1),
          code: s.code,
          name: s.name,
          shiftType: s.shiftType as HcmTaShiftType,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes,
          lunchMinutes: s.lunchMinutes,
          crossesMidnight: 'crossesMidnight' in s ? s.crossesMidnight : false,
        },
      });
    }
    await this.audit.log(organizationId, 'HcmTaShift', 'defaults', 'seeded', userId);
  }

  async upsertShift(organizationId: string, userId: string, input: {
    shiftKey?: string; code: string; name: string; shiftType: HcmTaShiftType;
    startTime: string; endTime: string; breakMinutes?: number; lunchMinutes?: number;
    crossesMidnight?: boolean; graceMinutes?: number;
  }) {
    if (input.shiftKey) {
      const existing = await this.prisma.hcmTaShift.findFirst({ where: { organizationId, shiftKey: input.shiftKey } });
      if (existing) {
        return this.prisma.hcmTaShift.update({
          where: { id: existing.id },
          data: {
            name: input.name, shiftType: input.shiftType, startTime: input.startTime, endTime: input.endTime,
            breakMinutes: input.breakMinutes, lunchMinutes: input.lunchMinutes,
            crossesMidnight: input.crossesMidnight, graceMinutes: input.graceMinutes,
          },
        });
      }
    }
    const shiftKey = input.shiftKey ?? generateTaKey('SHF', (await this.prisma.hcmTaShift.count({ where: { organizationId } })) + 1);
    const shift = await this.prisma.hcmTaShift.create({
      data: {
        organizationId, shiftKey, code: input.code, name: input.name, shiftType: input.shiftType,
        startTime: input.startTime, endTime: input.endTime,
        breakMinutes: input.breakMinutes ?? 0, lunchMinutes: input.lunchMinutes ?? 60,
        crossesMidnight: input.crossesMidnight ?? false, graceMinutes: input.graceMinutes ?? 5,
      },
    });
    await this.audit.log(organizationId, 'HcmTaShift', shiftKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmTaShift', shiftKey, EVENT_TYPES.HCM_TA_SHIFT_CREATED, input);
    return shift;
  }

  listCalendars(organizationId: string) {
    return this.prisma.hcmTaCalendar.findMany({
      where: { organizationId },
      include: { holidays: true },
      orderBy: { year: 'desc' },
    });
  }

  async createCalendar(organizationId: string, userId: string, input: {
    name: string; year: number; companyKey?: string; branchKey?: string; isDefault?: boolean;
  }) {
    const calendarKey = generateTaKey('CAL', (await this.prisma.hcmTaCalendar.count({ where: { organizationId } })) + 1);
    if (input.isDefault) {
      await this.prisma.hcmTaCalendar.updateMany({ where: { organizationId }, data: { isDefault: false } });
    }
    const cal = await this.prisma.hcmTaCalendar.create({
      data: {
        organizationId, calendarKey, name: input.name, year: input.year,
        companyKey: input.companyKey, branchKey: input.branchKey, isDefault: input.isDefault ?? false,
      },
    });
    await this.audit.log(organizationId, 'HcmTaCalendar', calendarKey, 'created', userId);
    return cal;
  }

  async addHoliday(organizationId: string, userId: string, input: {
    calendarKey: string; name: string; holidayDate: string; isNational?: boolean; isPaid?: boolean;
  }) {
    const holidayKey = generateTaKey('HOL', (await this.prisma.hcmTaHoliday.count({ where: { organizationId } })) + 1);
    const holiday = await this.prisma.hcmTaHoliday.create({
      data: {
        organizationId, holidayKey, calendarKey: input.calendarKey, name: input.name,
        holidayDate: new Date(input.holidayDate), isNational: input.isNational ?? true, isPaid: input.isPaid ?? true,
      },
    });
    await this.audit.log(organizationId, 'HcmTaHoliday', holidayKey, 'created', userId);
    return holiday;
  }

  listAssignments(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmTaShiftAssignment.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}), isActive: true },
      include: { shift: true, schedule: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async assignShift(organizationId: string, userId: string, input: {
    employeeKey: string; shiftKey?: string; scheduleKey?: string; calendarKey?: string;
    effectiveFrom: string; effectiveTo?: string; rotationGroup?: string; workMode?: HcmTaWorkMode;
  }) {
    const assignmentKey = generateTaKey('ASN', (await this.prisma.hcmTaShiftAssignment.count({ where: { organizationId } })) + 1);
    const assignment = await this.prisma.hcmTaShiftAssignment.create({
      data: {
        organizationId, assignmentKey, employeeKey: input.employeeKey,
        shiftKey: input.shiftKey, scheduleKey: input.scheduleKey, calendarKey: input.calendarKey,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        rotationGroup: input.rotationGroup, workMode: input.workMode, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTaShiftAssignment', assignmentKey, 'created', userId, input);
    await this.core.emitUserAction(organizationId, 'HcmTaShiftAssignment', assignmentKey, EVENT_TYPES.HCM_TA_SHIFT_ASSIGNED, input);
    return assignment;
  }

  async requestSwap(organizationId: string, userId: string, input: {
    requesterKey: string; fromShiftKey: string; swapDate: string; toShiftKey?: string;
    targetEmployeeKey?: string; reason?: string;
  }) {
    const swapKey = generateTaKey('SWP', (await this.prisma.hcmTaShiftSwap.count({ where: { organizationId } })) + 1);
    const swap = await this.prisma.hcmTaShiftSwap.create({
      data: {
        organizationId, swapKey, requesterKey: input.requesterKey, fromShiftKey: input.fromShiftKey,
        toShiftKey: input.toShiftKey, targetEmployeeKey: input.targetEmployeeKey,
        swapDate: new Date(input.swapDate), reason: input.reason,
      },
    });
    await this.audit.log(organizationId, 'HcmTaShiftSwap', swapKey, 'requested', userId);
    await this.core.emitUserAction(organizationId, 'HcmTaShiftSwap', swapKey, EVENT_TYPES.HCM_TA_SHIFT_SWAP_REQUESTED, input);
    return swap;
  }

  async decideSwap(organizationId: string, swapKey: string, userId: string, approved: boolean) {
    const swap = await this.prisma.hcmTaShiftSwap.findFirst({ where: { organizationId, swapKey } });
    if (!swap) throw new NotFoundException(`Intercambio ${swapKey} no encontrado`);
    if (swap.status !== 'pending') throw new BadRequestException('Intercambio ya decidido');

    const status: HcmTaSwapStatus = approved ? 'approved' : 'rejected';
    const updated = await this.prisma.hcmTaShiftSwap.update({
      where: { id: swap.id },
      data: { status, approvedBy: userId, approvedAt: new Date() },
    });

    if (approved && swap.toShiftKey) {
      await this.assignShift(organizationId, userId, {
        employeeKey: swap.requesterKey,
        shiftKey: swap.toShiftKey,
        effectiveFrom: swap.swapDate.toISOString().slice(0, 10),
      });
    }

    await this.audit.log(organizationId, 'HcmTaShiftSwap', swapKey, status, userId);
    await this.core.emitUserAction(organizationId, 'HcmTaShiftSwap', swapKey, EVENT_TYPES.HCM_TA_SHIFT_SWAP_DECIDED, { approved });
    return updated;
  }

  listSwaps(organizationId: string, status?: HcmTaSwapStatus) {
    return this.prisma.hcmTaShiftSwap.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
