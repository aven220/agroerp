import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmRcVacancyService } from './hcm-rc-vacancy.service';
import { computeProfileMatch, generateRcKey, validateImportCandidateRow } from '../domain/hcm-recruitment.engine';
import type { HcmRcPublicationChannel } from '@prisma/client';

export type CreateCandidateInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentNumber?: string;
  resumeUrl?: string;
  resumeContent?: string;
  skills?: string[];
  source?: HcmRcPublicationChannel;
  sourceRef?: string;
};

@Injectable()
export class HcmRcRecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly vacancies: HcmRcVacancyService,
  ) {}

  listCandidates(organizationId: string, filters?: { status?: string; q?: string }) {
    return this.prisma.hcmRcCandidate.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.q ? {
          OR: [
            { firstName: { contains: filters.q, mode: 'insensitive' } },
            { lastName: { contains: filters.q, mode: 'insensitive' } },
            { email: { contains: filters.q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCandidate(organizationId: string, candidateKey: string) {
    const candidate = await this.prisma.hcmRcCandidate.findFirst({
      where: { organizationId, candidateKey },
      include: {
        applications: { include: { vacancy: true } },
        talentPool: true,
        referrals: true,
        interviews: true,
        assessments: true,
        evaluations: true,
        rankings: true,
      },
    });
    if (!candidate) throw new NotFoundException(`Candidato ${candidateKey} no encontrado`);
    return candidate;
  }

  async createCandidate(organizationId: string, userId: string, input: CreateCandidateInput) {
    const dup = await this.prisma.hcmRcCandidate.findFirst({ where: { organizationId, email: input.email.toLowerCase() } });
    if (dup) throw new BadRequestException('Email de candidato ya registrado');

    const seq = (await this.prisma.hcmRcCandidate.count({ where: { organizationId } })) + 1;
    const candidateKey = generateRcKey('CND', seq);

    const candidate = await this.prisma.hcmRcCandidate.create({
      data: {
        organizationId,
        candidateKey,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        documentNumber: input.documentNumber,
        resumeUrl: input.resumeUrl,
        resumeContent: input.resumeContent,
        skills: input.skills ?? [],
        source: input.source ?? 'external',
        sourceRef: input.sourceRef,
        status: 'new',
      },
    });

    await this.audit.log(organizationId, 'HcmRcCandidate', candidateKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcCandidate', candidateKey, EVENT_TYPES.HCM_RC_CANDIDATE_CREATED, { email: input.email });
    return candidate;
  }

  async importCandidates(organizationId: string, userId: string, rows: CreateCandidateInput[]) {
    const results: Array<{ row: number; valid: boolean; errors: string[]; candidateKey?: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const validation = validateImportCandidateRow(rows[i], i + 1);
      if (!validation.valid) {
        results.push(validation);
        continue;
      }
      try {
        const c = await this.createCandidate(organizationId, userId, rows[i]);
        results.push({ row: i + 1, valid: true, errors: [], candidateKey: c.candidateKey });
      } catch (err) {
        results.push({ row: i + 1, valid: false, errors: [(err as Error).message] });
      }
    }
    await this.audit.log(organizationId, 'HcmRcCandidate', 'bulk', 'imported', userId, { count: rows.length });
    return results;
  }

  async applyToVacancy(organizationId: string, userId: string, vacancyKey: string, candidateKey: string) {
    await this.vacancies.get(organizationId, vacancyKey);
    await this.getCandidate(organizationId, candidateKey);

    const existing = await this.prisma.hcmRcApplication.findFirst({
      where: { organizationId, vacancyKey, candidateKey },
    });
    if (existing) throw new BadRequestException('Candidato ya aplicó a esta vacante');

    const vacancy = await this.vacancies.get(organizationId, vacancyKey);
    const candidate = await this.getCandidate(organizationId, candidateKey);
    const skills = (candidate.skills as string[]) ?? [];
    const competencies = vacancy.competencies.map((c) => ({ name: c.name, category: c.category, weight: c.weight, minScore: c.minScore, isRequired: c.isRequired }));
    const matchScore = computeProfileMatch(skills, competencies);

    const seq = (await this.prisma.hcmRcApplication.count({ where: { organizationId } })) + 1;
    const applicationKey = generateRcKey('APP', seq);

    const application = await this.prisma.hcmRcApplication.create({
      data: {
        organizationId,
        applicationKey,
        vacancyKey,
        candidateKey,
        status: 'applied',
        matchScore,
      },
    });

    await this.prisma.hcmRcCandidate.update({
      where: { id: candidate.id },
      data: { status: 'screening' },
    });

    await this.audit.log(organizationId, 'HcmRcApplication', applicationKey, 'created', userId, { matchScore });
    await this.core.emitUserAction(organizationId, 'HcmRcApplication', applicationKey, EVENT_TYPES.HCM_RC_APPLICATION_CREATED, { vacancyKey, candidateKey, matchScore });
    return application;
  }

  async addToTalentPool(organizationId: string, userId: string, candidateKey: string, tags?: string[], notes?: string) {
    await this.getCandidate(organizationId, candidateKey);
    const existing = await this.prisma.hcmRcTalentPoolEntry.findFirst({ where: { organizationId, candidateKey } });
    if (existing) return existing;

    const poolKey = generateRcKey('POOL', (await this.prisma.hcmRcTalentPoolEntry.count({ where: { organizationId } })) + 1);
    const entry = await this.prisma.hcmRcTalentPoolEntry.create({
      data: { organizationId, poolKey, candidateKey, tags: tags ?? [], notes },
    });
    await this.prisma.hcmRcCandidate.updateMany({
      where: { organizationId, candidateKey },
      data: { status: 'talent_pool' },
    });
    await this.audit.log(organizationId, 'HcmRcTalentPool', poolKey, 'added', userId, { candidateKey });
    return entry;
  }

  listTalentPool(organizationId: string) {
    return this.prisma.hcmRcTalentPoolEntry.findMany({
      where: { organizationId },
      include: { candidate: true },
      orderBy: { addedAt: 'desc' },
    });
  }

  async createReferral(organizationId: string, userId: string, input: {
    candidateKey: string; referrerEmployeeKey: string; vacancyKey?: string; bonusEligible?: boolean;
  }) {
    await this.getCandidate(organizationId, input.candidateKey);
    const referralKey = generateRcKey('REF', (await this.prisma.hcmRcReferral.count({ where: { organizationId } })) + 1);
    const referral = await this.prisma.hcmRcReferral.create({
      data: {
        organizationId,
        referralKey,
        candidateKey: input.candidateKey,
        referrerEmployeeKey: input.referrerEmployeeKey,
        vacancyKey: input.vacancyKey,
        bonusEligible: input.bonusEligible ?? false,
      },
    });
    await this.audit.log(organizationId, 'HcmRcReferral', referralKey, 'created', userId);
    return referral;
  }

  listReferrals(organizationId: string) {
    return this.prisma.hcmRcReferral.findMany({
      where: { organizationId },
      include: { candidate: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertCampaign(organizationId: string, userId: string, input: {
    campaignKey?: string; name: string; startDate: string; endDate?: string; budget?: number; isActive?: boolean;
  }) {
    if (input.campaignKey) {
      const existing = await this.prisma.hcmRcCampaign.findFirst({ where: { organizationId, campaignKey: input.campaignKey } });
      if (existing) {
        return this.prisma.hcmRcCampaign.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            startDate: new Date(input.startDate),
            endDate: input.endDate ? new Date(input.endDate) : null,
            budget: input.budget,
            isActive: input.isActive ?? true,
          },
        });
      }
    }
    const campaignKey = input.campaignKey ?? generateRcKey('CAM', (await this.prisma.hcmRcCampaign.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmRcCampaign.create({
      data: {
        organizationId,
        campaignKey,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        budget: input.budget,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  listCampaigns(organizationId: string) {
    return this.prisma.hcmRcCampaign.findMany({ where: { organizationId }, orderBy: { startDate: 'desc' } });
  }

  async upsertJobFair(organizationId: string, userId: string, input: {
    fairKey?: string; name: string; location?: string; eventDate: string; isActive?: boolean;
  }) {
    if (input.fairKey) {
      const existing = await this.prisma.hcmRcJobFair.findFirst({ where: { organizationId, fairKey: input.fairKey } });
      if (existing) {
        return this.prisma.hcmRcJobFair.update({
          where: { id: existing.id },
          data: { name: input.name, location: input.location, eventDate: new Date(input.eventDate), isActive: input.isActive ?? true },
        });
      }
    }
    const fairKey = input.fairKey ?? generateRcKey('FAIR', (await this.prisma.hcmRcJobFair.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmRcJobFair.create({
      data: {
        organizationId,
        fairKey,
        name: input.name,
        location: input.location,
        eventDate: new Date(input.eventDate),
        isActive: input.isActive ?? true,
      },
    });
  }

  listJobFairs(organizationId: string) {
    return this.prisma.hcmRcJobFair.findMany({ where: { organizationId }, orderBy: { eventDate: 'desc' } });
  }
}
