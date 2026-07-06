import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EmfgIntegrationService {
  private readonly logger = new Logger(EmfgIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async onOrderReleased(organizationId: string, userId: string, order: {
    orderKey: string; itemKey: string; plannedQty: number; bomKey?: string | null;
    materials: Array<{ componentKey: string; requiredQty: number; materialKey: string }>;
    salesOrderKey?: string | null;
  }) {
    for (const mat of order.materials) {
      await this.core.emitUserAction(organizationId, 'EmfgProductionOrderMaterial', mat.materialKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
        orderKey: order.orderKey,
        componentKey: mat.componentKey,
        quantity: mat.requiredQty,
        integration: 'eims',
      });
    }

    if (order.salesOrderKey) {
      await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', order.orderKey, EVENT_TYPES.EMFG_SALES_LINK_UPDATED, {
        salesOrderKey: order.salesOrderKey,
        integration: 'escm',
      });
    }

    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', order.orderKey, EVENT_TYPES.EMFG_WORKFLOW_STARTED, {
      workflowTemplate: 'production_order_release',
      integration: 'workflow',
    });

    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', order.orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      itemKey: order.itemKey,
      quantity: order.plannedQty,
      integration: 'efm',
    });

    await this.prisma.emfgProductionOrder.updateMany({
      where: { organizationId, orderKey: order.orderKey },
      data: {
        metadata: {
          inventoryQueued: true,
          workflowQueued: true,
          accountingQueued: true,
          releasedAt: new Date().toISOString(),
          releasedBy: userId,
        },
      },
    });

    this.logger.log(`Integrations queued for order ${order.orderKey}`);
  }

  async onOrderCompleted(organizationId: string, orderKey: string, itemKey: string, producedQty: number) {
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_INVENTORY_RECEIPT_REQUESTED, {
      itemKey,
      quantity: producedQty,
      integration: 'eims',
    });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }

  async onMaterialConsumed(
    organizationId: string,
    orderKey: string,
    payload: { componentKey: string; quantity: number; wasteQty: number; lotKey?: string },
  ) {
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
      componentKey: payload.componentKey,
      quantity: payload.quantity,
      wasteQty: payload.wasteQty,
      lotKey: payload.lotKey,
      integration: 'eims',
      mes: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      componentKey: payload.componentKey,
      quantity: payload.quantity,
      integration: 'efm',
      mes: true,
    });
  }

  async onProductionRecorded(
    organizationId: string,
    orderKey: string,
    itemKey: string,
    quantity: number,
    opts?: { lotKey?: string; partial?: boolean },
  ) {
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_INVENTORY_RECEIPT_REQUESTED, {
      itemKey,
      quantity,
      lotKey: opts?.lotKey,
      partial: opts?.partial ?? false,
      integration: 'eims',
      mes: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ACCOUNTING_ENTRY_REQUESTED, {
      itemKey,
      quantity,
      integration: 'efm',
      mes: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }
}
