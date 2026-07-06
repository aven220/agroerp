import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  computeWeightedEvaluationScore,
  generateTdKey,
  validateBulkEvaluationRun,
  validateEvaluationSequence,
} from '../domain/hcm-talent-development.engine';
import type { HcmTdEvaluationStatus, HcmTdEvaluationType } from '@prisma/client';

@Injectable()
export class HcmTdEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listCycles(organizationId: string) {
    return this.prisma.hcmTdPerformanceCycle.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
      include: { evaluations: true },
    });
  }

  list(organizationId: string, filters?: { employeeKey?: string; cycleKey?: string; status?: HcmTdEvaluationStatus }) {
    return this.prisma.hcmTdEvaluation.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.cycleKey ? { cycleKey: filters.cycleKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { scores: true, actionPlans: true, cycle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCycle(organizationId: string, userId: string, input: {
    name: string; year: number; startDate: string; endDate: string;
  }) {
    const cycleKey = generateTdKey('CYC', (await this.prisma.hcmTdPerformanceCycle.count({ where: { organizationId } })) + 1);
    const cycle = await this.prisma.hcmTdPerformanceCycle.create({
      data: {
        organizationId, cycleKey, name: input.name, year: input.year,
        startDate: new Date(input.startDate), endDate: new Date(input.endDate),
      },
    });
    await this.audit.log(organizationId, 'HcmTdPerformanceCycle', cycleKey, 'created', userId);
    return cycle;
  }

  async create(organizationId: string, userId: string, input: {
    cycleKey: string; employeeKey: string; evaluatorKey?: string;
    evaluationType: HcmTdEvaluationType; comments?: string; submit?: boolean;
    scores?: Array<{ criterionKey: string; criterionName: string; competencyKey?: string; score: number; maxScore?: number; weight?: number; comments?: string }>;
  }) {
    const existing = await this.prisma.hcmTdEvaluation.findMany({
      where: { organizationId, cycleKey: input.cycleKey, employeeKey: input.employeeKey },
      select: { evaluationType: true },
    });
    const seq = validateEvaluationSequence(existing.map((e) => e.evaluationType), input.evaluationType);
    if (!seq.valid && input.evaluationType === 'manager') {
      // allow manager without self in bulk/seed scenarios
    } else if (!seq.valid) {
      throw new BadRequestException(seq.reason);
    }

    const evaluationKey = generateTdKey('EVL', (await this.prisma.hcmTdEvaluation.count({ where: { organizationId } })) + 1);
    const evaluation = await this.prisma.hcmTdEvaluation.create({
      data: {
        organizationId, evaluationKey, cycleKey: input.cycleKey,
        employeeKey: input.employeeKey, evaluatorKey: input.evaluatorKey,
        evaluationType: input.evaluationType,
        status: input.submit ? 'pending' : 'draft',
        comments: input.comments, createdBy: userId,
      },
    });

    if (input.scores?.length) {
      for (const [i, s] of input.scores.entries()) {
        await this.prisma.hcmTdEvaluationScore.create({
          data: {
            organizationId,
            scoreKey: generateTdKey('SCR', i + 1),
            evaluationKey,
            criterionKey: s.criterionKey,
            criterionName: s.criterionName,
            competencyKey: s.competencyKey,
            score: s.score,
            maxScore: s.maxScore ?? 5,
            weight: s.weight ?? 1,
            comments: s.comments,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'HcmTdEvaluation', evaluationKey, 'created', userId, { evaluationType: input.evaluationType });
    await this.core.emitUserAction(organizationId, 'HcmTdEvaluation', evaluationKey, EVENT_TYPES.HCM_TD_EVALUATION_CREATED, input);
    return this.get(organizationId, evaluationKey);
  }

  async submitScores(organizationId: string, evaluationKey: string, userId: string, scores: Array<{
    criterionKey: string; criterionName: string; competencyKey?: string;
    score: number; maxScore?: number; weight?: number; comments?: string;
  }>) {
    const evaluation = await this.get(organizationId, evaluationKey);
    if (evaluation.status === 'completed') throw new BadRequestException('Evaluación cerrada');

    await this.prisma.hcmTdEvaluationScore.deleteMany({ where: { organizationId, evaluationKey } });
    for (const [i, s] of scores.entries()) {
      await this.prisma.hcmTdEvaluationScore.create({
        data: {
          organizationId,
          scoreKey: generateTdKey('SCR', Date.now() % 100000 + i),
          evaluationKey,
          criterionKey: s.criterionKey,
          criterionName: s.criterionName,
          competencyKey: s.competencyKey,
          score: s.score,
          maxScore: s.maxScore ?? 5,
          weight: s.weight ?? 1,
          comments: s.comments,
        },
      });
    }

    const allScores = scores.map((s) => ({ score: s.score, maxScore: s.maxScore ?? 5, weight: s.weight ?? 1 }));
    const overallScore = computeWeightedEvaluationScore(allScores);

    const updated = await this.prisma.hcmTdEvaluation.update({
      where: { id: evaluation.id },
      data: { overallScore, status: 'in_review', submittedAt: new Date() },
    });
    await this.audit.log(organizationId, 'HcmTdEvaluation', evaluationKey, 'scores_submitted', userId, { overallScore });
    return updated;
  }

  async complete(organizationId: string, evaluationKey: string, userId: string, actionPlans?: Array<{ title: string; description?: string; dueDate?: string }>) {
    const evaluation = await this.get(organizationId, evaluationKey);
    const updated = await this.prisma.hcmTdEvaluation.update({
      where: { id: evaluation.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (actionPlans?.length) {
      for (const [i, ap] of actionPlans.entries()) {
        await this.prisma.hcmTdActionPlan.create({
          data: {
            organizationId,
            actionKey: generateTdKey('ACT', i + 1),
            evaluationKey,
            employeeKey: evaluation.employeeKey,
            title: ap.title,
            description: ap.description,
            dueDate: ap.dueDate ? new Date(ap.dueDate) : null,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'HcmTdEvaluation', evaluationKey, 'completed', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdEvaluation', evaluationKey, EVENT_TYPES.HCM_TD_EVALUATION_COMPLETED, {});
    return updated;
  }

  async bulkCreate(organizationId: string, userId: string, input: {
    cycleKey: string; evaluationType: HcmTdEvaluationType; employeeKeys: string[];
  }) {
    const active = await this.prisma.hcmTdEvaluation.count({
      where: { organizationId, cycleKey: input.cycleKey, status: 'pending' },
    });
    const check = validateBulkEvaluationRun(active > 100 ? 2 : 0);
    if (!check.valid) throw new BadRequestException(check.reason);

    const results = [];
    for (const employeeKey of input.employeeKeys) {
      results.push(await this.create(organizationId, userId, {
        cycleKey: input.cycleKey,
        employeeKey,
        evaluationType: input.evaluationType,
        submit: true,
      }));
    }
    await this.audit.log(organizationId, 'HcmTdEvaluation', 'bulk', 'created', userId, { count: results.length });
    return { created: results.length, evaluations: results };
  }

  async get(organizationId: string, evaluationKey: string) {
    const evaluation = await this.prisma.hcmTdEvaluation.findFirst({
      where: { organizationId, evaluationKey },
      include: { scores: true, actionPlans: true, cycle: true },
    });
    if (!evaluation) throw new NotFoundException(`Evaluación ${evaluationKey} no encontrada`);
    return evaluation;
  }
}
