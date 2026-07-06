import { Injectable } from '@nestjs/common';
import { EmfgCostActualService } from './emfg-cost-actual.service';
import { EmfgCostIntegrationService } from './emfg-cost-integration.service';
import { EmfgCostVarianceService } from './emfg-cost-variance.service';

@Injectable()
export class EmfgCostEngineService {
  constructor(
    private readonly actual: EmfgCostActualService,
    private readonly variance: EmfgCostVarianceService,
    private readonly integration: EmfgCostIntegrationService,
  ) {}

  async runFullCalculation(organizationId: string, userId: string, orderKey: string, salesPrice = 0) {
    const actualResult = await this.actual.calculateFromOrder(organizationId, userId, orderKey);
    const varianceResult = await this.variance.computeForOrder(organizationId, userId, orderKey, salesPrice);
    const lotCosts = await this.integration.computeLotCosts(organizationId, orderKey);

    return {
      actual: actualResult,
      variance: varianceResult,
      lotCosts,
      computedAt: new Date().toISOString(),
    };
  }
}
