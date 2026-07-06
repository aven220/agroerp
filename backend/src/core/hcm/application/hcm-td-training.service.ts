import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  computeAttendancePct,
  DEFAULT_TD_COURSES,
  generateTdKey,
} from '../domain/hcm-talent-development.engine';
import type {
  HcmTdCourseOrigin, HcmTdCourseType, HcmTdEnrollmentStatus,
  HcmTdModality, HcmTdCertificationStatus, HcmTdReminderType,
} from '@prisma/client';

@Injectable()
export class HcmTdTrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listCourses(organizationId: string) {
    return this.prisma.hcmTdCourse.findMany({ where: { organizationId }, orderBy: { title: 'asc' } });
  }

  listPlans(organizationId: string) {
    return this.prisma.hcmTdTrainingPlan.findMany({
      where: { organizationId },
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listEnrollments(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmTdEnrollment.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      include: { course: true, schedule: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listSchedules(organizationId: string, courseKey?: string) {
    return this.prisma.hcmTdCourseSchedule.findMany({
      where: { organizationId, ...(courseKey ? { courseKey } : {}) },
      include: { course: true },
      orderBy: { startAt: 'asc' },
    });
  }

  listCertifications(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmTdCertification.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      orderBy: { expiresAt: 'asc' },
    });
  }

  listReminders(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmTdReminder.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}), isSent: false },
      orderBy: { dueAt: 'asc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const [i, c] of DEFAULT_TD_COURSES.entries()) {
      await this.prisma.hcmTdCourse.create({
        data: {
          organizationId,
          courseKey: generateTdKey('CRS', i + 1),
          code: c.code,
          title: c.title,
          courseType: c.courseType as HcmTdCourseType,
          courseOrigin: c.courseOrigin as HcmTdCourseOrigin,
          modality: c.modality as HcmTdModality,
          durationHours: c.durationHours,
        },
      });
    }
    const courseKeys = (await this.prisma.hcmTdCourse.findMany({ where: { organizationId }, select: { courseKey: true } }))
      .map((c) => c.courseKey);
    await this.prisma.hcmTdTrainingPlan.create({
      data: {
        organizationId,
        planKey: generateTdKey('PLN', 1),
        name: 'Plan de formación anual',
        year: new Date().getFullYear(),
        courseKeys,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCourse', 'defaults', 'seeded', userId);
  }

  async upsertCourse(organizationId: string, userId: string, input: {
    courseKey?: string; code: string; title: string; description?: string;
    courseType: HcmTdCourseType; courseOrigin: HcmTdCourseOrigin; modality: HcmTdModality;
    durationHours?: number; competencyKeys?: string[];
  }) {
    if (input.courseKey) {
      const existing = await this.prisma.hcmTdCourse.findFirst({ where: { organizationId, courseKey: input.courseKey } });
      if (existing) {
        return this.prisma.hcmTdCourse.update({
          where: { id: existing.id },
          data: { title: input.title, description: input.description, durationHours: input.durationHours, competencyKeys: input.competencyKeys ?? [] },
        });
      }
    }
    const courseKey = input.courseKey ?? generateTdKey('CRS', (await this.prisma.hcmTdCourse.count({ where: { organizationId } })) + 1);
    const course = await this.prisma.hcmTdCourse.create({
      data: {
        organizationId, courseKey, code: input.code, title: input.title,
        description: input.description, courseType: input.courseType,
        courseOrigin: input.courseOrigin, modality: input.modality,
        durationHours: input.durationHours ?? 0, competencyKeys: input.competencyKeys ?? [],
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCourse', courseKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdCourse', courseKey, EVENT_TYPES.HCM_TD_COURSE_CREATED, input);
    return course;
  }

  async createSchedule(organizationId: string, userId: string, input: {
    courseKey: string; startAt: string; endAt: string; modality: HcmTdModality;
    location?: string; instructor?: string; capacity?: number;
  }) {
    const scheduleKey = generateTdKey('SCH', (await this.prisma.hcmTdCourseSchedule.count({ where: { organizationId } })) + 1);
    const schedule = await this.prisma.hcmTdCourseSchedule.create({
      data: {
        organizationId, scheduleKey, courseKey: input.courseKey,
        startAt: new Date(input.startAt), endAt: new Date(input.endAt),
        modality: input.modality, location: input.location,
        instructor: input.instructor, capacity: input.capacity,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCourseSchedule', scheduleKey, 'created', userId);
    return schedule;
  }

  async enroll(organizationId: string, userId: string, input: {
    courseKey: string; employeeKey: string; scheduleKey?: string;
  }) {
    const enrollmentKey = generateTdKey('ENR', (await this.prisma.hcmTdEnrollment.count({ where: { organizationId } })) + 1);
    const enrollment = await this.prisma.hcmTdEnrollment.create({
      data: {
        organizationId, enrollmentKey, courseKey: input.courseKey,
        scheduleKey: input.scheduleKey, employeeKey: input.employeeKey,
        status: 'enrolled', createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTdEnrollment', enrollmentKey, 'enrolled', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdEnrollment', enrollmentKey, EVENT_TYPES.HCM_TD_ENROLLMENT_CREATED, input);
    return enrollment;
  }

  async recordAttendance(organizationId: string, enrollmentKey: string, userId: string, attended: boolean, sessionsTotal = 1, sessionsAttended = 1) {
    const enrollment = await this.prisma.hcmTdEnrollment.findFirst({ where: { organizationId, enrollmentKey } });
    if (!enrollment) throw new NotFoundException('Inscripción no encontrada');
    const pct = computeAttendancePct(sessionsAttended, sessionsTotal);
    const updated = await this.prisma.hcmTdEnrollment.update({
      where: { id: enrollment.id },
      data: {
        attended: attended || pct >= 80,
        attendancePct: pct,
        status: pct >= 80 ? 'completed' : 'in_progress',
        completedAt: pct >= 80 ? new Date() : null,
      },
    });
    await this.audit.log(organizationId, 'HcmTdEnrollment', enrollmentKey, 'attendance', userId, { attendancePct: pct });
    return updated;
  }

  async assignPlan(organizationId: string, userId: string, input: {
    planKey: string; employeeKey: string; dueDate?: string;
  }) {
    const assignmentKey = generateTdKey('ASN', (await this.prisma.hcmTdPlanAssignment.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmTdPlanAssignment.create({
      data: {
        organizationId, assignmentKey, planKey: input.planKey,
        employeeKey: input.employeeKey,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });
  }

  async upsertCertification(organizationId: string, userId: string, input: {
    certificationKey?: string; employeeKey: string; name: string;
    issuer?: string; licenseNumber?: string; issuedAt: string;
    expiresAt?: string; renewalDays?: number; courseKey?: string;
  }) {
    const certificationKey = input.certificationKey ?? generateTdKey('CRT', (await this.prisma.hcmTdCertification.count({ where: { organizationId } })) + 1);
    if (input.certificationKey) {
      const existing = await this.prisma.hcmTdCertification.findFirst({ where: { organizationId, certificationKey } });
      if (existing) {
        return this.prisma.hcmTdCertification.update({
          where: { id: existing.id },
          data: {
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            status: input.expiresAt && new Date(input.expiresAt) < new Date() ? 'expired' : 'active',
          },
        });
      }
    }
    const cert = await this.prisma.hcmTdCertification.create({
      data: {
        organizationId, certificationKey, employeeKey: input.employeeKey,
        name: input.name, issuer: input.issuer, licenseNumber: input.licenseNumber,
        issuedAt: new Date(input.issuedAt),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        renewalDays: input.renewalDays ?? 30, courseKey: input.courseKey,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCertification', certificationKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdCertification', certificationKey, EVENT_TYPES.HCM_TD_CERTIFICATION_CREATED, input);
    return cert;
  }

  async renewCertification(organizationId: string, certificationKey: string, userId: string, newExpiresAt: string) {
    const cert = await this.prisma.hcmTdCertification.findFirst({ where: { organizationId, certificationKey } });
    if (!cert) throw new NotFoundException('Certificación no encontrada');
    const updated = await this.prisma.hcmTdCertification.update({
      where: { id: cert.id },
      data: { expiresAt: new Date(newExpiresAt), status: 'active' as HcmTdCertificationStatus },
    });
    await this.audit.log(organizationId, 'HcmTdCertification', certificationKey, 'renewed', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdCertification', certificationKey, EVENT_TYPES.HCM_TD_CERTIFICATION_RENEWED, { newExpiresAt });
    return updated;
  }

  async createReminder(organizationId: string, input: {
    employeeKey: string; reminderType: HcmTdReminderType; referenceKey: string;
    title: string; dueAt: string;
  }) {
    const reminderKey = generateTdKey('REM', (await this.prisma.hcmTdReminder.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmTdReminder.create({
      data: {
        organizationId, reminderKey, employeeKey: input.employeeKey,
        reminderType: input.reminderType, referenceKey: input.referenceKey,
        title: input.title, dueAt: new Date(input.dueAt),
      },
    });
  }
}
