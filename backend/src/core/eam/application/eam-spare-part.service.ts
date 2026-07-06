import { Injectable, NotFoundException } from '@nestjs/common';
import { EamSparePartLineStatus, EamWorkOrderCostType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';
import { EamCmmsIntegrationService } from './eam-cmms-integration.service';

@Injectable()
export class EamSparePartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamCmmsIntegrationService,
  ) {}

  list(organizationId: string, workOrderKey: string) {
    return this.prisma.eamSparePartLine.findMany({ where: { organizationId, workOrderKey } });
  }

  async request(
    organizationId: string,
    userId: string,
    workOrderKey: string,
    itemKey: string,
    quantity: number,
    lotKey?: string,
    serialNumber?: string,
  ) {
    const seq = await this.prisma.eamSparePartLine.count({ where: { organizationId } });
    const row = await this.prisma.eamSparePartLine.create({
      data: {
        organizationId,
        lineKey: generateEamCmmsKey('SPR', seq + 1),
        workOrderKey,
        itemKey,
        quantity,
        lotKey,
        serialNumber,
        status: 'requested',
      },
    });
    await this.audit.log(organizationId, 'EamSparePartLine', row.lineKey, 'created', userId);
    return row;
  }

  async updateStatus(organizationId: string, userId: string, lineKey: string, status: EamSparePartLineStatus, unitCost?: number) {
    const line = await this.prisma.eamSparePartLine.findFirst({ where: { organizationId, lineKey } });
    if (!line) throw new NotFoundException('Spare part line not found');
    const row = await this.prisma.eamSparePartLine.update({
      where: { id: line.id },
      data: { status, ...(unitCost !== undefined ? { unitCost } : {}) },
    });
    if (status === 'consumed') {
      await this.audit.log(organizationId, 'EamSparePartLine', lineKey, 'spare_part_consumed', userId);
      await this.integration.onSparePartConsumed(organizationId, line.id, lineKey, line.itemKey, line.quantity);
      await this.postCost(organizationId, line.workOrderKey, line.itemKey, (unitCost ?? line.unitCost) * line.quantity);
    }
    return row;
  }

  private async postCost(organizationId: string, workOrderKey: string, itemKey: string, amount: number) {
    const wo = await this.prisma.eamMaintWorkOrder.findFirst({ where: { organizationId, workOrderKey } });
    if (!wo) return;
    const seq = await this.prisma.eamWorkOrderCost.count({ where: { organizationId } });
    await this.prisma.eamWorkOrderCost.create({
      data: {
        organizationId,
        costKey: generateEamCmmsKey('CST', seq + 1),
        workOrderKey,
        assetKey: wo.assetKey,
        costType: 'spare_part' as EamWorkOrderCostType,
        amount,
        description: `Repuesto ${itemKey}`,
      },
    });
  }

  async substitute(organizationId: string, lineKey: string, substituteItemKey: string) {
    const line = await this.prisma.eamSparePartLine.findFirst({ where: { organizationId, lineKey } });
    if (!line) throw new NotFoundException('Spare part line not found');
    return this.prisma.eamSparePartLine.update({
      where: { id: line.id },
      data: { substituteItemKey },
    });
  }
}
