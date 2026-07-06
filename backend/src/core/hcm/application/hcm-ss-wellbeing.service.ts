import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { generateSsKey, surveyAverageScore, wellbeingParticipationRate } from '../domain/hcm-sst.engine';
import type { HcmSsWellbeingType } from '@prisma/client';

@Injectable()
export class HcmSsWellbeingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listPrograms(organizationId: string) {
    return this.prisma.hcmSsWellbeingProgram.findMany({
      where: { organizationId },
      include: { activities: true, surveys: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listActivities(organizationId: string, programKey?: string) {
    return this.prisma.hcmSsWellbeingActivity.findMany({
      where: { organizationId, ...(programKey ? { programKey } : {}) },
      include: { participations: true, program: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    const programKey = generateSsKey('WBP', 1);
    await this.prisma.hcmSsWellbeingProgram.create({
      data: {
        organizationId, programKey, name: 'Programa de bienestar laboral',
        programType: 'program', description: 'Actividades de salud y bienestar',
        startDate: new Date(), isActive: true, createdBy: userId,
      },
    });
    await this.prisma.hcmSsWellbeingActivity.create({
      data: {
        organizationId, activityKey: generateSsKey('WBA', 1), programKey,
        title: 'Jornada de pausas activas', scheduledAt: new Date(Date.now() + 7 * 86400000),
        location: 'Sede principal', capacity: 50, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsWellbeingProgram', programKey, 'seeded', userId);
  }

  async createProgram(organizationId: string, userId: string, input: {
    name: string; programType: HcmSsWellbeingType; description?: string;
    startDate?: string; endDate?: string;
  }) {
    const programKey = generateSsKey('WBP', (await this.prisma.hcmSsWellbeingProgram.count({ where: { organizationId } })) + 1);
    const program = await this.prisma.hcmSsWellbeingProgram.create({
      data: {
        organizationId, programKey, name: input.name, programType: input.programType,
        description: input.description,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsWellbeingProgram', programKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsWellbeingProgram', programKey, EVENT_TYPES.HCM_SS_WELLBEING_CREATED, input);
    return program;
  }

  async createActivity(organizationId: string, userId: string, input: {
    programKey: string; title: string; description?: string; scheduledAt: string;
    location?: string; capacity?: number;
  }) {
    const activityKey = generateSsKey('WBA', (await this.prisma.hcmSsWellbeingActivity.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsWellbeingActivity.create({
      data: {
        organizationId, activityKey, programKey: input.programKey, title: input.title,
        description: input.description, scheduledAt: new Date(input.scheduledAt),
        location: input.location, capacity: input.capacity, createdBy: userId,
      },
    });
  }

  async registerParticipation(organizationId: string, input: {
    activityKey: string; employeeKey: string; attended?: boolean; feedbackScore?: number; notes?: string;
  }) {
    const participationKey = generateSsKey('WPP', (await this.prisma.hcmSsWellbeingParticipation.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsWellbeingParticipation.create({
      data: {
        organizationId, participationKey, activityKey: input.activityKey,
        employeeKey: input.employeeKey, attended: input.attended ?? false,
        feedbackScore: input.feedbackScore, notes: input.notes,
      },
    });
  }

  async createSurvey(organizationId: string, userId: string, input: {
    title: string; programKey?: string; questions?: unknown[];
  }) {
    const surveyKey = generateSsKey('WBS', (await this.prisma.hcmSsWellbeingSurvey.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsWellbeingSurvey.create({
      data: {
        organizationId, surveyKey, title: input.title, programKey: input.programKey,
        questions: (input.questions ?? []) as object[], createdBy: userId,
      },
    });
  }

  async submitSurveyResponse(organizationId: string, surveyKey: string, response: Record<string, unknown>) {
    const survey = await this.prisma.hcmSsWellbeingSurvey.findFirst({ where: { organizationId, surveyKey } });
    if (!survey || !survey.isOpen) throw new NotFoundException('Encuesta no disponible');
    const responses = [...((survey.responses as unknown[]) ?? []), response];
    return this.prisma.hcmSsWellbeingSurvey.update({
      where: { id: survey.id },
      data: {
        responses: responses as object[],
        responseCount: responses.length,
        metadata: { averageScore: surveyAverageScore(responses as Array<{ score?: number }>) },
      },
    });
  }

  async activityStats(organizationId: string, activityKey: string) {
    const participations = await this.prisma.hcmSsWellbeingParticipation.findMany({ where: { organizationId, activityKey } });
    const attended = participations.filter((p) => p.attended).length;
    return {
      activityKey,
      enrolled: participations.length,
      attended,
      participationRate: wellbeingParticipationRate(attended, participations.length),
    };
  }
}
