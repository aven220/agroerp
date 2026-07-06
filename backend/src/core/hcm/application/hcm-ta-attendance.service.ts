import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  computeMinutesLate,
  generateTaKey,
  mergeConcurrentPunches,
  summarizeWorkDay,
  validateGeofence,
  validateOfflinePunchRow,
  validatePunchSequence,
} from '../domain/hcm-time-attendance.engine';
import type { HcmTaCorrectionStatus, HcmTaPunchSource, HcmTaPunchType } from '@prisma/client';

@Injectable()
export class HcmTaGeofenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.hcmTaGeofence.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async upsert(organizationId: string, userId: string, input: {
    geofenceKey?: string; name: string; latitude: number; longitude: number;
    radiusMeters?: number; workCenterKey?: string; branchKey?: string;
  }) {
    if (input.geofenceKey) {
      const existing = await this.prisma.hcmTaGeofence.findFirst({ where: { organizationId, geofenceKey: input.geofenceKey } });
      if (existing) {
        return this.prisma.hcmTaGeofence.update({
          where: { id: existing.id },
          data: {
            name: input.name, latitude: input.latitude, longitude: input.longitude,
            radiusMeters: input.radiusMeters, workCenterKey: input.workCenterKey, branchKey: input.branchKey,
          },
        });
      }
    }
    const geofenceKey = input.geofenceKey ?? generateTaKey('GEO', (await this.prisma.hcmTaGeofence.count({ where: { organizationId } })) + 1);
    const fence = await this.prisma.hcmTaGeofence.create({
      data: {
        organizationId, geofenceKey, name: input.name,
        latitude: input.latitude, longitude: input.longitude,
        radiusMeters: input.radiusMeters ?? 100,
        workCenterKey: input.workCenterKey, branchKey: input.branchKey,
      },
    });
    await this.audit.log(organizationId, 'HcmTaGeofence', geofenceKey, 'created', userId);
    return fence;
  }

  async validateLocation(organizationId: string, geofenceKey: string, latitude: number, longitude: number) {
    const fence = await this.prisma.hcmTaGeofence.findFirst({ where: { organizationId, geofenceKey, isActive: true } });
    if (!fence) throw new NotFoundException(`Geocerca ${geofenceKey} no encontrada`);
    return validateGeofence(latitude, longitude, { latitude: fence.latitude, longitude: fence.longitude, radiusMeters: fence.radiusMeters });
  }
}

