import { Injectable, NotFoundException } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EIWP_IRRIGATION_METHODS, EIWP_SCHEDULE_MODES, generateEiwpKey } from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';
import { EiwpWaterService } from './eiwp-water.service';

@Injectable()
export class EiwpIrrigationService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
    private readonly water: EiwpWaterService,
  ) {}

  methods() {
    return EIWP_IRRIGATION_METHODS;
  }

  modes() {
    return EIWP_SCHEDULE_MODES;
  }

  listSchedules(organizationId: string, fieldLotId?: string) {
    return this.prisma.eiwpIrrigationSchedule.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { sector: true, events: { take: 5, orderBy: { recordedAt: 'desc' } } },
      orderBy: { plannedStart: 'desc' },
      take: 200,
    });
  }

  async schedule(
    organizationId: string,
    userId: string,
    data: {
      sectorId?: string;
      fieldLotId?: string;
      method: string;
      mode?: string;
      plannedStart: Date;
      plannedEnd?: Date;
      volumeM3?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpIrrigationSchedule.count({ where: { organizationId } });
    const scheduleKey = generateEiwpKey('IRR', count + 1);
    const row = await this.prisma.eiwpIrrigationSchedule.create({
      data: {
        organizationId,
        scheduleKey,
        sectorId: data.sectorId,
        fieldLotId: data.fieldLotId,
        method: data.method,
        mode: data.mode ?? 'manual',
        plannedStart: data.plannedStart,
        plannedEnd: data.plannedEnd,
        volumeM3: data.volumeM3,
        status: 'scheduled',
        createdBy: userId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EiwpIrrigationSchedule', scheduleKey, 'irrigation_scheduled', userId, {
      method: data.method,
    });
    return row;
  }

  async suspend(organizationId: string, userId: string, scheduleKey: string) {
    const row = await this.findSchedule(organizationId, scheduleKey);
    const updated = await this.prisma.eiwpIrrigationSchedule.update({
      where: { id: row.id },
      data: { isSuspended: true, status: 'cancelled' },
    });
    await this.audit.log(organizationId, 'EiwpIrrigationSchedule', scheduleKey, 'irrigation_suspended', userId);
    return updated;
  }

  async reschedule(
    organizationId: string,
    userId: string,
    scheduleKey: string,
    plannedStart: Date,
    plannedEnd?: Date,
  ) {
    const row = await this.findSchedule(organizationId, scheduleKey);
    const updated = await this.prisma.eiwpIrrigationSchedule.update({
      where: { id: row.id },
      data: { plannedStart, plannedEnd, isSuspended: false, status: 'scheduled' },
    });
    await this.audit.log(organizationId, 'EiwpIrrigationSchedule', scheduleKey, 'irrigation_rescheduled', userId, {
      plannedStart,
    });
    return updated;
  }

  async complete(
    organizationId: string,
    userId: string,
    scheduleKey: string,
    data: { volumeM3?: number; durationMin?: number },
  ) {
    const schedule = await this.findSchedule(organizationId, scheduleKey);
    const count = await this.prisma.eiwpIrrigationEvent.count({ where: { organizationId } });
    const eventKey = generateEiwpKey('EVT', count + 1);
    await this.prisma.eiwpIrrigationEvent.create({
      data: {
        organizationId,
        eventKey,
        scheduleId: schedule.id,
        eventType: 'completed',
        volumeM3: data.volumeM3 ?? schedule.volumeM3,
        durationMin: data.durationMin,
        recordedBy: userId,
      },
    });
    await this.prisma.eiwpIrrigationSchedule.update({
      where: { id: schedule.id },
      data: { status: 'completed' },
    });
    if (data.volumeM3) {
      await this.water.logConsumption(organizationId, userId, {
        fieldLotId: schedule.fieldLotId ?? undefined,
        sectorId: schedule.sectorId ?? undefined,
        volumeM3: data.volumeM3,
      });
    }
    await this.audit.log(organizationId, 'EiwpIrrigationSchedule', scheduleKey, 'irrigation_completed', userId, data);
    return { completed: true, scheduleKey };
  }

  listEvents(organizationId: string, scheduleKey?: string) {
    return this.prisma.eiwpIrrigationEvent.findMany({
      where: {
        organizationId,
        ...(scheduleKey ? { schedule: { scheduleKey } } : {}),
      },
      include: { schedule: true },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  private async findSchedule(organizationId: string, scheduleKey: string) {
    const row = await this.prisma.eiwpIrrigationSchedule.findFirst({ where: { organizationId, scheduleKey } });
    if (!row) throw new NotFoundException('Programación de riego no encontrada');
    return row;
  }
}
