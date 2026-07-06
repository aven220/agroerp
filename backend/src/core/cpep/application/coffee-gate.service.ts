import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { evaluateGateChecks } from '../domain/gate.engine';
import { CoffeeReceptionRulesService } from './coffee-reception-rules.service';

@Injectable()
export class CoffeeGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receptionRules: CoffeeReceptionRulesService,
  ) {}

  async validateProducerIntake(organizationId: string, input: {
    producerId?: string;
    farmId?: string;
    lotId?: string;
    purchaseCenterId?: string;
    coffeeTypeKey?: string;
  }) {
    const alerts: string[] = [];
    let producerActive = true;
    let documentsValid = true;
    let farmActive = true;
    let lotAuthorized = true;
    let hasSanctions = false;
    let hasActiveContract = true;

    if (input.producerId) {
      const producer = await this.prisma.producer.findFirst({
        where: { id: input.producerId, organizationId, deletedAt: null },
      });
      producerActive = !!producer && ['active', 'pending_approval'].includes(producer.lifecycleStatus);
      documentsValid = !!producer?.documentNumber;
      hasSanctions = (producer?.riskScore ?? 0) >= 80;
      if (producer && producer.lifecycleStatus === 'suspended') {
        hasSanctions = true;
        alerts.push('Productor suspendido');
      }
      const recentRejects = await this.prisma.cpepQualityAssessment.count({
        where: {
          organizationId,
          grade: 'reject',
          ticket: { producerId: input.producerId },
          assessedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
      });
      if (recentRejects >= 3) alerts.push('Historial reciente de rechazos de calidad');
    }

    if (input.farmId) {
      const farm = await this.prisma.farmUnit.findFirst({
        where: { id: input.farmId, organizationId, deletedAt: null },
      });
      farmActive = !!farm && farm.status === 'active';
    }

    if (input.lotId) {
      const lot = await this.prisma.fieldLotProfile.findFirst({
        where: { id: input.lotId, organizationId, deletedAt: null },
      });
      lotAuthorized = !!lot && !['inactive', 'abandoned'].includes(lot.status);
    }

    const limits = await this.receptionRules.validate(organizationId, {
      purchaseCenterId: input.purchaseCenterId,
      producerId: input.producerId,
      coffeeTypeKey: input.coffeeTypeKey,
    });
    const withinDailyLimits = limits.valid || !limits.violations.some((v) => v.includes('Límite diario'));
    if (!limits.valid) alerts.push(...limits.violations);

    const contracts = await this.prisma.resource.count({
      where: {
        organizationId,
        resourceType: 'contract',
        deletedAt: null,
        status: 'active',
        ...(input.producerId ? { parentId: input.producerId } : {}),
      },
    });
    hasActiveContract = contracts > 0 || !input.producerId;

    return evaluateGateChecks({
      producerActive,
      documentsValid,
      farmActive: input.farmId ? farmActive : true,
      lotAuthorized: input.lotId ? lotAuthorized : true,
      withinDailyLimits,
      qualityRestricted: alerts.some((a) => a.includes('calidad')),
      hasActiveContract,
      hasSanctions,
      alerts,
    });
  }
}
