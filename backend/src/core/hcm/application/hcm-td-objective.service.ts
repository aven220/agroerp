import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { computeObjectiveCompliance, computeObjectiveProgress, generateTdKey } from '../domain/hcm-talent-development.engine';
import type { HcmTdObjectiveStatus, HcmTdObjectiveType } from '@prisma/client';

@Injectable()
export class HcmTdObjectiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, employeeKey?: string, status?: HcmTdObjectiveStatus) {
    return this.prisma.hcmTdObjective.findMany({
      where: {
        organizationId,
        ...(employeeKey ? { employeeKey } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(organizationId: string, userId: string, input: {
    employeeKey: string; objectiveType: HcmTdObjectiveType; title: string;
    description?: string; targetValue?: number; currentValue?: number;
    unit?: string; weight?: number; startDate: string; dueDate: string;
    parentKey?: string; submit?: boolean;
  }) {
    const objectiveKey = generateTdKey('OBJ', (await this.prisma.hcmTdObjective.count({ where: { organizationId } })) + 1);
    const objective = await this.prisma.hcmTdObjective.create({
      data: {
        organizationId, objectiveKey, employeeKey: input.employeeKey,
        objectiveType: input.objectiveType, title: input.title,
        description: input.description, targetValue: input.targetValue,
        currentValue: input.currentValue ?? 0, unit: input.unit,
        weight: input.weight ?? 1,
        status: input.submit ? 'active' : 'draft',
        startDate: new Date(input.startDate), dueDate: new Date(input.dueDate),
        parentKey: input.parentKey, createdBy: userId,
        metadata: { progress: computeObjectiveProgress(input.currentValue ?? 0, input.targetValue ?? 0) },
      },
    });
    await this.audit.log(organizationId, 'HcmTdObjective', objectiveKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmTdObjective', objectiveKey, EVENT_TYPES.HCM_TD_OBJECTIVE_CREATED, input);
    return objective;
  }

  async updateProgress(organizationId: string, objectiveKey: string, userId: string, currentValue: number) {
    const objective = await this.prisma.hcmTdObjective.findFirst({ where: { organizationId, objectiveKey } });
    if (!objective) throw new NotFoundException('Objetivo no encontrado');
    const progress = computeObjectiveProgress(currentValue, objective.targetValue ?? 0);
    const status: HcmTdObjectiveStatus = progress >= 100 ? 'completed' : objective.status === 'draft' ? 'draft' : 'active';
    const updated = await this.prisma.hcmTdObjective.update({
      where: { id: objective.id },
      data: {
        currentValue,
        status,
        metadata: { ...(objective.metadata as object), progress, updatedAt: new Date().toISOString() },
      },
    });
    await this.audit.log(organizationId, 'HcmTdObjective', objectiveKey, 'progress', userId, { currentValue, progress });
    return updated;
  }

  async employeeCompliance(organizationId: string, employeeKey: string) {
    const objectives = await this.list(organizationId, employeeKey, 'active');
    const compliance = computeObjectiveCompliance(objectives.map((o) => ({
      currentValue: o.currentValue,
      targetValue: o.targetValue,
      weight: o.weight,
    })));
    return { employeeKey, compliance, objectives };
  }
}

@Injectable()
export class HcmTdCareerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { employeeKey?: string; planType?: string; isHighPotential?: boolean }) {
    return this.prisma.hcmTdCareerPlan.findMany({
      where: {
        organizationId,
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
        ...(filters?.planType ? { planType: filters.planType as never } : {}),
        ...(filters?.isHighPotential != null ? { isHighPotential: filters.isHighPotential } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlan(organizationId: string, userId: string, input: {
    employeeKey: string; planType: 'growth' | 'promotion' | 'mobility' | 'succession' | 'high_potential';
    currentPositionKey?: string; targetPositionKey?: string;
    isHighPotential?: boolean; successorForKey?: string; notes?: string; targetDate?: string;
    readinessScore?: number;
  }) {
    const careerKey = generateTdKey('CAR', (await this.prisma.hcmTdCareerPlan.count({ where: { organizationId } })) + 1);
    const plan = await this.prisma.hcmTdCareerPlan.create({
      data: {
        organizationId, careerKey, employeeKey: input.employeeKey,
        planType: input.planType,
        currentPositionKey: input.currentPositionKey,
        targetPositionKey: input.targetPositionKey,
        isHighPotential: input.isHighPotential ?? input.planType === 'high_potential',
        successorForKey: input.successorForKey,
        notes: input.notes,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        readinessScore: input.readinessScore ?? 0,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCareerPlan', careerKey, 'created', userId, { planType: input.planType });
    await this.core.emitUserAction(organizationId, 'HcmTdCareerPlan', careerKey, EVENT_TYPES.HCM_TD_CAREER_PLAN_CREATED, input);
    return plan;
  }

  async updateReadiness(organizationId: string, careerKey: string, userId: string, readinessScore: number) {
    const plan = await this.prisma.hcmTdCareerPlan.findFirst({ where: { organizationId, careerKey } });
    if (!plan) throw new NotFoundException('Plan de carrera no encontrado');
    const updated = await this.prisma.hcmTdCareerPlan.update({
      where: { id: plan.id },
      data: { readinessScore, isHighPotential: readinessScore >= 80 ? true : plan.isHighPotential },
    });
    await this.audit.log(organizationId, 'HcmTdCareerPlan', careerKey, 'readiness_updated', userId, { readinessScore });
    return updated;
  }

  listSuccession(organizationId: string) {
    return this.prisma.hcmTdCareerPlan.findMany({
      where: { organizationId, planType: 'succession' },
      orderBy: { readinessScore: 'desc' },
    });
  }

  listHighPotential(organizationId: string) {
    return this.prisma.hcmTdCareerPlan.findMany({
      where: { organizationId, isHighPotential: true },
      orderBy: { readinessScore: 'desc' },
    });
  }
}
