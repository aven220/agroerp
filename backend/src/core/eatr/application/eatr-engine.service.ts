import { Injectable } from '@nestjs/common';
import { EATR_LOT_TYPES, EATR_POSTHARVEST_STEPS, EATR_TRACE_EVENT_TYPES } from '../domain/eatr.engine';
import { EatrAuditService } from './eatr-audit.service';
import { EatrBridgeService, EatrDashboardService, EatrOfflineService } from './eatr-dashboard.service';
import { EatrCustodyService } from './eatr-custody.service';
import { EatrHarvestService } from './eatr-harvest.service';
import { EatrExportService, EatrPackagingService, EatrPostharvestService, EatrQualityService } from './eatr-postharvest.service';
import { EatrLotService, EatrTraceService } from './eatr-trace.service';

export { EatrOfflineService } from './eatr-dashboard.service';

@Injectable()
export class EatrEngineService {
  constructor(
    private readonly dashboard: EatrDashboardService,
    private readonly trace: EatrTraceService,
    private readonly lots: EatrLotService,
    private readonly custody: EatrCustodyService,
    private readonly harvest: EatrHarvestService,
    private readonly postharvest: EatrPostharvestService,
    private readonly quality: EatrQualityService,
    private readonly packaging: EatrPackagingService,
    private readonly exportSvc: EatrExportService,
    private readonly bridge: EatrBridgeService,
    private readonly audit: EatrAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, productionLots, commercialLots, events, markets] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.lots.listProduction(organizationId),
      this.lots.listCommercial(organizationId),
      this.trace.listEvents(organizationId),
      this.exportSvc.listMarkets(organizationId),
    ]);
    return {
      dashboard: dash,
      productionLots,
      commercialLots,
      recentEvents: events.slice(-20),
      exportMarkets: markets,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        traceEventTypes: EATR_TRACE_EVENT_TYPES,
        lotTypes: EATR_LOT_TYPES,
        postharvestSteps: EATR_POSTHARVEST_STEPS,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    for (const countryCode of ['CO', 'US', 'EU']) {
      await this.exportSvc.registerMarket(organizationId, {
        countryCode,
        marketName: `Mercado ${countryCode}`,
        requirements: [{ doc: 'phytosanitary_cert' }],
      });
    }
    await this.audit.log(organizationId, 'EatrPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
