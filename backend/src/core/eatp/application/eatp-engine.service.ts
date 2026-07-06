import { Injectable } from '@nestjs/common';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EATP_FARM_UNIT_TYPES, EATP_LABOR_TYPES } from '../domain/eatp.engine';
import { EatpAuditService } from './eatp-audit.service';
import { EatpCampaignService } from './eatp-campaign.service';
import { EatpCropService } from './eatp-crop.service';
import { EatpFarmService } from './eatp-farm.service';
import { EatpInputService } from './eatp-input.service';
import { EatpLaborService } from './eatp-labor.service';
import { EatpLotService } from './eatp-lot.service';
import { EatpBridgeService, EatpMonitoringService } from './eatp-monitoring.service';
import { EatpScheduleService } from './eatp-schedule.service';

export { EatpOfflineService } from './eatp-monitoring.service';

@Injectable()
export class EatpEngineService {
  constructor(
    private readonly prisma: EatpPrismaService,
    private readonly monitoring: EatpMonitoringService,
    private readonly farms: EatpFarmService,
    private readonly lots: EatpLotService,
    private readonly crops: EatpCropService,
    private readonly campaigns: EatpCampaignService,
    private readonly labor: EatpLaborService,
    private readonly schedule: EatpScheduleService,
    private readonly inputs: EatpInputService,
    private readonly bridge: EatpBridgeService,
    private readonly audit: EatpAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dashboard, campaigns, seasons, crops, tasks, calendar] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.campaigns.list(organizationId),
      this.campaigns.listSeasons(organizationId),
      this.crops.listRegistry(organizationId),
      this.labor.listTasks(organizationId),
      this.schedule.calendar(organizationId),
    ]);
    return {
      dashboard,
      campaigns,
      seasons,
      crops,
      tasks,
      calendar,
      moduleSlots: this.bridge.moduleSlots(),
      laborCatalog: EATP_LABOR_TYPES,
      farmUnitTypes: EATP_FARM_UNIT_TYPES,
      inputCategories: this.inputs.categories(),
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    const year = new Date().getFullYear();
    await this.campaigns.createSeason(organizationId, `SEASON-${year}`, `Temporada ${year}`, year, year + 1);
    await this.campaigns.createCampaign(organizationId, userId, `CAMP-${year}`, `Campaña ${year}`, {
      seasonKey: `SEASON-${year}`,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      budgetAmount: 0,
      objectives: [{ goal: 'Producción sostenible' }],
    });
    await this.crops.syncFromFtip(organizationId, userId);
    await this.lots.autoRegisterQrs(organizationId);
    await this.audit.log(organizationId, 'EatpPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