@Injectable()
export class HcmTaAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly geofence: HcmTaGeofenceService,
  ) {}

  listPunches(organizationId: string, filters?: { employeeKey?: string; workDate?: string; from?: string; to?: string }) {
    return this.prisma.hcmTaTimePunch.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.workDate ? { workDate: new Date(filters.workDate) } : {}),
        ...(filters?.from || filters?.to ? {
          workDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        } : {}),
      },
      orderBy: [{ workDate: 'desc' }, { punchedAt: 'asc' }],
    });
  }

  async punch(organizationId: string, userId: string, input: {
    employeeKey: string; punchType: HcmTaPunchType; punchSource: HcmTaPunchSource;
    punchedAt?: string; latitude?: number; longitude?: number; geofenceKey?: string;
    qrToken?: string; deviceId?: string; isManual?: boolean; justification?: string;
    offlineBatchKey?: string;
  }) {
    const punchedAt = input.punchedAt ? new Date(input.punchedAt) : new Date();
    const workDate = new Date(punchedAt);
    workDate.setHours(0, 0, 0, 0);

    const dayPunches = await this.prisma.hcmTaTimePunch.findMany({
      where: { organizationId, employeeKey: input.employeeKey, workDate },
      orderBy: { punchedAt: 'asc' },
    });
    const seqCheck = validatePunchSequence(dayPunches.map((p) => p.punchType), input.punchType);
    if (!seqCheck.valid && !input.isManual) throw new BadRequestException(seqCheck.reason);

    let locationValid: boolean | undefined;
    if (input.latitude != null && input.longitude != null && input.geofenceKey) {
      const check = await this.geofence.validateLocation(organizationId, input.geofenceKey, input.latitude, input.longitude);
      locationValid = check.valid;
      if (!check.valid && input.punchSource === 'android' && !input.isManual) {
        throw new BadRequestException(`Ubicación fuera de geocerca (${check.distanceMeters}m)`);
      }
    }

    let minutesLate: number | undefined;
    const assignment = await this.prisma.hcmTaShiftAssignment.findFirst({
      where: { organizationId, employeeKey: input.employeeKey, isActive: true },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (input.punchType === 'clock_in' && assignment?.shift) {
      minutesLate = computeMinutesLate(punchedAt, {
        startTime: assignment.shift.startTime,
        endTime: assignment.shift.endTime,
        graceMinutes: assignment.shift.graceMinutes,
      }, workDate);
    }

    const punchKey = generateTaKey('PCH', (await this.prisma.hcmTaTimePunch.count({ where: { organizationId } })) + 1);
    const punch = await this.prisma.hcmTaTimePunch.create({
      data: {
        organizationId, punchKey, employeeKey: input.employeeKey,
        punchType: input.punchType, punchSource: input.punchSource,
        punchedAt, workDate, latitude: input.latitude, longitude: input.longitude,
        geofenceKey: input.geofenceKey, locationValid, qrToken: input.qrToken,
        deviceId: input.deviceId, isManual: input.isManual ?? false,
        justification: input.justification, minutesLate,
        offlineBatchKey: input.offlineBatchKey, createdBy: userId,
        status: input.isManual ? 'pending' : 'valid',
      },
    });

    if (minutesLate && minutesLate > 0) {
      await this.prisma.hcmTaAbsenceRecord.create({
        data: {
          organizationId,
          absenceKey: generateTaKey('ABS', Date.now() % 100000),
          employeeKey: input.employeeKey,
          absenceType: 'tardiness',
          workDate,
          minutes: minutesLate,
          notes: 'Retardo automático por marcación',
        },
      });
    }

    await this.audit.log(organizationId, 'HcmTaTimePunch', punchKey, 'recorded', userId, {
      punchType: input.punchType, locationValid, minutesLate,
    });
    await this.core.emitUserAction(organizationId, 'HcmTaTimePunch', punchKey, EVENT_TYPES.HCM_TA_PUNCH_RECORDED, {
      employeeKey: input.employeeKey, punchType: input.punchType,
    });
    return punch;
  }

  async syncOffline(organizationId: string, userId: string, input: {
    employeeKey: string; deviceId?: string;
    punches: Array<{ punchType: HcmTaPunchType; punchedAt: string; latitude?: number; longitude?: number; geofenceKey?: string }>;
  }) {
    const batchKey = generateTaKey('BAT', (await this.prisma.hcmTaOfflineSyncBatch.count({ where: { organizationId } })) + 1);
    const deduped = mergeConcurrentPunches(input.punches.map((p, i) => ({ punchKey: `off-${i}`, punchedAt: p.punchedAt })));
    const results = [];

    for (const row of input.punches) {
      const validation = validateOfflinePunchRow({ employeeKey: input.employeeKey, punchType: row.punchType, punchedAt: row.punchedAt }, results.length + 1);
      if (!validation.valid) {
        results.push({ ...validation, synced: false });
        continue;
      }
      try {
        const punch = await this.punch(organizationId, userId, {
          ...row,
          employeeKey: input.employeeKey,
          punchSource: 'android',
          deviceId: input.deviceId,
          offlineBatchKey: batchKey,
        });
        results.push({ synced: true, punchKey: punch.punchKey });
      } catch (err) {
        results.push({ synced: false, error: (err as Error).message });
      }
    }

    await this.prisma.hcmTaOfflineSyncBatch.create({
      data: {
        organizationId, batchKey, employeeKey: input.employeeKey,
        deviceId: input.deviceId, punchCount: results.filter((r) => r.synced).length,
        metadata: { total: input.punches.length, deduped: deduped.length },
      },
    });

    await this.audit.log(organizationId, 'HcmTaOfflineSyncBatch', batchKey, 'synced', userId);
    await this.core.emitUserAction(organizationId, 'HcmTaOfflineSyncBatch', batchKey, EVENT_TYPES.HCM_TA_OFFLINE_SYNCED, { count: results.length });
    return { batchKey, results };
  }

  async requestCorrection(organizationId: string, userId: string, input: {
    employeeKey: string; punchKey?: string; requestedPunchType: HcmTaPunchType;
    requestedAt: string; reason: string;
  }) {
    const correctionKey = generateTaKey('COR', (await this.prisma.hcmTaPunchCorrection.count({ where: { organizationId } })) + 1);
    const correction = await this.prisma.hcmTaPunchCorrection.create({
      data: {
        organizationId, correctionKey, punchKey: input.punchKey, employeeKey: input.employeeKey,
        requestedPunchType: input.requestedPunchType, requestedAt: new Date(input.requestedAt),
        reason: input.reason, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTaPunchCorrection', correctionKey, 'requested', userId);
    await this.core.emitUserAction(organizationId, 'HcmTaPunchCorrection', correctionKey, EVENT_TYPES.HCM_TA_CORRECTION_REQUESTED, input);
    return correction;
  }

  async decideCorrection(organizationId: string, correctionKey: string, userId: string, approved: boolean, reviewNotes?: string) {
    const correction = await this.prisma.hcmTaPunchCorrection.findFirst({ where: { organizationId, correctionKey } });
    if (!correction) throw new NotFoundException(`Corrección ${correctionKey} no encontrada`);
    if (correction.status !== 'pending') throw new BadRequestException('Corrección ya decidida');

    const status: HcmTaCorrectionStatus = approved ? 'approved' : 'rejected';
    await this.prisma.hcmTaPunchCorrection.update({
      where: { id: correction.id },
      data: { status, reviewedBy: userId, reviewedAt: new Date(), reviewNotes },
    });

    if (approved) {
      await this.punch(organizationId, userId, {
        employeeKey: correction.employeeKey,
        punchType: correction.requestedPunchType,
        punchSource: 'manual',
        punchedAt: correction.requestedAt.toISOString(),
        isManual: true,
        justification: correction.reason,
      });
      if (correction.punchKey) {
        await this.prisma.hcmTaTimePunch.updateMany({
          where: { organizationId, punchKey: correction.punchKey },
          data: { status: 'corrected' },
        });
      }
    }

    await this.audit.log(organizationId, 'HcmTaPunchCorrection', correctionKey, status, userId);
    await this.core.emitUserAction(organizationId, 'HcmTaPunchCorrection', correctionKey, EVENT_TYPES.HCM_TA_CORRECTION_DECIDED, { approved });
    return this.prisma.hcmTaPunchCorrection.findFirst({ where: { organizationId, correctionKey } });
  }

  listCorrections(organizationId: string, status?: HcmTaCorrectionStatus) {
    return this.prisma.hcmTaPunchCorrection.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async daySummary(organizationId: string, employeeKey: string, workDate: string) {
    const punches = await this.listPunches(organizationId, { employeeKey, workDate });
    const assignment = await this.prisma.hcmTaShiftAssignment.findFirst({
      where: { organizationId, employeeKey, isActive: true },
      include: { schedule: true },
    });
    const scheduledMinutes = (assignment?.schedule?.dailyHours ?? 8) * 60;
    return summarizeWorkDay(workDate, punches.map((p) => ({
      punchType: p.punchType,
      punchedAt: p.punchedAt,
      minutesLate: p.minutesLate,
    })), scheduledMinutes);
  }

  listAbsences(organizationId: string, filters?: { employeeKey?: string; from?: string; to?: string }) {
    return this.prisma.hcmTaAbsenceRecord.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.from || filters?.to ? {
          workDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        } : {}),
      },
      orderBy: { workDate: 'desc' },
    });
  }
}
