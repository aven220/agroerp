import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { DEFAULT_RC_ONBOARDING_TASKS, computeOnboardingCompletion, generateRcKey } from '../domain/hcm-recruitment.engine';
import type { HcmRcOnboardingTaskStatus } from '@prisma/client';

@Injectable()
export class HcmRcOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listPlans(organizationId: string, filters?: { status?: string; employeeKey?: string }) {
    return this.prisma.hcmRcOnboardingPlan.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.employeeKey ? { employeeKey: filters.employeeKey } : {}),
      },
      include: { tasks: { orderBy: { taskOrder: 'asc' } }, offer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlan(organizationId: string, planKey: string) {
    const plan = await this.prisma.hcmRcOnboardingPlan.findFirst({
      where: { organizationId, planKey },
      include: { tasks: { orderBy: { taskOrder: 'asc' } }, offer: true },
    });
    if (!plan) throw new NotFoundException(`Plan onboarding ${planKey} no encontrado`);
    return plan;
  }

  async createPlan(organizationId: string, userId: string, input: {
    offerKey: string; candidateKey: string; employeeKey?: string; startDate: string; inductionDate?: string;
  }) {
    const planKey = generateRcKey('ONB', (await this.prisma.hcmRcOnboardingPlan.count({ where: { organizationId } })) + 1);
    const plan = await this.prisma.hcmRcOnboardingPlan.create({
      data: {
        organizationId,
        planKey,
        offerKey: input.offerKey,
        candidateKey: input.candidateKey,
        employeeKey: input.employeeKey,
        startDate: new Date(input.startDate),
        inductionDate: input.inductionDate ? new Date(input.inductionDate) : null,
        status: 'active',
        completionPct: 0,
      },
    });

    for (const task of DEFAULT_RC_ONBOARDING_TASKS) {
      await this.prisma.hcmRcOnboardingTask.create({
        data: {
          organizationId,
          taskKey: generateRcKey('TSK', planKey.length + task.taskOrder),
          planKey,
          taskOrder: task.taskOrder,
          category: task.category,
          title: task.title,
          description: task.description,
          status: 'pending',
        },
      });
    }

    await this.audit.log(organizationId, 'HcmRcOnboardingPlan', planKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcOnboardingPlan', planKey, EVENT_TYPES.HCM_RC_ONBOARDING_STARTED, input);
    return this.getPlan(organizationId, planKey);
  }

  async updateTaskStatus(organizationId: string, taskKey: string, userId: string, status: HcmRcOnboardingTaskStatus, metadata?: Record<string, unknown>) {
    const task = await this.prisma.hcmRcOnboardingTask.findFirst({ where: { organizationId, taskKey } });
    if (!task) throw new NotFoundException(`Tarea ${taskKey} no encontrada`);

    await this.prisma.hcmRcOnboardingTask.update({
      where: { id: task.id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        completedBy: status === 'completed' ? userId : null,
        metadata: (metadata ?? task.metadata) as object,
      },
    });

    const plan = await this.getPlan(organizationId, task.planKey);
    const updatedTasks = plan.tasks.map((t) => ({ status: t.taskKey === taskKey ? status : t.status }));
    const completionPct = computeOnboardingCompletion(updatedTasks);
    const allDone = updatedTasks.every((t) => t.status === 'completed' || t.status === 'skipped');

    await this.prisma.hcmRcOnboardingPlan.update({
      where: { id: plan.id },
      data: {
        completionPct,
        status: allDone ? 'completed' : 'active',
      },
    });

    await this.audit.log(organizationId, 'HcmRcOnboardingTask', taskKey, status, userId, metadata);
    if (allDone) {
      await this.core.emitUserAction(organizationId, 'HcmRcOnboardingPlan', task.planKey, EVENT_TYPES.HCM_RC_ONBOARDING_COMPLETED, { completionPct });
    }
    return this.getPlan(organizationId, task.planKey);
  }

  async scheduleInduction(organizationId: string, planKey: string, userId: string, inductionDate: string) {
    const plan = await this.getPlan(organizationId, planKey);
    await this.prisma.hcmRcOnboardingPlan.update({
      where: { id: plan.id },
      data: { inductionDate: new Date(inductionDate) },
    });
    const inductionTask = plan.tasks.find((t) => t.category === 'training' && t.title.toLowerCase().includes('inducción'));
    if (inductionTask) {
      await this.prisma.hcmRcOnboardingTask.update({
        where: { id: inductionTask.id },
        data: { dueDate: new Date(inductionDate), status: 'in_progress' },
      });
    }
    await this.audit.log(organizationId, 'HcmRcOnboardingPlan', planKey, 'induction_scheduled', userId, { inductionDate });
    return this.getPlan(organizationId, planKey);
  }
}
