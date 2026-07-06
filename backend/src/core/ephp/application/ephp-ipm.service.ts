import { Injectable, NotFoundException } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { EPHP_IPM_METHODS, evaluateIpmAction, generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpIpmService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  methods() { return EPHP_IPM_METHODS; }

  listPlans(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpIpmPlan.findMany({
      where: { organizationId, status: 'active', ...(fieldLotId ? { fieldLotId } : {}) },
      include: { evaluations: { take: 3, orderBy: { evaluatedAt: 'desc' } } },
    });
  }

  async createPlan(
    organizationId: string,
    data: {
      name: string; fieldLotId?: string; cropCode?: string;
      actionThreshold?: number; methods?: unknown[];
    },
  ) {
    const count = await this.prisma.ephpIpmPlan.count({ where: { organizationId } });
    const planKey = generateEphpKey('IPM', count + 1);
    return this.prisma.ephpIpmPlan.create({
      data: {
        organizationId, planKey, name: data.name, fieldLotId: data.fieldLotId,
        cropCode: data.cropCode, actionThreshold: data.actionThreshold ?? 2,
        methods: (data.methods ?? EPHP_IPM_METHODS) as object,
      },
    });
  }

  evaluateAction(infestationLevel: string, threshold: number) {
    return evaluateIpmAction(infestationLevel, threshold);
  }

  async recordEvaluation(
    organizationId: string,
    userId: string,
    planKey: string,
    data: { effectiveness?: number; notes?: string },
  ) {
    const plan = await this.prisma.ephpIpmPlan.findFirst({ where: { organizationId, planKey } });
    if (!plan) throw new NotFoundException('Plan MIP no encontrado');
    const count = await this.prisma.ephpIpmEvaluation.count({ where: { organizationId } });
    const evaluationKey = generateEphpKey('EVL', count + 1);
    const row = await this.prisma.ephpIpmEvaluation.create({
      data: {
        organizationId, evaluationKey, planId: plan.id,
        effectiveness: data.effectiveness, notes: data.notes, evaluatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EphpIpmEvaluation', evaluationKey, 'ipm_evaluated', userId);
    return row;
  }
}
