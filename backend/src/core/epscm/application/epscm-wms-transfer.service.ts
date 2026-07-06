import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmWmsTransferStatus, EpscmWmsTransferType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEpscmWmsKey } from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmWmsLocationService } from './epscm-wms-warehouse.service';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';

@Injectable()
export class EpscmWmsTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly location: EpscmWmsLocationService,
    private readonly integration: EpscmWmsIntegrationService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string, status?: EpscmWmsTransferStatus) {
    return this.prisma.epscmWmsTransfer.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { lines: true },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async get(organizationId: string, transferKey: string) {
    const t = await this.prisma.epscmWmsTransfer.findFirst({
      where: { organizationId, transferKey },
      include: { lines: true },
    });
    if (!t) throw new NotFoundException('Transfer not found');
    return t;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      transferType: EpscmWmsTransferType;
      fromWarehouseKey?: string;
      toWarehouseKey?: string;
      fromDcKey?: string;
      toDcKey?: string;
      fromCompanyKey?: string;
      toCompanyKey?: string;
      lines: Array<{
        itemKey: string;
        quantity: number;
        fromLocationKey?: string;
        toLocationKey?: string;
      }>;
    },
  ) {
    const seq = await this.prisma.epscmWmsTransfer.count({ where: { organizationId } });
    const transferKey = generateEpscmWmsKey('TRF', seq + 1);
    const transfer = await this.prisma.epscmWmsTransfer.create({
      data: {
        organizationId,
        transferKey,
        transferType: input.transferType,
        status: 'draft',
        fromWarehouseKey: input.fromWarehouseKey,
        toWarehouseKey: input.toWarehouseKey,
        fromDcKey: input.fromDcKey,
        toDcKey: input.toDcKey,
        fromCompanyKey: input.fromCompanyKey,
        toCompanyKey: input.toCompanyKey,
        requestedBy: userId,
        lines: {
          create: await Promise.all(
            input.lines.map(async (line, i) => {
              const lseq = await this.prisma.epscmWmsTransferLine.count({ where: { organizationId } });
              return {
                organizationId,
                lineKey: generateEpscmWmsKey('TRL', lseq + i + 1),
                itemKey: line.itemKey,
                quantity: line.quantity,
                fromLocationKey: line.fromLocationKey,
                toLocationKey: line.toLocationKey,
              };
            }),
          ),
        },
      },
      include: { lines: true },
    });
    await this.audit.log(organizationId, 'EpscmWmsTransfer', transferKey, 'created', userId);
    return transfer;
  }

  async submit(organizationId: string, userId: string, transferKey: string) {
    const transfer = await this.get(organizationId, transferKey);
    if (transfer.status !== 'draft') throw new BadRequestException('Transfer not in draft');
    const updated = await this.prisma.epscmWmsTransfer.update({
      where: { id: transfer.id },
      data: { status: 'pending_approval' },
    });
    await this.core.emitUserAction(
      organizationId,
      'EpscmWmsTransfer',
      transferKey,
      EVENT_TYPES.WORKFLOW_STARTED,
      { transferType: transfer.transferType, module: 'epscm_wms' },
    );
    await this.integration.onTransferApprovalRequested(organizationId, transferKey);
    await this.audit.log(organizationId, 'EpscmWmsTransfer', transferKey, 'updated', userId, { submitted: true });
    return updated;
  }

  async approve(organizationId: string, userId: string, transferKey: string) {
    const transfer = await this.get(organizationId, transferKey);
    if (transfer.status !== 'pending_approval') throw new BadRequestException('Transfer not pending approval');
    return this.prisma.epscmWmsTransfer.update({
      where: { id: transfer.id },
      data: { status: 'approved', approvedBy: userId },
    });
  }

  async startTransit(organizationId: string, userId: string, transferKey: string) {
    const transfer = await this.get(organizationId, transferKey);
    if (!['approved', 'in_transit'].includes(transfer.status)) {
      throw new BadRequestException('Transfer not approved');
    }
    return this.prisma.epscmWmsTransfer.update({
      where: { id: transfer.id },
      data: { status: 'in_transit' },
    });
  }

  async complete(organizationId: string, userId: string, transferKey: string) {
    const transfer = await this.get(organizationId, transferKey);
    if (transfer.status === 'completed' || transfer.status === 'cancelled') {
      throw new BadRequestException('Transfer already closed');
    }

    for (const line of transfer.lines) {
      if (line.fromLocationKey && line.toLocationKey) {
        await this.location.relocate(
          organizationId,
          userId,
          line.fromLocationKey,
          line.toLocationKey,
          line.itemKey,
          line.quantity,
        );
      }
    }

    const updated = await this.prisma.epscmWmsTransfer.update({
      where: { id: transfer.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await this.integration.onTransferCompleted(organizationId, transferKey, transfer.transferType);
    await this.audit.log(organizationId, 'EpscmWmsTransfer', transferKey, 'wms_transferred', userId);
    return updated;
  }

  tracking(organizationId: string, transferKey: string) {
    return this.get(organizationId, transferKey);
  }
}
