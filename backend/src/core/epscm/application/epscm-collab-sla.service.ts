import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmCollabSlaStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeBonusAmount, computePenaltyAmount, evaluateSlaCompliance, generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  listContracts(organizationId: string, partnerKey?: string) {
    return this.prisma.epscmCollabContract.findMany({
      where: { organizationId, ...(partnerKey ? { partnerKey } : {}) },
      include: { slas: { include: { metrics: true, compliance: true } } },
    });
  }

  async createContract(
    organizationId: string,
    userId: string,
    input: { partnerKey: string; code: string; name: string; startDate: Date; endDate?: Date },
  ) {
    const seq = await this.prisma.epscmCollabContract.count({ where: { organizationId } });
    return this.prisma.epscmCollabContract.create({
      data: {
        organizationId,
        contractKey: generateEpscmCollabKey('CTR', seq + 1),
        partnerKey: input.partnerKey,
        code: input.code,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'active',
      },
    });
  }

  async createSla(organizationId: string, userId: string, contractKey: string, name: string, targetPct = 95) {
    const seq = await this.prisma.epscmCollabSla.count({ where: { organizationId } });
    const sla = await this.prisma.epscmCollabSla.create({
      data: {
        organizationId,
        slaKey: generateEpscmCollabKey('SLA', seq + 1),
        contractKey,
        name,
        targetPct,
      },
    });
    await this.prisma.epscmCollabSlaMetric.create({
      data: {
        organizationId,
        metricKey: generateEpscmCollabKey('MET', seq + 1),
        slaKey: sla.slaKey,
        metricCode: 'on_time_delivery',
        targetValue: targetPct,
      },
    });
    return sla;
  }

  async recordCompliance(organizationId: string, userId: string, slaKey: string, actualPct: number, periodStart: Date, periodEnd: Date) {
    const sla = await this.prisma.epscmCollabSla.findFirst({ where: { organizationId, slaKey } });
    if (!sla) throw new NotFoundException('SLA not found');

    const status = evaluateSlaCompliance(actualPct, sla.targetPct) as EpscmCollabSlaStatus;
    const seq = await this.prisma.epscmCollabSlaCompliance.count({ where: { organizationId } });
    const record = await this.prisma.epscmCollabSlaCompliance.create({
      data: {
        organizationId,
        complianceKey: generateEpscmCollabKey('CMP', seq + 1),
        slaKey,
        periodStart,
        periodEnd,
        actualPct,
        status,
      },
    });

    await this.prisma.epscmCollabSla.update({ where: { id: sla.id }, data: { status } });

    if (status === 'breached') {
      const breachPct = sla.targetPct - actualPct;
      const penalty = computePenaltyAmount(breachPct, 1000000);
      await this.prisma.epscmCollabPenaltyBonus.create({
        data: {
          organizationId,
          entryKey: generateEpscmCollabKey('PNB', seq + 1),
          slaKey,
          entryType: 'penalty',
          amount: penalty,
          reason: `Incumplimiento SLA ${sla.name}`,
        },
      });
      await this.integration.onSlaBreach(organizationId, slaKey, actualPct);
      await this.audit.log(organizationId, 'EpscmCollabSla', slaKey, 'collab_sla_breach', userId, { actualPct });
    } else if (actualPct > sla.targetPct) {
      const exceed = actualPct - sla.targetPct;
      await this.prisma.epscmCollabPenaltyBonus.create({
        data: {
          organizationId,
          entryKey: generateEpscmCollabKey('BNB', seq + 1),
          slaKey,
          entryType: 'bonus',
          amount: computeBonusAmount(exceed, 500000),
          reason: `Bonificación por superación SLA`,
        },
      });
    }

    return record;
  }

  complianceHistory(organizationId: string, slaKey: string) {
    return this.prisma.epscmCollabSlaCompliance.findMany({
      where: { organizationId, slaKey },
      orderBy: { recordedAt: 'desc' },
    });
  }

  penaltyBonusHistory(organizationId: string, slaKey?: string) {
    return this.prisma.epscmCollabPenaltyBonus.findMany({
      where: { organizationId, ...(slaKey ? { slaKey } : {}) },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async center(organizationId: string) {
    const [contracts, breached, atRisk] = await Promise.all([
      this.listContracts(organizationId),
      this.prisma.epscmCollabSla.count({ where: { organizationId, status: 'breached' } }),
      this.prisma.epscmCollabSla.count({ where: { organizationId, status: 'at_risk' } }),
    ]);
    return { contracts, breachedCount: breached, atRiskCount: atRisk };
  }
}
