import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { examIsOverdue, examNeedsAlert, fitnessFromRestrictions, generateSsKey } from '../domain/hcm-sst.engine';
import type { HcmSsExamStatus, HcmSsExamType, HcmSsFitnessStatus, HcmSsRestrictionStatus } from '@prisma/client';

@Injectable()
export class HcmSsHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listExams(organizationId: string, filters?: { employeeKey?: string; examType?: HcmSsExamType; status?: HcmSsExamStatus }) {
    return this.prisma.hcmSsMedicalExam.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.examType ? { examType: filters.examType } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { restrictions: true, followUps: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  listRestrictions(organizationId: string, employeeKey?: string, status?: HcmSsRestrictionStatus) {
    return this.prisma.hcmSsMedicalRestriction.findMany({
      where: {
        organizationId,
        ...(employeeKey ? { employeeKey } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  listFollowUps(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmSsMedicalFollowUp.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      orderBy: { dueAt: 'asc' },
    });
  }

  async scheduleExam(organizationId: string, userId: string, input: {
    employeeKey: string; examType: HcmSsExamType; scheduledAt: string;
    provider?: string; physician?: string; nextDueAt?: string;
  }) {
    const examKey = generateSsKey('EXM', (await this.prisma.hcmSsMedicalExam.count({ where: { organizationId } })) + 1);
    const exam = await this.prisma.hcmSsMedicalExam.create({
      data: {
        organizationId, examKey, employeeKey: input.employeeKey,
        examType: input.examType, status: 'scheduled',
        scheduledAt: new Date(input.scheduledAt),
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
        provider: input.provider, physician: input.physician,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsMedicalExam', examKey, 'scheduled', userId, { examType: input.examType });
    await this.core.emitUserAction(organizationId, 'HcmSsMedicalExam', examKey, EVENT_TYPES.HCM_SS_EXAM_SCHEDULED, input);
    return exam;
  }

  async completeExam(organizationId: string, examKey: string, userId: string, input: {
    fitnessStatus: HcmSsFitnessStatus; findings?: string; recommendations?: string;
    completedAt?: string; nextDueAt?: string; documentKey?: string;
    restrictions?: Array<{ description: string; startDate: string; endDate?: string; workLimitations?: string }>;
  }) {
    const exam = await this.getExam(organizationId, examKey);
    if (exam.status === 'cancelled') throw new BadRequestException('Examen cancelado');

    const updated = await this.prisma.hcmSsMedicalExam.update({
      where: { id: exam.id },
      data: {
        status: 'completed',
        fitnessStatus: input.fitnessStatus,
        findings: input.findings,
        recommendations: input.recommendations,
        completedAt: input.completedAt ? new Date(input.completedAt) : new Date(),
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : exam.nextDueAt,
        documentKey: input.documentKey,
      },
    });

    if (input.restrictions?.length) {
      for (const [i, r] of input.restrictions.entries()) {
        await this.prisma.hcmSsMedicalRestriction.create({
          data: {
            organizationId,
            restrictionKey: generateSsKey('RST', Date.now() % 100000 + i),
            employeeKey: exam.employeeKey,
            examKey,
            description: r.description,
            startDate: new Date(r.startDate),
            endDate: r.endDate ? new Date(r.endDate) : null,
            workLimitations: r.workLimitations,
            createdBy: userId,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'HcmSsMedicalExam', examKey, 'completed', userId, { fitnessStatus: input.fitnessStatus });
    await this.core.emitUserAction(organizationId, 'HcmSsMedicalExam', examKey, EVENT_TYPES.HCM_SS_EXAM_COMPLETED, input);
    return updated;
  }

  async addRestriction(organizationId: string, userId: string, input: {
    employeeKey: string; examKey?: string; description: string;
    startDate: string; endDate?: string; workLimitations?: string;
  }) {
    const restrictionKey = generateSsKey('RST', (await this.prisma.hcmSsMedicalRestriction.count({ where: { organizationId } })) + 1);
    const restriction = await this.prisma.hcmSsMedicalRestriction.create({
      data: {
        organizationId, restrictionKey, employeeKey: input.employeeKey,
        examKey: input.examKey, description: input.description,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        workLimitations: input.workLimitations, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsMedicalRestriction', restrictionKey, 'created', userId);
    return restriction;
  }

  async liftRestriction(organizationId: string, restrictionKey: string, userId: string) {
    const restriction = await this.prisma.hcmSsMedicalRestriction.findFirst({ where: { organizationId, restrictionKey } });
    if (!restriction) throw new NotFoundException('Restricción no encontrada');
    const updated = await this.prisma.hcmSsMedicalRestriction.update({
      where: { id: restriction.id },
      data: { status: 'lifted', endDate: new Date() },
    });
    await this.audit.log(organizationId, 'HcmSsMedicalRestriction', restrictionKey, 'lifted', userId);
    return updated;
  }

  async createFollowUp(organizationId: string, userId: string, input: {
    employeeKey: string; examKey?: string; dueAt: string; notes?: string;
  }) {
    const followUpKey = generateSsKey('FUP', (await this.prisma.hcmSsMedicalFollowUp.count({ where: { organizationId } })) + 1);
    const followUp = await this.prisma.hcmSsMedicalFollowUp.create({
      data: {
        organizationId, followUpKey, employeeKey: input.employeeKey,
        examKey: input.examKey, dueAt: new Date(input.dueAt), notes: input.notes, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsMedicalFollowUp', followUpKey, 'created', userId);
    return followUp;
  }

  async completeFollowUp(organizationId: string, followUpKey: string, userId: string, notes?: string) {
    const followUp = await this.prisma.hcmSsMedicalFollowUp.findFirst({ where: { organizationId, followUpKey } });
    if (!followUp) throw new NotFoundException('Seguimiento no encontrado');
    const updated = await this.prisma.hcmSsMedicalFollowUp.update({
      where: { id: followUp.id },
      data: { isCompleted: true, completedAt: new Date(), notes: notes ?? followUp.notes },
    });
    await this.audit.log(organizationId, 'HcmSsMedicalFollowUp', followUpKey, 'completed', userId);
    return updated;
  }

  async employeeFitness(organizationId: string, employeeKey: string) {
    const [latestExam, activeRestrictions] = await Promise.all([
      this.prisma.hcmSsMedicalExam.findFirst({
        where: { organizationId, employeeKey, status: 'completed' },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.hcmSsMedicalRestriction.findMany({
        where: { organizationId, employeeKey, status: 'active' },
      }),
    ]);
    const fitnessStatus = fitnessFromRestrictions(
      activeRestrictions.length > 0,
      latestExam?.fitnessStatus === 'unfit' || latestExam?.fitnessStatus === 'temporarily_unfit',
    );
    return { employeeKey, fitnessStatus, latestExam, activeRestrictions };
  }

  async processExpiryAlerts(organizationId: string, userId: string) {
    const exams = await this.prisma.hcmSsMedicalExam.findMany({
      where: { organizationId, status: { in: ['scheduled', 'completed'] }, nextDueAt: { not: null } },
    });
    let overdue = 0;
    let alerts = 0;
    for (const exam of exams) {
      if (examIsOverdue(exam.nextDueAt)) {
        await this.prisma.hcmSsMedicalExam.update({ where: { id: exam.id }, data: { status: 'overdue' } });
        overdue++;
      } else if (examNeedsAlert(exam.nextDueAt)) {
        alerts++;
      }
    }
    await this.audit.log(organizationId, 'HcmSsMedicalExam', 'alerts', 'processed', userId, { overdue, alerts });
    return { processed: exams.length, overdue, alerts };
  }

  private async getExam(organizationId: string, examKey: string) {
    const exam = await this.prisma.hcmSsMedicalExam.findFirst({ where: { organizationId, examKey } });
    if (!exam) throw new NotFoundException(`Examen ${examKey} no encontrado`);
    return exam;
  }
}
