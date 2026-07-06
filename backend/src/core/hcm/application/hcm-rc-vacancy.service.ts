import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  DEFAULT_RC_SELECTION_STAGES,
  DEFAULT_RC_VACANCY_COMPETENCIES,
  generateRcKey,
  validateVacancyTransition,
} from '../domain/hcm-recruitment.engine';
import type { HcmRcVacancyStatus } from '@prisma/client';

export type CreateVacancyInput = {
  title: string;
  positionKey?: string;
  departmentKey?: string;
  companyKey?: string;
  branchKey?: string;
  workCenterKey?: string;
  jobProfile?: string;
  contractType?: string;
  salaryMin?: number;
  salaryMax?: number;
  currencyKey?: string;
  location?: string;
  targetHireDate?: string;
  headcount?: number;
  hiringManagerKey?: string;
  competencies?: Array<{ name: string; category: string; weight?: number; minScore?: number; isRequired?: boolean }>;
};

@Injectable()
export class HcmRcVacancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string, filters?: { status?: HcmRcVacancyStatus; q?: string }) {
    return this.prisma.hcmRcVacancy.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
      },
      include: { competencies: true, approvals: { orderBy: { approvalLevel: 'asc' } }, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPublished(organizationId: string, channel?: 'internal' | 'external') {
    return this.prisma.hcmRcVacancy.findMany({
      where: {
        organizationId,
        status: { in: ['published_internal', 'published_external', 'open', 'in_selection'] },
        ...(channel === 'internal' ? { publicationInternal: true } : {}),
        ...(channel === 'external' ? { publicationExternal: true } : {}),
      },
      include: { competencies: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, vacancyKey: string) {
    const vacancy = await this.prisma.hcmRcVacancy.findFirst({
      where: { organizationId, vacancyKey },
      include: {
        competencies: true,
        approvals: { orderBy: { approvalLevel: 'asc' } },
        stages: { orderBy: { stageOrder: 'asc' } },
        applications: { include: { candidate: true } },
        offers: true,
      },
    });
    if (!vacancy) throw new NotFoundException(`Vacante ${vacancyKey} no encontrada`);
    return vacancy;
  }

  async create(organizationId: string, userId: string, input: CreateVacancyInput) {
    const seq = (await this.prisma.hcmRcVacancy.count({ where: { organizationId } })) + 1;
    const vacancyKey = generateRcKey('VAC', seq);
    const requisitionNumber = `REQ-${String(seq).padStart(5, '0')}`;

    const vacancy = await this.prisma.hcmRcVacancy.create({
      data: {
        organizationId,
        vacancyKey,
        requisitionNumber,
        title: input.title,
        positionKey: input.positionKey,
        departmentKey: input.departmentKey,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        workCenterKey: input.workCenterKey,
        jobProfile: input.jobProfile,
        contractType: input.contractType,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currencyKey: input.currencyKey ?? 'COP',
        location: input.location,
        targetHireDate: input.targetHireDate ? new Date(input.targetHireDate) : null,
        headcount: input.headcount ?? 1,
        hiringManagerKey: input.hiringManagerKey,
        status: 'draft',
        createdBy: userId,
      },
    });

    const competencies = input.competencies ?? DEFAULT_RC_VACANCY_COMPETENCIES;
    for (const [i, comp] of competencies.entries()) {
      await this.prisma.hcmRcVacancyCompetency.create({
        data: {
          organizationId,
          competencyKey: generateRcKey('CMP', seq * 10 + i),
          vacancyKey,
          name: comp.name,
          category: comp.category,
          weight: comp.weight ?? 1,
          minScore: comp.minScore ?? 3,
          isRequired: comp.isRequired ?? true,
        },
      });
    }

    for (const stage of DEFAULT_RC_SELECTION_STAGES) {
      await this.prisma.hcmRcSelectionStage.create({
        data: {
          organizationId,
          stageKey: generateRcKey('STG', seq * 100 + stage.stageOrder),
          vacancyKey,
          stageOrder: stage.stageOrder,
          name: stage.name,
          stageType: stage.stageType,
        },
      });
    }

    await this.audit.log(organizationId, 'HcmRcVacancy', vacancyKey, 'created', userId, { title: input.title });
    await this.core.emitUserAction(organizationId, 'HcmRcVacancy', vacancyKey, EVENT_TYPES.HCM_RC_VACANCY_CREATED, { requisitionNumber });
    return this.get(organizationId, vacancyKey);
  }

  async submitForApproval(organizationId: string, vacancyKey: string, userId: string, levels = 2) {
    const vacancy = await this.get(organizationId, vacancyKey);
    if (vacancy.status !== 'draft') throw new BadRequestException('Solo borradores pueden enviarse a aprobación');

    for (let level = 1; level <= levels; level++) {
      await this.prisma.hcmRcVacancyApproval.create({
        data: {
          organizationId,
          approvalKey: generateRcKey('APR', (await this.prisma.hcmRcVacancyApproval.count({ where: { organizationId } })) + level),
          vacancyKey,
          approvalLevel: level,
          status: 'pending',
        },
      });
    }

    await this.transition(organizationId, vacancyKey, userId, 'pending_approval');
    return this.get(organizationId, vacancyKey);
  }

  async decideApproval(organizationId: string, vacancyKey: string, approvalLevel: number, userId: string, approved: boolean, comments?: string) {
    const approval = await this.prisma.hcmRcVacancyApproval.findFirst({
      where: { organizationId, vacancyKey, approvalLevel },
    });
    if (!approval) throw new NotFoundException('Aprobación no encontrada');
    if (approval.status !== 'pending') throw new BadRequestException('Aprobación ya decidida');

    await this.prisma.hcmRcVacancyApproval.update({
      where: { id: approval.id },
      data: { status: approved ? 'approved' : 'rejected', approverUserId: userId, comments, decidedAt: new Date() },
    });

    await this.audit.log(organizationId, 'HcmRcVacancyApproval', approval.approvalKey, approved ? 'approved' : 'rejected', userId);

    if (!approved) {
      await this.transition(organizationId, vacancyKey, userId, 'draft');
      return this.get(organizationId, vacancyKey);
    }

    const pending = await this.prisma.hcmRcVacancyApproval.count({
      where: { organizationId, vacancyKey, status: 'pending' },
    });
    if (pending === 0) {
      await this.transition(organizationId, vacancyKey, userId, 'approved');
      await this.core.emitUserAction(organizationId, 'HcmRcVacancy', vacancyKey, EVENT_TYPES.HCM_RC_VACANCY_APPROVED, {});
    }
    return this.get(organizationId, vacancyKey);
  }

  async publish(organizationId: string, vacancyKey: string, userId: string, opts: { internal?: boolean; external?: boolean }) {
    const vacancy = await this.get(organizationId, vacancyKey);
    if (!['approved', 'published_internal', 'published_external', 'open'].includes(vacancy.status)) {
      throw new BadRequestException('Vacante no aprobada para publicación');
    }

    const data: Record<string, unknown> = {
      publicationInternal: opts.internal ?? vacancy.publicationInternal,
      publicationExternal: opts.external ?? vacancy.publicationExternal,
    };

    let nextStatus: HcmRcVacancyStatus = vacancy.status;
    if (opts.internal && opts.external) nextStatus = 'open';
    else if (opts.internal) nextStatus = 'published_internal';
    else if (opts.external) nextStatus = 'published_external';
    else nextStatus = 'open';

    await this.prisma.hcmRcVacancy.update({
      where: { id: vacancy.id },
      data: { ...data, status: nextStatus },
    });

    await this.audit.log(organizationId, 'HcmRcVacancy', vacancyKey, 'published', userId, opts);
    await this.core.emitUserAction(organizationId, 'HcmRcVacancy', vacancyKey, EVENT_TYPES.HCM_RC_VACANCY_PUBLISHED, opts);
    return this.get(organizationId, vacancyKey);
  }

  async transition(organizationId: string, vacancyKey: string, userId: string, nextStatus: HcmRcVacancyStatus) {
    const vacancy = await this.get(organizationId, vacancyKey);
    if (!validateVacancyTransition(vacancy.status, nextStatus)) {
      throw new BadRequestException(`Transición inválida: ${vacancy.status} → ${nextStatus}`);
    }
    await this.prisma.hcmRcVacancy.update({ where: { id: vacancy.id }, data: { status: nextStatus } });
    await this.audit.log(organizationId, 'HcmRcVacancy', vacancyKey, 'status_changed', userId, { from: vacancy.status, to: nextStatus });
    await this.core.emitUserAction(organizationId, 'HcmRcVacancy', vacancyKey, EVENT_TYPES.HCM_RC_VACANCY_STATUS_CHANGED, { from: vacancy.status, to: nextStatus });
    return this.get(organizationId, vacancyKey);
  }
}
