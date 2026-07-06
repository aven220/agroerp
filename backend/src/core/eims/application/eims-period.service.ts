import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsKardexService } from './eims-kardex.service';
import { periodBounds } from '../domain/eims-valuation.engine';

@Injectable()
export class EimsPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly kardex: EimsKardexService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eimsPeriodClose.findMany({
      where: { organizationId },
      orderBy: { periodEnd: 'desc' },
      take: 100,
    });
  }

  async getOne(organizationId: string, periodKey: string) {
    const row = await this.prisma.eimsPeriodClose.findFirst({
      where: { organizationId, periodKey },
    });
    if (!row) throw new NotFoundException(`Cierre ${periodKey} no encontrado`);
    return row;
  }

  async close(
    organizationId: string,
    userId: string,
    periodType: 'daily' | 'monthly' | 'yearly',
    refDate?: string,
  ) {
    const bounds = periodBounds(periodType, refDate ? new Date(refDate) : new Date());
    const existing = await this.prisma.eimsPeriodClose.findFirst({
      where: { organizationId, periodKey: bounds.periodKey },
    });
    if (existing?.status === 'closed') {
      throw new BadRequestException(`Período ${bounds.periodKey} ya está cerrado`);
    }

    const value = await this.kardex.inventoryValue(organizationId);
    const movements = await this.prisma.eimsMovement.findMany({
      where: {
        organizationId,
        status: 'confirmed',
        postedAt: { gte: bounds.periodStart, lte: bounds.periodEnd },
      },
      select: { movementType: true },
    });
    const totalEntries = movements.filter((m) =>
      ['entry', 'adjustment_positive', 'production', 'return'].includes(m.movementType),
    ).length;
    const totalExits = movements.filter((m) =>
      ['exit', 'adjustment_negative', 'consumption', 'shrinkage', 'loss', 'donation', 'transformation'].includes(
        m.movementType,
      ),
    ).length;

    const row = await this.prisma.eimsPeriodClose.upsert({
      where: { organizationId_periodKey: { organizationId, periodKey: bounds.periodKey } },
      update: {
        status: 'closed',
        inventoryValue: value.total,
        totalEntries,
        totalExits,
        summary: { byWarehouse: value.byWarehouse, byItem: value.byItem } as object,
        closedBy: userId,
        closedAt: new Date(),
        reopenedBy: null,
        reopenedAt: null,
        reopenReason: null,
      },
      create: {
        organizationId,
        periodKey: bounds.periodKey,
        periodType,
        status: 'closed',
        periodStart: bounds.periodStart,
        periodEnd: bounds.periodEnd,
        inventoryValue: value.total,
        totalEntries,
        totalExits,
        summary: { byWarehouse: value.byWarehouse, byItem: value.byItem } as object,
        closedBy: userId,
        closedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'PeriodClose', bounds.periodKey, 'closed', userId, {
      inventoryValue: value.total,
      periodType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsPeriodClose',
      row.id,
      EVENT_TYPES.EIMS_PERIOD_CLOSED,
      { periodKey: bounds.periodKey, inventoryValue: value.total },
    );
    return row;
  }

  async reopen(organizationId: string, userId: string, periodKey: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Justificación obligatoria para reapertura');
    const row = await this.getOne(organizationId, periodKey);
    if (row.status !== 'closed') throw new BadRequestException('Solo períodos cerrados pueden reabrirse');

    const updated = await this.prisma.eimsPeriodClose.update({
      where: { id: row.id },
      data: {
        status: 'reopened',
        reopenedBy: userId,
        reopenedAt: new Date(),
        reopenReason: reason,
      },
    });
    await this.audit.log(organizationId, 'PeriodClose', periodKey, 'reopened', userId, { reason });
    await this.core.emitUserAction(
      organizationId,
      'EimsPeriodClose',
      row.id,
      EVENT_TYPES.EIMS_PERIOD_REOPENED,
      { periodKey, reason },
    );
    return updated;
  }

  async recalculate(organizationId: string, userId: string, periodKey: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Justificación obligatoria para recálculo');
    const row = await this.getOne(organizationId, periodKey);
    const value = await this.kardex.inventoryValue(organizationId);
    const updated = await this.prisma.eimsPeriodClose.update({
      where: { id: row.id },
      data: {
        inventoryValue: value.total,
        summary: { byWarehouse: value.byWarehouse, byItem: value.byItem, recalculated: true } as object,
        recalculatedBy: userId,
        recalculatedAt: new Date(),
        recalcReason: reason,
      },
    });
    await this.audit.log(organizationId, 'PeriodClose', periodKey, 'recalculated', userId, {
      reason,
      inventoryValue: value.total,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsPeriodClose',
      row.id,
      EVENT_TYPES.EIMS_PERIOD_RECALCULATED,
      { periodKey, reason },
    );
    return updated;
  }

  async financialReport(organizationId: string) {
    const value = await this.kardex.inventoryValue(organizationId);
    const history = await this.kardex.costHistory(organizationId);
    const closes = await this.list(organizationId);
    return {
      inventoryValue: value.total,
      byWarehouse: value.byWarehouse,
      byItem: value.byItem,
      recentCostEvents: history.slice(0, 50),
      closes: closes.slice(0, 20),
    };
  }
}
