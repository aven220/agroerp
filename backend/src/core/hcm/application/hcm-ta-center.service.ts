import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmTaShiftService } from './hcm-ta-shift.service';
import { HcmTaScheduleService } from './hcm-ta-schedule.service';
import { HcmTaAttendanceService } from './hcm-ta-attendance.service';
import { HcmTaNoveltyService } from './hcm-ta-novelty.service';

@Injectable()
export class HcmTaCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly shifts: HcmTaShiftService,
    private readonly schedules: HcmTaScheduleService,
    private readonly attendance: HcmTaAttendanceService,
    private readonly novelties: HcmTaNoveltyService,
  ) {}

  async center(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      shiftCount, scheduleCount, punchCountToday, pendingCorrections,
      pendingNovelties, pendingSwaps, absenceCount, geofenceCount,
    ] = await Promise.all([
      this.prisma.hcmTaShift.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTaWorkSchedule.count({ where: { organizationId, isActive: true } }),
      this.prisma.hcmTaTimePunch.count({ where: { organizationId, workDate: today } }),
      this.prisma.hcmTaPunchCorrection.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.hcmTaTimeNovelty.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.hcmTaShiftSwap.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.hcmTaAbsenceRecord.count({ where: { organizationId, workDate: today } }),
      this.prisma.hcmTaGeofence.count({ where: { organizationId, isActive: true } }),
    ]);

    const recentPunches = await this.prisma.hcmTaTimePunch.findMany({
      where: { organizationId },
      orderBy: { punchedAt: 'desc' },
      take: 10,
    });

    return {
      shiftCount, scheduleCount, punchCountToday, pendingCorrections,
      pendingNovelties, pendingSwaps, absenceCount, geofenceCount, recentPunches,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmTaShift.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    await this.shifts.seedDefaults(organizationId, userId);
    await this.schedules.seedDefaults(organizationId, userId);

    const calendar = await this.shifts.createCalendar(organizationId, userId, {
      name: 'Calendario laboral Colombia',
      year: new Date().getFullYear(),
      companyKey: 'CO-MAIN',
      isDefault: true,
    });

    await this.shifts.addHoliday(organizationId, userId, {
      calendarKey: calendar.calendarKey,
      name: 'Año Nuevo',
      holidayDate: `${new Date().getFullYear()}-01-01`,
    });

    const dayShift = await this.prisma.hcmTaShift.findFirst({ where: { organizationId, code: 'DAY' } });
    const emp = await this.prisma.hcmEmployee.findFirst({ where: { organizationId, employmentStatus: 'active' } });
    if (dayShift && emp) {
      await this.shifts.assignShift(organizationId, userId, {
        employeeKey: emp.employeeKey,
        shiftKey: dayShift.shiftKey,
        scheduleKey: 'STD-48',
        calendarKey: calendar.calendarKey,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        workMode: 'onsite',
      });
    }

    await this.audit.log(organizationId, 'HcmTaConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }

  async dashboard(organizationId: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = to ? new Date(to) : new Date();
    const punches = await this.prisma.hcmTaTimePunch.groupBy({
      by: ['workDate'],
      where: { organizationId, workDate: { gte: start, lte: end } },
      _count: { id: true },
    });
    const absences = await this.prisma.hcmTaAbsenceRecord.groupBy({
      by: ['absenceType'],
      where: { organizationId, workDate: { gte: start, lte: end } },
      _count: { id: true },
    });
    const novelties = await this.prisma.hcmTaTimeNovelty.groupBy({
      by: ['noveltyType', 'status'],
      where: { organizationId, startDate: { gte: start, lte: end } },
      _count: { id: true },
    });
    return { punches, absences, novelties, from: start, to: end };
  }

  async mobileSync(organizationId: string, employeeKey?: string) {
    const [center, shifts, assignments, punches, novelties, geofences] = await Promise.all([
      this.center(organizationId),
      this.shifts.listShifts(organizationId),
      this.shifts.listAssignments(organizationId, employeeKey),
      this.attendance.listPunches(organizationId, { employeeKey, from: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10) }),
      this.novelties.list(organizationId, { employeeKey }),
      this.prisma.hcmTaGeofence.findMany({ where: { organizationId, isActive: true } }),
    ]);
    return { center, shifts, assignments, punches, novelties, geofences, syncedAt: new Date().toISOString() };
  }
}
