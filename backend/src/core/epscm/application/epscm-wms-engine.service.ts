import { Injectable } from '@nestjs/common';
import { EpscmCenterService } from './epscm-center.service';
import { EpscmWmsWarehouseService } from './epscm-wms-warehouse.service';
import { EpscmWmsIndicatorsService } from './epscm-wms-indicators.service';

@Injectable()
export class EpscmWmsEngineService {
  constructor(
    private readonly centerService: EpscmCenterService,
    private readonly warehouse: EpscmWmsWarehouseService,
    private readonly indicators: EpscmWmsIndicatorsService,
  ) {}

  async center(organizationId: string) {
    const [scm, indicators, warehouses] = await Promise.all([
      this.centerService.center(organizationId),
      this.indicators.dashboard(organizationId),
      this.centerService.listWarehouses(organizationId),
    ]);
    return { scm, indicators, warehouses };
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.centerService.seed(organizationId, userId);
    const warehouses = await this.centerService.listWarehouses(organizationId);
    const wh = warehouses[0];
    if (wh) {
      await this.warehouse.seedHierarchy(organizationId, userId, wh.warehouseKey);
    }
    return this.center(organizationId);
  }
}
