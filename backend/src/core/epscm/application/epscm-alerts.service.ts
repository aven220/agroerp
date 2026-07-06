import { Injectable } from '@nestjs/common';
import { EpscmAlertType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmIntegrationService } from './epscm-integration.service';
import {
  computeCoverageDays,
  detectExcessInventory,
  detectNoMovement,
  detectStockoutRisk,
  generateEpscmKey,
} from '../domain/epscm-planning.engine';

@Injectable()
export class EpscmAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmIntegrationService,
  ) {}

  list(organizationId: string, unreadOnly = false) {
    return this.prisma.epscmAlert.findMany({
      where: { organizationId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { raisedAt: 'desc' },
      take: 100,
    });
  }

  markRead(organizationId: string, alertKey: string) {
    return this.prisma.epscmAlert.update({
      where: { organizationId_alertKey: { organizationId, alertKey } },
      data: { isRead: true },
    });
  }

  async evaluateAll(organizationId: string, userId?: string) {
    const policies = await this.prisma.epscmReplenishmentPolicy.findMany({
      where: { organizationId, isActive: true },
    });

    const alerts = [];
    for (const policy of policies) {
      const item = await this.prisma.eimsItem.findFirst({
        where: { organizationId, itemKey: policy.itemKey },
      });
      if (!item) continue;

      const balances = await this.prisma.eimsStockBalance.findMany({
        where: { organizationId, itemId: item.id },
      });
      const onHand = balances.reduce((s, b) => s + b.onHandQty, 0);

      if (detectStockoutRisk(onHand, policy.reorderPoint)) {
        alerts.push(await this.raise(organizationId, {
          alertType: EpscmAlertType.stockout_risk,
          itemKey: policy.itemKey,
          warehouseKey: policy.warehouseKey ?? undefined,
          severity: 'critical',
          title: 'Riesgo de desabastecimiento',
          message: `${policy.itemKey}: stock ${onHand} ≤ punto reorden ${policy.reorderPoint}`,
        }));
      }

      if (onHand <= policy.minStock && onHand > policy.reorderPoint) {
        alerts.push(await this.raise(organizationId, {
          alertType: EpscmAlertType.low_stock,
          itemKey: policy.itemKey,
          warehouseKey: policy.warehouseKey ?? undefined,
          severity: 'warning',
          title: 'Stock próximo a agotarse',
          message: `${policy.itemKey}: stock ${onHand} bajo mínimo ${policy.minStock}`,
        }));
      }

      if (detectExcessInventory(onHand, policy.maxStock)) {
        alerts.push(await this.raise(organizationId, {
          alertType: EpscmAlertType.excess_inventory,
          itemKey: policy.itemKey,
          warehouseKey: policy.warehouseKey ?? undefined,
          severity: 'warning',
          title: 'Exceso de inventario',
          message: `${policy.itemKey}: stock ${onHand} > máximo ${policy.maxStock}`,
        }));
      }

      const lastMovement = await this.prisma.eimsMovement.findFirst({
        where: { organizationId, itemId: item.id },
        orderBy: { postedAt: 'desc' },
      });
      const daysSince = lastMovement
        ? (Date.now() - lastMovement.postedAt.getTime()) / 86400000
        : 999;
      if (detectNoMovement(daysSince) && onHand > 0) {
        alerts.push(await this.raise(organizationId, {
          alertType: EpscmAlertType.no_movement,
          itemKey: policy.itemKey,
          severity: 'info',
          title: 'Producto sin movimiento',
          message: `${policy.itemKey}: sin movimiento por ${Math.floor(daysSince)} días`,
        }));
      }

      const classification = await this.prisma.epscmInventoryClassification.findUnique({
        where: { organizationId_itemKey: { organizationId, itemKey: policy.itemKey } },
      });
      const targetCoverage = policy.leadTimeDays * 2;
      const coverage = classification?.coverageDays ?? computeCoverageDays(onHand, 1);
      if (coverage < targetCoverage && policy.reorderPoint > 0) {
        alerts.push(await this.raise(organizationId, {
          alertType: EpscmAlertType.coverage_breach,
          itemKey: policy.itemKey,
          severity: 'warning',
          title: 'Incumplimiento de cobertura',
          message: `${policy.itemKey}: cobertura ${coverage} días < objetivo ${targetCoverage}`,
        }));
      }
    }

    if (userId) {
      await this.audit.log(organizationId, 'EpscmAlert', 'batch', 'alert_raised', userId, { count: alerts.length });
    }

    return alerts;
  }

  private async raise(
    organizationId: string,
    input: {
      alertType: EpscmAlertType;
      itemKey: string;
      warehouseKey?: string;
      severity: string;
      title: string;
      message: string;
    },
  ) {
    const existing = await this.prisma.epscmAlert.findFirst({
      where: {
        organizationId,
        alertType: input.alertType,
        itemKey: input.itemKey,
        isRead: false,
      },
    });
    if (existing) return existing;

    const seq = await this.prisma.epscmAlert.count({ where: { organizationId } });
    const alert = await this.prisma.epscmAlert.create({
      data: {
        organizationId,
        alertKey: generateEpscmKey('ALT', seq + 1),
        ...input,
      },
    });

    await this.integration.onAlertRaised(organizationId, alert.alertKey, input.alertType);
    return alert;
  }
}
