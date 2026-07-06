import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmWmsKey } from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';
import { EpscmWmsDispatchService } from './epscm-wms-dispatch.service';

@Injectable()
export class EpscmWmsCrossDockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmWmsIntegrationService,
    private readonly dispatch: EpscmWmsDispatchService,
  ) {}

  list(organizationId: string) {
    return this.prisma.epscmWmsCrossDock.findMany({
      where: { organizationId },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, receiptKey: string, orderKey?: string) {
    const seq = await this.prisma.epscmWmsCrossDock.count({ where: { organizationId } });
    const crossDockKey = generateEpscmWmsKey('XD', seq + 1);
    const record = await this.prisma.epscmWmsCrossDock.create({
      data: {
        organizationId,
        crossDockKey,
        receiptKey,
        orderKey,
        status: 'pending',
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsCrossDock', crossDockKey, 'created', userId);
    return record;
  }

  async autoAssign(organizationId: string, userId: string, crossDockKey: string, warehouseKey: string) {
    const xd = await this.prisma.epscmWmsCrossDock.findFirst({ where: { organizationId, crossDockKey } });
    if (!xd) throw new NotFoundException('Cross-dock not found');

    const receipt = await this.prisma.epscmWmsReceipt.findFirst({
      where: { organizationId, receiptKey: xd.receiptKey },
      include: { lines: true },
    });
    const metaOrderKey = receipt?.metadata && typeof receipt.metadata === 'object'
      ? String((receipt.metadata as Record<string, unknown>).orderKey ?? '')
      : '';
    const orderKey = xd.orderKey ?? (metaOrderKey || undefined);

    let dispatchKey = xd.dispatchKey ?? undefined;
    if (orderKey) {
      const dispatch = await this.dispatch.prepare(organizationId, userId, orderKey, warehouseKey);
      dispatchKey = dispatch.dispatchKey;
    }

    const updated = await this.prisma.epscmWmsCrossDock.update({
      where: { id: xd.id },
      data: { status: 'assigned', dispatchKey, assignedAt: new Date() },
    });
    await this.integration.onCrossDockAssigned(organizationId, crossDockKey);
    await this.audit.log(organizationId, 'EpscmWmsCrossDock', crossDockKey, 'updated', userId, { autoAssign: true });
    return updated;
  }

  async complete(organizationId: string, userId: string, crossDockKey: string) {
    const xd = await this.prisma.epscmWmsCrossDock.findFirst({ where: { organizationId, crossDockKey } });
    if (!xd) throw new NotFoundException('Cross-dock not found');
    const updated = await this.prisma.epscmWmsCrossDock.update({
      where: { id: xd.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    if (xd.dispatchKey) {
      await this.dispatch.confirmExit(organizationId, userId, xd.dispatchKey);
    }
    await this.audit.log(organizationId, 'EpscmWmsCrossDock', crossDockKey, 'updated', userId, { completed: true });
    return updated;
  }
}
