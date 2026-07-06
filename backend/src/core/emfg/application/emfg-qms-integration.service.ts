import { Injectable, Logger } from '@nestjs/common';
import { EmfgQmsInspectionResult, EmfgQmsLotReleaseStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';

@Injectable()
export class EmfgQmsIntegrationService {
  private readonly logger = new Logger(EmfgQmsIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async onInspectionCompleted(
    organizationId: string,
    inspectionKey: string,
    result: EmfgQmsInspectionResult,
    ctx: { lotKey?: string | null; orderKey?: string | null; itemKey?: string | null; supplierKey?: string | null; purchaseKey?: string | null },
  ) {
    await this.core.emitUserAction(organizationId, 'EmfgQmsInspection', inspectionKey, EVENT_TYPES.EMFG_QMS_DASHBOARD_REFRESH, {
      integration: 'dashboard',
      result,
    });

    if (ctx.lotKey && ctx.itemKey && result === 'pass') {
      await this.ensureLotReleasePending(organizationId, ctx.lotKey, ctx.itemKey, ctx.orderKey);
    }

    if (ctx.purchaseKey) {
      await this.core.emitUserAction(organizationId, 'EmfgQmsInspection', inspectionKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
        purchaseKey: ctx.purchaseKey,
        result,
        integration: 'purchases',
        qms: true,
      });
    }

    if (ctx.orderKey) {
      await this.core.emitUserAction(organizationId, 'EmfgQmsInspection', inspectionKey, EVENT_TYPES.EMFG_MES_PRODUCTION_RECORDED, {
        orderKey: ctx.orderKey,
        result,
        integration: 'mes',
        qms: true,
      });
    }

    this.logger.log(`QMS inspection ${inspectionKey} completed: ${result}`);
  }

  async ensureLotReleasePending(organizationId: string, lotKey: string, itemKey: string, orderKey?: string | null) {
    const existing = await this.prisma.emfgQmsLotRelease.findUnique({
      where: { organizationId_lotKey: { organizationId, lotKey } },
    });
    if (existing) return existing;

    const lot = await this.prisma.emfgProductionLot.findUnique({
      where: { organizationId_lotKey: { organizationId, lotKey } },
    });
    const seq = await this.prisma.emfgQmsLotRelease.count({ where: { organizationId } });
    const releaseKey = generateEmfgKey('LR', seq + 1);

    return this.prisma.emfgQmsLotRelease.create({
      data: {
        organizationId,
        releaseKey,
        lotKey,
        lotCode: lot?.lotCode ?? lotKey,
        itemKey,
        orderKey: orderKey ?? undefined,
        status: 'pending',
      },
    });
  }

  async onNcCreated(organizationId: string, ncKey: string, payload: Record<string, unknown>) {
    await this.core.emitUserAction(organizationId, 'EmfgQmsNonConformance', ncKey, EVENT_TYPES.EMFG_WORKFLOW_STARTED, {
      workflowTemplate: 'qms_non_conformance',
      integration: 'workflow',
      ...payload,
    });
    if (payload.lotKey) {
      await this.core.emitUserAction(organizationId, 'EmfgQmsNonConformance', ncKey, EVENT_TYPES.EMFG_MES_PRODUCTION_RECORDED, {
        lotKey: payload.lotKey,
        integration: 'traceability',
        qms: true,
      });
    }
  }

  async onCapaCreated(organizationId: string, capaKey: string, payload: Record<string, unknown>) {
    await this.core.emitUserAction(organizationId, 'EmfgQmsCapaAction', capaKey, EVENT_TYPES.EMFG_WORKFLOW_STARTED, {
      workflowTemplate: 'qms_capa',
      integration: 'workflow',
      ...payload,
    });
  }

  async onLotDecision(
    organizationId: string,
    lotKey: string,
    status: EmfgQmsLotReleaseStatus,
    ctx: { itemKey: string; orderKey?: string | null },
  ) {
    if (status === 'approved') {
      await this.core.emitUserAction(organizationId, 'EmfgQmsLotRelease', lotKey, EVENT_TYPES.EMFG_INVENTORY_RECEIPT_REQUESTED, {
        lotKey,
        itemKey: ctx.itemKey,
        integration: 'eims',
        qms: true,
      });
    }

    await this.core.emitUserAction(organizationId, 'EmfgQmsLotRelease', lotKey, EVENT_TYPES.EMFG_QMS_DASHBOARD_REFRESH, {
      integration: 'dashboard',
      status,
    });

    if (ctx.orderKey) {
      await this.prisma.emfgTraceabilityRecord.create({
        data: {
          organizationId,
          recordKey: `TR-QMS-${Date.now()}`,
          orderKey: ctx.orderKey,
          eventType: status === 'approved' ? 'finished_goods' : 'process_step',
          itemKey: ctx.itemKey,
          lotKey,
          details: { qmsRelease: status },
        },
      });
    }
  }
}
