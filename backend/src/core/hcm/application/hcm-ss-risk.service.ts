import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  buildRiskMatrix,
  classifyRiskLevel,
  computeRiskScore,
  DEFAULT_SS_RISKS,
  generateSsKey,
  mitigationProgress,
  validateRiskAssessmentConcurrency,
} from '../domain/hcm-sst.engine';
import type { HcmSsControlType, HcmSsMitigationStatus, HcmSsRiskCategory } from '@prisma/client';

@Injectable()
export class HcmSsRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listRisks(organizationId: string) {
    return this.prisma.hcmSsRisk.findMany({
      where: { organizationId, isActive: true },
      include: { assessments: { orderBy: { assessedAt: 'desc' }, take: 5 }, controls: true, mitigations: true },
      orderBy: { code: 'asc' },
    });
  }

  listAssessments(organizationId: string, riskKey?: string) {
    return this.prisma.hcmSsRiskAssessment.findMany({
      where: { organizationId, ...(riskKey ? { riskKey } : {}) },
      orderBy: { assessedAt: 'desc' },
      include: { risk: true },
    });
  }

  listControls(organizationId: string, riskKey?: string) {
    return this.prisma.hcmSsRiskControl.findMany({
      where: { organizationId, ...(riskKey ? { riskKey } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMitigations(organizationId: string, status?: HcmSsMitigationStatus) {
    return this.prisma.hcmSsMitigationPlan.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { risk: true },
      orderBy: { dueAt: 'asc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const [i, r] of DEFAULT_SS_RISKS.entries()) {
      await this.prisma.hcmSsRisk.create({
        data: {
          organizationId,
          riskKey: generateSsKey('RSK', i + 1),
          code: r.code,
          name: r.name,
          category: r.category as HcmSsRiskCategory,
          processArea: r.processArea,
          createdBy: userId,
        },
      });
    }
    await this.audit.log(organizationId, 'HcmSsRisk', 'defaults', 'seeded', userId);
  }

  async upsertRisk(organizationId: string, userId: string, input: {
    riskKey?: string; code: string; name: string; category: HcmSsRiskCategory;
    description?: string; workCenterKey?: string; positionKey?: string; processArea?: string;
  }) {
    if (input.riskKey) {
      const existing = await this.prisma.hcmSsRisk.findFirst({ where: { organizationId, riskKey: input.riskKey } });
      if (existing) {
        return this.prisma.hcmSsRisk.update({
          where: { id: existing.id },
          data: {
            name: input.name, description: input.description,
            workCenterKey: input.workCenterKey, positionKey: input.positionKey, processArea: input.processArea,
          },
        });
      }
    }
    const riskKey = input.riskKey ?? generateSsKey('RSK', (await this.prisma.hcmSsRisk.count({ where: { organizationId } })) + 1);
    const risk = await this.prisma.hcmSsRisk.create({
      data: {
        organizationId, riskKey, code: input.code, name: input.name, category: input.category,
        description: input.description, workCenterKey: input.workCenterKey,
        positionKey: input.positionKey, processArea: input.processArea, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsRisk', riskKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsRisk', riskKey, EVENT_TYPES.HCM_SS_RISK_CREATED, input);
    return risk;
  }

  async assess(organizationId: string, userId: string, input: {
    riskKey: string; probability: number; impact: number; assessedAt?: string; notes?: string;
  }) {
    const risk = await this.prisma.hcmSsRisk.findFirst({ where: { organizationId, riskKey: input.riskKey } });
    if (!risk) throw new NotFoundException('Riesgo no encontrado');

    const active = await this.prisma.hcmSsRiskAssessment.count({
      where: { organizationId, assessedAt: new Date() },
    });
    const check = validateRiskAssessmentConcurrency(active);
    if (!check.valid) throw new BadRequestException(check.reason);

    const riskScore = computeRiskScore(input.probability, input.impact);
    const riskLevel = classifyRiskLevel(riskScore);
    const assessmentKey = generateSsKey('RAS', (await this.prisma.hcmSsRiskAssessment.count({ where: { organizationId } })) + 1);

    const assessment = await this.prisma.hcmSsRiskAssessment.create({
      data: {
        organizationId, assessmentKey, riskKey: input.riskKey,
        probability: input.probability, impact: input.impact,
        riskScore, riskLevel,
        assessedAt: input.assessedAt ? new Date(input.assessedAt) : new Date(),
        assessedBy: userId, notes: input.notes,
      },
    });
    await this.audit.log(organizationId, 'HcmSsRiskAssessment', assessmentKey, 'assessed', userId, { riskScore, riskLevel });
    await this.core.emitUserAction(organizationId, 'HcmSsRiskAssessment', assessmentKey, EVENT_TYPES.HCM_SS_RISK_ASSESSED, { riskScore, riskLevel });
    return assessment;
  }

  async addControl(organizationId: string, userId: string, input: {
    riskKey: string; controlType: HcmSsControlType; description: string;
    isImplemented?: boolean; effectiveness?: number;
  }) {
    const controlKey = generateSsKey('CTL', (await this.prisma.hcmSsRiskControl.count({ where: { organizationId } })) + 1);
    const control = await this.prisma.hcmSsRiskControl.create({
      data: {
        organizationId, controlKey, riskKey: input.riskKey,
        controlType: input.controlType, description: input.description,
        isImplemented: input.isImplemented ?? false,
        effectiveness: input.effectiveness,
        implementedAt: input.isImplemented ? new Date() : null,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsRiskControl', controlKey, 'created', userId);
    return control;
  }

  async createMitigation(organizationId: string, userId: string, input: {
    riskKey: string; title: string; description?: string; ownerKey?: string; dueAt?: string;
  }) {
    const planKey = generateSsKey('MIT', (await this.prisma.hcmSsMitigationPlan.count({ where: { organizationId } })) + 1);
    const plan = await this.prisma.hcmSsMitigationPlan.create({
      data: {
        organizationId, planKey, riskKey: input.riskKey, title: input.title,
        description: input.description, ownerKey: input.ownerKey,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        status: 'active', createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsMitigationPlan', planKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsMitigationPlan', planKey, EVENT_TYPES.HCM_SS_MITIGATION_CREATED, input);
    return plan;
  }

  async updateMitigationProgress(organizationId: string, planKey: string, userId: string, completedTasks: number, totalTasks: number) {
    const plan = await this.prisma.hcmSsMitigationPlan.findFirst({ where: { organizationId, planKey } });
    if (!plan) throw new NotFoundException('Plan de mitigación no encontrado');
    const progressPct = mitigationProgress(completedTasks, totalTasks);
    const status: HcmSsMitigationStatus = progressPct >= 100 ? 'completed' : plan.status;
    const updated = await this.prisma.hcmSsMitigationPlan.update({
      where: { id: plan.id },
      data: {
        progressPct, status,
        completedAt: progressPct >= 100 ? new Date() : null,
      },
    });
    await this.audit.log(organizationId, 'HcmSsMitigationPlan', planKey, 'progress', userId, { progressPct });
    return updated;
  }

  async riskMatrix(organizationId: string) {
    const [risks, assessments] = await Promise.all([
      this.prisma.hcmSsRisk.findMany({ where: { organizationId, isActive: true } }),
      this.prisma.hcmSsRiskAssessment.findMany({ where: { organizationId } }),
    ]);
    return buildRiskMatrix(risks, assessments);
  }
}
