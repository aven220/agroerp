import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EpscmWmsIntegrationService {
  private readonly logger = new Logger(EpscmWmsIntegrationService.name);

  constructor(private readonly core: CoreEngineService) {}

  async onPickCompleted(organizationId: string, taskKey: string, orderKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsPickTask', taskKey, EVENT_TYPES.EPSCM_WMS_PICK_COMPLETED, {
      orderKey,
      integration: 'escm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsPickTask', taskKey, EVENT_TYPES.EIMS_MOVEMENT_POSTED, {
      integration: 'eims',
      movementType: 'wms_pick',
    });
    this.logger.log(`Pick completed: ${taskKey}`);
  }

  async onPackCompleted(organizationId: string, packKey: string, orderKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsPackOrder', packKey, EVENT_TYPES.EPSCM_WMS_PACK_COMPLETED, {
      orderKey,
      integration: 'escm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsPackOrder', packKey, EVENT_TYPES.EPSCM_WMS_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }

  async onDispatchConfirmed(organizationId: string, dispatchKey: string, orderKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsDispatch', dispatchKey, EVENT_TYPES.EPSCM_WMS_DISPATCH_CONFIRMED, {
      orderKey,
      integration: 'escm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsDispatch', dispatchKey, EVENT_TYPES.EIMS_MOVEMENT_POSTED, {
      integration: 'eims',
      movementType: 'wms_dispatch',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsDispatch', dispatchKey, EVENT_TYPES.EPSCM_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
  }

  async onReceiptConfirmed(organizationId: string, receiptKey: string, purchaseKey?: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsReceipt', receiptKey, EVENT_TYPES.EPSCM_WMS_RECEIPT_CONFIRMED, {
      purchaseKey,
      integration: 'efm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsReceipt', receiptKey, EVENT_TYPES.EIMS_MOVEMENT_POSTED, {
      integration: 'eims',
      movementType: 'wms_receipt',
    });
    if (purchaseKey) {
      await this.core.emitUserAction(organizationId, 'EpscmWmsReceipt', receiptKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
        integration: 'emfg',
        purchaseKey,
      });
    }
  }

  async onTransferApprovalRequested(organizationId: string, transferKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsTransfer', transferKey, EVENT_TYPES.EPSCM_WMS_TRANSFER_APPROVAL_REQUESTED, {
      integration: 'workflow',
    });
  }

  async onTransferCompleted(organizationId: string, transferKey: string, transferType: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsTransfer', transferKey, EVENT_TYPES.EPSCM_WMS_TRANSFER_COMPLETED, {
      transferType,
      integration: 'eims',
    });
    await this.core.emitUserAction(organizationId, 'EpscmWmsTransfer', transferKey, EVENT_TYPES.EIMS_MOVEMENT_POSTED, {
      integration: 'eims',
      movementType: 'wms_transfer',
    });
  }

  async onCrossDockAssigned(organizationId: string, crossDockKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsCrossDock', crossDockKey, EVENT_TYPES.EPSCM_WMS_CROSSDOCK_ASSIGNED, {
      integration: 'dashboard',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmWmsOfflineBatch', batchKey, EVENT_TYPES.EPSCM_WMS_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }
}
