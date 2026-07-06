import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EamIntegrationService {
  constructor(private readonly core: CoreEngineService) {}

  async onAssetRegistered(organizationId: string, assetKey: string, purchaseOrderKey?: string) {
    await this.core.emitUserAction(organizationId, 'EamAsset', assetKey, EVENT_TYPES.EAM_ASSET_REGISTERED, {
      purchaseOrderKey,
      integration: 'efm',
    });
    await this.core.emitUserAction(organizationId, 'EamAsset', assetKey, EVENT_TYPES.EAM_ASSET_REGISTERED, {
      integration: 'eims',
    });
  }

  async onAssetUpdated(organizationId: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamAsset', assetKey, EVENT_TYPES.EAM_ASSET_UPDATED, {
      integration: 'dashboard',
    });
  }

  async onLifecycleEvent(organizationId: string, assetKey: string, eventType: string) {
    await this.core.emitUserAction(organizationId, 'EamLifecycleEvent', assetKey, EVENT_TYPES.EAM_LIFECYCLE_EVENT, {
      eventType,
      integration: 'emfg',
    });
  }

  async onAssetTransferred(organizationId: string, transferKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamAssetTransfer', transferKey, EVENT_TYPES.EAM_ASSET_TRANSFERRED, {
      assetKey,
      integration: 'eims',
    });
  }

  async onAssetLoaned(organizationId: string, loanKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamAssetLoan', loanKey, EVENT_TYPES.EAM_ASSET_LOANED, {
      assetKey,
      integration: 'workflow',
    });
  }

  async onAssetRetired(organizationId: string, assetKey: string, eventType: string) {
    await this.core.emitUserAction(organizationId, 'EamAsset', assetKey, EVENT_TYPES.EAM_ASSET_RETIRED, {
      eventType,
      integration: 'efm',
    });
  }

  async onDocumentUploaded(organizationId: string, documentKey: string, docType: string) {
    await this.core.emitUserAction(organizationId, 'EamAssetDocument', documentKey, EVENT_TYPES.EAM_DOCUMENT_UPLOADED, {
      docType,
      integration: 'documents',
    });
  }

  async onDashboardRefresh(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'EamIndicatorSnapshot', 'batch', EVENT_TYPES.EAM_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EamOfflineBatch', batchKey, EVENT_TYPES.EAM_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }

  async onEmfgMaintenance(organizationId: string, equipmentKey: string, logKey: string) {
    await this.core.emitUserAction(organizationId, 'EamAsset', equipmentKey, EVENT_TYPES.EAM_LIFECYCLE_EVENT, {
      equipmentKey,
      logKey,
      integration: 'emfg',
      source: 'maintenance_recorded',
    });
  }
}
