import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { computeNoveltyMultiplier, generateTaKey, isHolidayDate } from '../domain/hcm-time-attendance.engine';
import type { HcmTaNoveltyStatus, HcmTaNoveltyType } from '@prisma/client';

@Injectable()
export class HcmTaNoveltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { employeeKey?: string; status?: HcmTaNoveltyStatus; noveltyType?: HcmTaNoveltyType }) {
    return this.prisma.hcmTaTimeNovelty.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.noveltyType ? { noveltyType: filters.noveltyType } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, input: {
    employeeKey: string; noveltyType: HcmTaNoveltyType; startDate: string; endDate?: string;
    hours?: number; quantity?: number; reason?: string; submit?: boolean;
  }) {
    const noveltyKey = generateTaKey('NOV', (await this.prisma.hcmTaTimeNovelty.count({ where: { organizationId } })) + 1);
    const start = new Date(input.startDate);
    const holidays = await this.prisma.hcmTaHoliday.findMany({
      where: { organizationId, holidayDate: { gte: start, lte: input.endDate ? new Date(input.endDate) : start } },
    });
    const holidayDates = holidays.map((h) => h.holidayDate.toISOString().slice(0, 10));
    const isSunday = start.getDay() === 0;
    const isHoliday = isHolidayDate(input.startDate, holidayDates);
    const multiplier = computeNoveltyMultiplier(input.noveltyType, isSunday, isHoliday);

    const novelty = await this.prisma.hcmTaTimeNovelty.create({
      data: {
        organizationId, noveltyKey, employeeKey: input.employeeKey,
        noveltyType: input.noveltyType,
        status: input.submit ? 'pending' : 'draft',
        startDate: start,
        endDate: input.endDate ? new Date(input.endDate) : null,
        hours: input.hours, quantity: input.quantity, multiplier,
        reason: input.reason, createdBy: userId,
        metadata: { isSunday, isHoliday, payrollExportReady: false },
      },
    });

    await this.audit.log(organizationId, 'HcmTaTimeNovelty', noveltyKey, 'created', userId, { noveltyType: input.noveltyType });
    await this.core.emitUserAction(organizationId, 'HcmTaTimeNovelty', noveltyKey, EVENT_TYPES.HCM_TA_NOVELTY_CREATED, input);
    return novelty;
  }

  async submit(organizationId: string, noveltyKey: string, userId: string) {
    const novelty = await this.get(organizationId, noveltyKey);
    if (!['draft', 'rejected'].includes(novelty.status)) throw new BadRequestException('Novedad no puede enviarse');
    return this.prisma.hcmTaTimeNovelty.update({
      where: { id: novelty.id },
      data: { status: 'pending' },
    });
  }

  async decide(organizationId: string, noveltyKey: string, userId: string, approved: boolean, payrollPeriod?: string) {
    const novelty = await this.get(organizationId, noveltyKey);
    if (novelty.status !== 'pending') throw new BadRequestException('Novedad no pendiente');

    const status: HcmTaNoveltyStatus = approved ? 'approved' : 'rejected';
    const updated = await this.prisma.hcmTaTimeNovelty.update({
      where: { id: novelty.id },
      data: {
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        payrollPeriod,
        payrollReady: approved,
        metadata: { ...(novelty.metadata as object), approvedAt: new Date().toISOString() },
      },
    });

    await this.audit.log(organizationId, 'HcmTaTimeNovelty', noveltyKey, status, userId, { payrollPeriod });
    await this.core.emitUserAction(organizationId, 'HcmTaTimeNovelty', noveltyKey, EVENT_TYPES.HCM_TA_NOVELTY_DECIDED, { approved, payrollPeriod });
    return updated;
  }

  async get(organizationId: string, noveltyKey: string) {
    const novelty = await this.prisma.hcmTaTimeNovelty.findFirst({ where: { organizationId, noveltyKey } });
    if (!novelty) throw new NotFoundException(`Novedad ${noveltyKey} no encontrada`);
    return novelty;
  }

  async payrollExport(organizationId: string, payrollPeriod: string) {
    const rows = await this.prisma.hcmTaTimeNovelty.findMany({
      where: { organizationId, payrollPeriod, payrollReady: true, status: 'approved' },
    });
    const punches = await this.prisma.hcmTaTimePunch.findMany({
      where: { organizationId, payrollReady: true },
    });
    return {
      payrollPeriod,
      novelties: rows,
      punches: punches.length,
      exportedAt: new Date().toISOString(),
      integrationTarget: 'payroll',
    };
  }
}
