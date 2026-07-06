import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmAuditService } from '../application/hcm-audit.service';
import { HcmTaCenterService } from '../application/hcm-ta-center.service';
import { HcmTaShiftService } from '../application/hcm-ta-shift.service';
import { HcmTaScheduleService } from '../application/hcm-ta-schedule.service';
import { HcmTaAttendanceService, HcmTaGeofenceService } from '../application/hcm-ta-attendance.service';
import { HcmTaNoveltyService } from '../application/hcm-ta-novelty.service';
import {
  HcmTaAssignmentDto, HcmTaCalendarDto, HcmTaCorrectionDecisionDto, HcmTaCorrectionDto,
  HcmTaGeofenceDto, HcmTaHolidayDto, HcmTaLocationValidateDto, HcmTaNoveltyDecisionDto,
  HcmTaNoveltyDto, HcmTaOfflineSyncDto, HcmTaPunchDto, HcmTaScheduleDto, HcmTaShiftDto,
  HcmTaSwapDecisionDto, HcmTaSwapDto,
} from './hcm-ta.dto';
import type { HcmTaCorrectionStatus, HcmTaNoveltyStatus, HcmTaNoveltyType, HcmTaPunchSource, HcmTaPunchType, HcmTaSwapStatus, HcmTaShiftType, HcmTaWorkMode } from '@prisma/client';

