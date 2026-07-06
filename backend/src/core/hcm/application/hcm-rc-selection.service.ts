import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmRcVacancyService } from './hcm-rc-vacancy.service';
import { HcmRcRecruitmentService } from './hcm-rc-recruitment.service';
import {
  computeCandidateRanking,
  generateRcKey,
  passesAutoFilter,
  type CandidateProfile,
} from '../domain/hcm-recruitment.engine';
import type { HcmRcApplicationStatus, HcmRcAssessmentType, HcmRcInterviewStatus } from '@prisma/client';

@Injectable()
export class HcmRcSelectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly vacancies: HcmRcVacancyService,
    private readonly recruitment: HcmRcRecruitmentService,
  ) {}

  listApplications(organizationId: string, vacancyKey?: string, status?: HcmRcApplicationStatus) {
    return this.prisma.hcmRcApplication.findMany({
      where: {
        organizationId,
        ...(vacancyKey ? { vacancyKey } : {}),
        ...(status ? { status } : {}),
      },
      include: { candidate: true, vacancy: true },
      orderBy: [{ matchScore: 'desc' }, { appliedAt: 'desc' }],
    });
  }

  async autoFilterApplications(organizationId: string, vacancyKey: string, userId: string) {
    const vacancy = await this.vacancies.get(organizationId, vacancyKey);
    const applications = await this.listApplications(organizationId, vacancyKey);
    const competencies = vacancy.competencies.map((c) => ({
      name: c.name, category: c.category, weight: c.weight, minScore: c.minScore, isRequired: c.isRequired,
    }));

    const results: Array<{ applicationKey: string; passed: boolean; reasons: string[] }> = [];
    for (const app of applications) {
      const candidate = app.candidate;
      const profile = await this.buildCandidateProfile(organizationId, candidate.candidateKey, vacancyKey);
      const { passed, reasons } = passesAutoFilter(app.matchScore ?? 0, profile, competencies);
      const nextStatus: HcmRcApplicationStatus = passed ? 'screening' : 'rejected';

      await this.prisma.hcmRcApplication.update({
        where: { id: app.id },
        data: { status: nextStatus, metadata: { autoFilter: { passed, reasons } } },
      });
      if (!passed) {
        await this.prisma.hcmRcCandidate.update({
          where: { id: candidate.id },
          data: { status: 'rejected' },
        });
      }
      results.push({ applicationKey: app.applicationKey, passed, reasons });
    }

    await this.audit.log(organizationId, 'HcmRcApplication', vacancyKey, 'auto_filtered', userId, { count: results.length });
    return results;
  }

  async scheduleInterview(organizationId: string, userId: string, input: {
    candidateKey: string; vacancyKey: string; stageKey?: string; interviewerKey?: string;
    scheduledAt: string; durationMinutes?: number; location?: string; meetingUrl?: string;
  }) {
    await this.recruitment.getCandidate(organizationId, input.candidateKey);
    await this.vacancies.get(organizationId, input.vacancyKey);

    const interviewKey = generateRcKey('INT', (await this.prisma.hcmRcInterview.count({ where: { organizationId } })) + 1);
    const interview = await this.prisma.hcmRcInterview.create({
      data: {
        organizationId,
        interviewKey,
        candidateKey: input.candidateKey,
        vacancyKey: input.vacancyKey,
        stageKey: input.stageKey,
        interviewerKey: input.interviewerKey,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ?? 60,
        location: input.location,
        meetingUrl: input.meetingUrl,
        status: 'scheduled',
        createdBy: userId,
      },
    });

    await this.prisma.hcmRcApplication.updateMany({
      where: { organizationId, vacancyKey: input.vacancyKey, candidateKey: input.candidateKey },
      data: { status: 'interview' },
    });
    await this.prisma.hcmRcCandidate.updateMany({
      where: { organizationId, candidateKey: input.candidateKey },
      data: { status: 'interview' },
    });

    await this.audit.log(organizationId, 'HcmRcInterview', interviewKey, 'scheduled', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcInterview', interviewKey, EVENT_TYPES.HCM_RC_INTERVIEW_SCHEDULED, input);
    return interview;
  }

  listInterviews(organizationId: string, filters?: { vacancyKey?: string; candidateKey?: string; upcoming?: boolean; status?: HcmRcInterviewStatus }) {
    return this.prisma.hcmRcInterview.findMany({
      where: {
        organizationId,
        ...(filters?.vacancyKey ? { vacancyKey: filters.vacancyKey } : {}),
        ...(filters?.candidateKey ? { candidateKey: filters.candidateKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.upcoming ? { scheduledAt: { gte: new Date() }, status: 'scheduled' } : {}),
      },
      include: { candidate: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async completeInterview(organizationId: string, interviewKey: string, userId: string, input: {
    rating?: number; notes?: string; status?: HcmRcInterviewStatus;
  }) {
    const interview = await this.prisma.hcmRcInterview.findFirst({ where: { organizationId, interviewKey } });
    if (!interview) throw new NotFoundException(`Entrevista ${interviewKey} no encontrada`);

    const updated = await this.prisma.hcmRcInterview.update({
      where: { id: interview.id },
      data: {
        status: input.status ?? 'completed',
        rating: input.rating,
        notes: input.notes,
      },
    });

    await this.audit.log(organizationId, 'HcmRcInterview', interviewKey, 'completed', userId, { rating: input.rating });
    await this.core.emitUserAction(organizationId, 'HcmRcInterview', interviewKey, EVENT_TYPES.HCM_RC_INTERVIEW_COMPLETED, { rating: input.rating });
    return updated;
  }

  async recordAssessment(organizationId: string, userId: string, input: {
    candidateKey: string; vacancyKey: string; assessmentType: HcmRcAssessmentType;
    name: string; score?: number; maxScore?: number; passed?: boolean; results?: Record<string, unknown>;
  }) {
    await this.recruitment.getCandidate(organizationId, input.candidateKey);
    const assessmentKey = generateRcKey('ASM', (await this.prisma.hcmRcAssessment.count({ where: { organizationId } })) + 1);

    const assessment = await this.prisma.hcmRcAssessment.create({
      data: {
        organizationId,
        assessmentKey,
        candidateKey: input.candidateKey,
        vacancyKey: input.vacancyKey,
        assessmentType: input.assessmentType,
        name: input.name,
        score: input.score,
        maxScore: input.maxScore ?? 100,
        passed: input.passed,
        completedAt: new Date(),
        results: (input.results ?? {}) as object,
      },
    });

    await this.prisma.hcmRcApplication.updateMany({
      where: { organizationId, vacancyKey: input.vacancyKey, candidateKey: input.candidateKey },
      data: { status: 'assessment' },
    });

    await this.audit.log(organizationId, 'HcmRcAssessment', assessmentKey, 'recorded', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcAssessment', assessmentKey, EVENT_TYPES.HCM_RC_ASSESSMENT_RECORDED, input);
    return assessment;
  }

  async recordEvaluation(organizationId: string, userId: string, input: {
    candidateKey: string; vacancyKey: string; competencyKey?: string;
    score: number; maxScore?: number; comments?: string; evaluatorKey?: string;
  }) {
    const evaluationKey = generateRcKey('EVL', (await this.prisma.hcmRcEvaluation.count({ where: { organizationId } })) + 1);
    const evaluation = await this.prisma.hcmRcEvaluation.create({
      data: {
        organizationId,
        evaluationKey,
        candidateKey: input.candidateKey,
        vacancyKey: input.vacancyKey,
        competencyKey: input.competencyKey,
        evaluatorKey: input.evaluatorKey,
        score: input.score,
        maxScore: input.maxScore ?? 5,
        comments: input.comments,
      },
    });

    await this.audit.log(organizationId, 'HcmRcEvaluation', evaluationKey, 'recorded', userId, { score: input.score });
    await this.core.emitUserAction(organizationId, 'HcmRcEvaluation', evaluationKey, EVENT_TYPES.HCM_RC_EVALUATION_RECORDED, input);
    return evaluation;
  }

  listEvaluations(organizationId: string, vacancyKey: string, candidateKey?: string) {
    return this.prisma.hcmRcEvaluation.findMany({
      where: { organizationId, vacancyKey, ...(candidateKey ? { candidateKey } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compareCandidates(organizationId: string, vacancyKey: string, candidateKeys: string[]) {
    if (candidateKeys.length < 2) throw new BadRequestException('Se requieren al menos 2 candidatos');
    const vacancy = await this.vacancies.get(organizationId, vacancyKey);
    const comparisons = [];

    for (const candidateKey of candidateKeys) {
      const profile = await this.buildCandidateProfile(organizationId, candidateKey, vacancyKey);
      const candidate = await this.recruitment.getCandidate(organizationId, candidateKey);
      const app = await this.prisma.hcmRcApplication.findFirst({ where: { organizationId, vacancyKey, candidateKey } });
      comparisons.push({
        candidateKey,
        name: `${candidate.firstName} ${candidate.lastName}`,
        matchScore: app?.matchScore ?? 0,
        profile,
        evaluations: profile.evaluations,
        assessments: profile.assessments,
        interviewRating: profile.interviewRating,
      });
    }

    const ranking = computeCandidateRanking(
      comparisons.map((c) => ({
        candidateKey: c.candidateKey,
        matchScore: c.matchScore,
        profile: c.profile,
      })),
      vacancy.competencies.map((c) => ({ name: c.name, category: c.category, weight: c.weight, minScore: c.minScore, isRequired: c.isRequired })),
    );

    return { comparisons, ranking };
  }

  async computeRanking(organizationId: string, vacancyKey: string, userId: string) {
    const vacancy = await this.vacancies.get(organizationId, vacancyKey);
    const applications = await this.listApplications(organizationId, vacancyKey, 'screening');
    const activeApps = applications.length > 0 ? applications : await this.listApplications(organizationId, vacancyKey);

    const candidates = [];
    for (const app of activeApps.filter((a) => a.status !== 'rejected')) {
      const profile = await this.buildCandidateProfile(organizationId, app.candidateKey, vacancyKey);
      candidates.push({ candidateKey: app.candidateKey, matchScore: app.matchScore ?? 0, profile });
    }

    const ranking = computeCandidateRanking(
      candidates,
      vacancy.competencies.map((c) => ({ name: c.name, category: c.category, weight: c.weight, minScore: c.minScore, isRequired: c.isRequired })),
    );

    await this.prisma.hcmRcRanking.deleteMany({ where: { organizationId, vacancyKey } });
    for (const entry of ranking) {
      await this.prisma.hcmRcRanking.create({
        data: {
          organizationId,
          rankingKey: generateRcKey('RNK', (await this.prisma.hcmRcRanking.count({ where: { organizationId } })) + entry.rank),
          vacancyKey,
          candidateKey: entry.candidateKey,
          rank: entry.rank,
          totalScore: entry.totalScore,
          breakdown: entry.breakdown,
        },
      });
    }

    await this.vacancies.transition(organizationId, vacancyKey, userId, 'in_selection');
    await this.audit.log(organizationId, 'HcmRcRanking', vacancyKey, 'computed', userId, { count: ranking.length });
    await this.core.emitUserAction(organizationId, 'HcmRcRanking', vacancyKey, EVENT_TYPES.HCM_RC_RANKING_COMPUTED, { count: ranking.length });
    return ranking;
  }

  listRankings(organizationId: string, vacancyKey: string) {
    return this.prisma.hcmRcRanking.findMany({
      where: { organizationId, vacancyKey },
      include: { candidate: true },
      orderBy: { rank: 'asc' },
    });
  }

  listPipeline(organizationId: string, vacancyKey: string) {
    return this.prisma.hcmRcApplication.findMany({
      where: { organizationId, vacancyKey },
      include: {
        candidate: {
          include: { interviews: { where: { vacancyKey } }, assessments: { where: { vacancyKey } }, evaluations: { where: { vacancyKey } } },
        },
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  private async buildCandidateProfile(organizationId: string, candidateKey: string, vacancyKey: string): Promise<CandidateProfile> {
    const candidate = await this.recruitment.getCandidate(organizationId, candidateKey);
    const evaluations = await this.prisma.hcmRcEvaluation.findMany({ where: { organizationId, candidateKey, vacancyKey } });
    const assessments = await this.prisma.hcmRcAssessment.findMany({ where: { organizationId, candidateKey, vacancyKey } });
    const interviews = await this.prisma.hcmRcInterview.findMany({
      where: { organizationId, candidateKey, vacancyKey, status: 'completed' },
    });
    const avgRating = interviews.filter((i) => i.rating != null).length
      ? interviews.reduce((s, i) => s + (i.rating ?? 0), 0) / interviews.filter((i) => i.rating != null).length
      : undefined;

    return {
      skills: (candidate.skills as string[]) ?? [],
      evaluations: evaluations.map((e) => ({ competencyKey: e.competencyKey ?? undefined, score: e.score, maxScore: e.maxScore })),
      assessments: assessments.map((a) => ({ assessmentType: a.assessmentType, score: a.score ?? undefined, maxScore: a.maxScore, passed: a.passed ?? undefined })),
      interviewRating: avgRating,
    };
  }
}
