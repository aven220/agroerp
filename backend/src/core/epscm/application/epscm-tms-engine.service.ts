import { Injectable } from '@nestjs/common';
import { EpscmTmsCostService } from './epscm-tms-cost.service';
import { EpscmTmsDriverService } from './epscm-tms-driver.service';
import { EpscmTmsFleetService } from './epscm-tms-fleet.service';
import { EpscmTmsIndicatorsService } from './epscm-tms-indicators.service';

@Injectable()
export class EpscmTmsEngineService {
  constructor(
    private readonly fleet: EpscmTmsFleetService,
    private readonly driver: EpscmTmsDriverService,
    private readonly indicators: EpscmTmsIndicatorsService,
    private readonly cost: EpscmTmsCostService,
  ) {}

  async center(organizationId: string) {
    const [logistics, costs, vehicles, drivers] = await Promise.all([
      this.indicators.logisticsDashboard(organizationId),
      this.cost.dashboard(organizationId),
      this.fleet.listVehicles(organizationId),
      this.driver.list(organizationId),
    ]);
    return { logistics, costs, vehicles, drivers };
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.fleet.seed(organizationId, userId);
    await this.driver.seed(organizationId, userId);
    return this.center(organizationId);
  }
}