@ApiTags('HCM — Asistencia y Tiempo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/ta')
export class HcmTaController {
  constructor(
    private readonly center: HcmTaCenterService,
    private readonly shifts: HcmTaShiftService,
    private readonly schedules: HcmTaScheduleService,
    private readonly attendance: HcmTaAttendanceService,
    private readonly geofence: HcmTaGeofenceService,
    private readonly novelties: HcmTaNoveltyService,
    private readonly auditService: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:ta_read')
  taCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('hcm:ta_read')
  dashboard(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.center.dashboard(user.organizationId, from, to);
  }

  @Post('seed')
  @RequirePermissions('hcm:ta_config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:ta_read')
  mobileSync(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.center.mobileSync(user.organizationId, employeeKey);
  }

  @Get('shifts')
  @RequirePermissions('hcm:ta_read')
  listShifts(@CurrentUser() user: { organizationId: string }) {
    return this.shifts.listShifts(user.organizationId);
  }

  @Post('shifts')
  @RequirePermissions('hcm:ta_shift')
  upsertShift(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaShiftDto) {
    return this.shifts.upsertShift(user.organizationId, user.id, { ...dto, shiftType: dto.shiftType as HcmTaShiftType });
  }

  @Get('schedules')
  @RequirePermissions('hcm:ta_read')
  listSchedules(@CurrentUser() user: { organizationId: string }) {
    return this.schedules.list(user.organizationId);
  }

  @Post('schedules')
  @RequirePermissions('hcm:ta_schedule')
  upsertSchedule(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaScheduleDto) {
    return this.schedules.upsert(user.organizationId, user.id, { ...dto, workMode: dto.workMode as HcmTaWorkMode });
  }

  @Get('calendars')
  @RequirePermissions('hcm:ta_read')
  listCalendars(@CurrentUser() user: { organizationId: string }) {
    return this.shifts.listCalendars(user.organizationId);
  }

  @Post('calendars')
  @RequirePermissions('hcm:ta_shift')
  createCalendar(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaCalendarDto) {
    return this.shifts.createCalendar(user.organizationId, user.id, dto);
  }

  @Post('holidays')
  @RequirePermissions('hcm:ta_shift')
  addHoliday(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaHolidayDto) {
    return this.shifts.addHoliday(user.organizationId, user.id, dto);
  }

  @Get('assignments')
  @RequirePermissions('hcm:ta_read')
  listAssignments(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.shifts.listAssignments(user.organizationId, employeeKey);
  }

  @Post('assignments')
  @RequirePermissions('hcm:ta_shift')
  assignShift(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaAssignmentDto) {
    return this.shifts.assignShift(user.organizationId, user.id, { ...dto, workMode: dto.workMode as HcmTaWorkMode | undefined });
  }

  @Get('swaps')
  @RequirePermissions('hcm:ta_read')
  listSwaps(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmTaSwapStatus,
  ) {
    return this.shifts.listSwaps(user.organizationId, status);
  }

  @Post('swaps')
  @RequirePermissions('hcm:ta_shift')
  requestSwap(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaSwapDto) {
    return this.shifts.requestSwap(user.organizationId, user.id, dto);
  }

  @Post('swaps/:swapKey/decide')
  @RequirePermissions('hcm:ta_approve')
  decideSwap(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('swapKey') swapKey: string,
    @Body() dto: HcmTaSwapDecisionDto,
  ) {
    return this.shifts.decideSwap(user.organizationId, swapKey, user.id, dto.approved);
  }

  @Get('geofences')
  @RequirePermissions('hcm:ta_read')
  listGeofences(@CurrentUser() user: { organizationId: string }) {
    return this.geofence.list(user.organizationId);
  }

  @Post('geofences')
  @RequirePermissions('hcm:ta_config')
  upsertGeofence(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaGeofenceDto) {
    return this.geofence.upsert(user.organizationId, user.id, dto);
  }

  @Post('geofences/:geofenceKey/validate')
  @RequirePermissions('hcm:ta_read')
  validateLocation(
    @CurrentUser() user: { organizationId: string },
    @Param('geofenceKey') geofenceKey: string,
    @Body() dto: HcmTaLocationValidateDto,
  ) {
    return this.geofence.validateLocation(user.organizationId, geofenceKey, dto.latitude, dto.longitude);
  }

  @Get('punches')
  @RequirePermissions('hcm:ta_read')
  listPunches(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('workDate') workDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.listPunches(user.organizationId, { employeeKey, workDate, from, to });
  }

  @Post('punches')
  @RequirePermissions('hcm:ta_punch')
  punch(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaPunchDto) {
    return this.attendance.punch(user.organizationId, user.id, {
      ...dto,
      punchType: dto.punchType as HcmTaPunchType,
      punchSource: dto.punchSource as HcmTaPunchSource,
    });
  }

  @Post('punches/offline-sync')
  @RequirePermissions('hcm:ta_punch')
  offlineSync(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaOfflineSyncDto) {
    return this.attendance.syncOffline(user.organizationId, user.id, {
      employeeKey: dto.employeeKey,
      deviceId: dto.deviceId,
      punches: dto.punches.map((p) => ({ ...p, punchType: p.punchType as HcmTaPunchType })),
    });
  }

  @Get('punches/summary')
  @RequirePermissions('hcm:ta_read')
  daySummary(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey: string,
    @Query('workDate') workDate: string,
  ) {
    return this.attendance.daySummary(user.organizationId, employeeKey, workDate);
  }

  @Get('corrections')
  @RequirePermissions('hcm:ta_read')
  listCorrections(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmTaCorrectionStatus,
  ) {
    return this.attendance.listCorrections(user.organizationId, status);
  }

  @Post('corrections')
  @RequirePermissions('hcm:ta_punch')
  requestCorrection(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaCorrectionDto) {
    return this.attendance.requestCorrection(user.organizationId, user.id, {
      ...dto,
      requestedPunchType: dto.requestedPunchType as HcmTaPunchType,
    });
  }

  @Post('corrections/:correctionKey/decide')
  @RequirePermissions('hcm:ta_approve')
  decideCorrection(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('correctionKey') correctionKey: string,
    @Body() dto: HcmTaCorrectionDecisionDto,
  ) {
    return this.attendance.decideCorrection(user.organizationId, correctionKey, user.id, dto.approved, dto.reviewNotes);
  }

  @Get('absences')
  @RequirePermissions('hcm:ta_read')
  listAbsences(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.listAbsences(user.organizationId, { employeeKey, from, to });
  }

  @Get('novelties')
  @RequirePermissions('hcm:ta_read')
  listNovelties(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('status') status?: HcmTaNoveltyStatus,
    @Query('noveltyType') noveltyType?: HcmTaNoveltyType,
  ) {
    return this.novelties.list(user.organizationId, { employeeKey, status, noveltyType });
  }

  @Post('novelties')
  @RequirePermissions('hcm:ta_novelty')
  createNovelty(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmTaNoveltyDto) {
    return this.novelties.create(user.organizationId, user.id, {
      ...dto,
      noveltyType: dto.noveltyType as HcmTaNoveltyType,
    });
  }

  @Post('novelties/:noveltyKey/submit')
  @RequirePermissions('hcm:ta_novelty')
  submitNovelty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('noveltyKey') noveltyKey: string,
  ) {
    return this.novelties.submit(user.organizationId, noveltyKey, user.id);
  }

  @Post('novelties/:noveltyKey/decide')
  @RequirePermissions('hcm:ta_approve')
  decideNovelty(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('noveltyKey') noveltyKey: string,
    @Body() dto: HcmTaNoveltyDecisionDto,
  ) {
    return this.novelties.decide(user.organizationId, noveltyKey, user.id, dto.approved, dto.payrollPeriod);
  }

  @Get('payroll-export')
  @RequirePermissions('hcm:ta_admin')
  payrollExport(
    @CurrentUser() user: { organizationId: string },
    @Query('payrollPeriod') payrollPeriod: string,
  ) {
    return this.novelties.payrollExport(user.organizationId, payrollPeriod);
  }

  @Get('audit')
  @RequirePermissions('hcm:ta_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.auditService.findAll(user.organizationId, 'HcmTa');
  }
}
