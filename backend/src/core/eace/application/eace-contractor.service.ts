import { Injectable } from '@nestjs/common';
import { EaceContractorType } from '@agroerp/prisma-eace-client';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { computeContractorRating, generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceContractorService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  list(organizationId: string, contractorType?: string) {
    return this.prisma.eaceContractor.findMany({
      where: { organizationId, ...(contractorType ? { contractorType: contractorType as EaceContractorType } : {}) },
      include: { evaluations: { orderBy: { evaluatedAt: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' },
    });
  }

  async register(organizationId: string, userId: string, data: {
    contractorType: EaceContractorType; name: string; taxId?: string;
    contactEmail?: string; contactPhone?: string; services?: unknown[];
  }) {
    const count = await this.prisma.eaceContractor.count({ where: { organizationId } });
    return this.prisma.eaceContractor.create({
      data: {
        organizationId,
        contractorKey: generateEaceKey('CNT', count + 1),
        contractorType: data.contractorType,
        name: data.name,
        taxId: data.taxId,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        services: (data.services ?? []) as object,
      },
    });
  }

  async evaluate(organizationId: string, userId: string, contractorKey: string, data: {
    score: number; comments?: string;
  }) {
    const contractor = await this.prisma.eaceContractor.findFirst({ where: { organizationId, contractorKey } });
    if (!contractor) return null;
    const count = await this.prisma.eaceContractorEvaluation.count({ where: { organizationId } });
    const evaluation = await this.prisma.eaceContractorEvaluation.create({
      data: {
        organizationId,
        evaluationKey: generateEaceKey('EVL', count + 1),
        contractorId: contractor.id,
        score: data.score,
        comments: data.comments,
        evaluatedBy: userId,
      },
    });
    const scores = await this.prisma.eaceContractorEvaluation.findMany({
      where: { contractorId: contractor.id },
      select: { score: true },
    });
    const { rating } = computeContractorRating(scores.map((s) => s.score));
    await this.prisma.eaceContractor.update({ where: { id: contractor.id }, data: { rating } });
    await this.audit.log(organizationId, 'Contractor', contractorKey, 'evaluation_recorded', userId, { score: data.score });
    return evaluation;
  }
}
