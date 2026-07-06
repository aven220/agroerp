import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgQmsLotReleaseStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { canReleaseLot } from '../domain/emfg-qms.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgQmsIntegrationService } from './emfg-qms-integration.service';

@Injectable()
export class EmfgQmsReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgQmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EmfgQmsLotReleaseStatus) {
    return this.prisma.emfgQmsLotRelease.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { history: { orderBy: { decidedAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  get(organizationId: string, releaseKey: string) {
    return this.prisma.emfgQmsLotRelease.findUnique({
      where: { organizationId_releaseKey: { organizationId, releaseKey } },
      include: { history: { orderBy: { decidedAt: 'asc' } } },
    });
  }

  async ensurePending(organizationId: string, lotKey: string, lotCode: string, itemKey: string, orderKey?: string) {
    const existing = await this.prisma.emfgQmsLotRelease.findUnique({
      where: { organizationId_lotKey: { organizationId, lotKey } },
    });
    if (existing) return existing;

    const seq = await this.prisma.emfgQmsLotRelease.count({ where: { organizationId } });
    const releaseKey = generateEmfgKey('LR', seq + 1);

    return this.prisma.emfgQmsLotRelease.create({
      data: {
        organizationId,
        releaseKey,
        lotKey,
        lotCode,
        itemKey,
        orderKey,
        status: 'pending',
      },
    });
  }

  async decide(
    organizationId: string,
    userId: string,
    releaseKey: string,
    action: 'approve' | 'reject' | 'hold',
    reason?: string,
  ) {
    const release = await this.get(organizationId, releaseKey);
    if (!release) throw new NotFoundException('release_not_found');

    const transition = canReleaseLot(release.status, action);
    if (!transition.ok || !transition.to) throw new BadRequestException('invalid_release_transition');

    const newStatus = transition.to as EmfgQmsLotReleaseStatus;
    const seq = await this.prisma.emfgQmsLotReleaseHistory.count({ where: { organizationId } });
    const historyKey = generateEmfgKey('LH', seq + 1);

    const [updated] = await this.prisma.$transaction([
      this.prisma.emfgQmsLotRelease.update({
        where: { organizationId_releaseKey: { organizationId, releaseKey } },
        data: {
          status: newStatus,
          authorizedBy: userId,
          authorizedAt: new Date(),
          notes: reason,
        },
      }),
      this.prisma.emfgQmsLotReleaseHistory.create({
        data: {
          organizationId,
          historyKey,
          releaseKey,
          previousStatus: release.status,
          newStatus,
          decisionBy: userId,
          reason,
        },
      }),
    ]);

    const auditAction: 'lot_released' | 'lot_rejected' | 'updated' =
      action === 'approve' ? 'lot_released' : action === 'reject' ? 'lot_rejected' : 'updated';
    await this.audit.log(organizationId, 'EmfgQmsLotRelease', releaseKey, auditAction, userId, { action, reason });

    const eventType = action === 'approve'
      ? EVENT_TYPES.EMFG_QMS_LOT_RELEASED
      : action === 'reject'
        ? EVENT_TYPES.EMFG_QMS_LOT_REJECTED
        : EVENT_TYPES.EMFG_QMS_LOT_HELD;

    await this.core.emitUserAction(organizationId, 'EmfgQmsLotRelease', releaseKey, eventType, {
      lotKey: release.lotKey, itemKey: release.itemKey, orderKey: release.orderKey,
    });

    await this.integration.onLotDecision(organizationId, release.lotKey, newStatus, {
      itemKey: release.itemKey,
      orderKey: release.orderKey,
    });

    if (newStatus === 'approved') {
      await this.prisma.emfgProductionLot.updateMany({
        where: { organizationId, lotKey: release.lotKey },
        data: { status: 'released' },
      });
    } else if (newStatus === 'rejected') {
      await this.prisma.emfgProductionLot.updateMany({
        where: { organizationId, lotKey: release.lotKey },
        data: { status: 'rejected' },
      });
    } else if (newStatus === 'held') {
      await this.prisma.emfgProductionLot.updateMany({
        where: { organizationId, lotKey: release.lotKey },
        data: { status: 'held' },
      });
    }

    return updated;
  }
}
