import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EbreModule } from '@/core/ebre/ebre.module';
import { EimsModule } from '@/core/eims/eims.module';
import { CpepController } from './presentation/cpep.controller';
import { CoffeeAuditService } from './application/coffee-audit.service';
import { CoffeeReceptionService } from './application/coffee-reception.service';
import { CoffeeQualityService } from './application/coffee-quality.service';
import { CoffeeDocumentsService } from './application/coffee-documents.service';
import { CoffeeSettlementService } from './application/coffee-settlement.service';
import { CoffeeInventoryService } from './application/coffee-inventory.service';
import { CoffeeAiService } from './application/coffee-ai.service';
import { CoffeeConfigService } from './application/coffee-config.service';
import { CoffeeCenterService } from './application/coffee-center.service';
import { CoffeeLookupService } from './application/coffee-lookup.service';
import { CoffeeIotService } from './application/coffee-iot.service';
import { CoffeeStatsService } from './application/coffee-stats.service';
import { CoffeeConfigChangelogService } from './application/coffee-config-changelog.service';
import { CoffeeCatalogService } from './application/coffee-catalog.service';
import { CoffeeParameterService } from './application/coffee-parameter.service';
import { CoffeeReceptionRulesService } from './application/coffee-reception-rules.service';
import { CoffeePurchaseCenterService } from './application/coffee-purchase-center.service';
import { CoffeeConfigCenterService } from './application/coffee-config-center.service';
import { CoffeeGateService } from './application/coffee-gate.service';
import { CoffeeTurnService } from './application/coffee-turn.service';
import { CoffeeWizardService } from './application/coffee-wizard.service';
import { CoffeeScaleService } from './application/coffee-scale.service';
import { CoffeeWeighingService } from './application/coffee-weighing.service';
import { CoffeeTraceabilityService } from './application/coffee-traceability.service';
import { CoffeeOpsService } from './application/coffee-ops.service';
import { CoffeeReportsService } from './application/coffee-reports.service';

@Module({
  imports: [EventsModule, CoreEngineModule, EbreModule, EimsModule],
  controllers: [CpepController],
  providers: [
    CoffeeAuditService,
    CoffeeTurnService,
    CoffeeReceptionService,
    CoffeeQualityService,
    CoffeeDocumentsService,
    CoffeeSettlementService,
    CoffeeInventoryService,
    CoffeeTraceabilityService,
    CoffeeAiService,
    CoffeeConfigChangelogService,
    CoffeeConfigService,
    CoffeeOpsService,
    CoffeeStatsService,
    CoffeeReportsService,
    CoffeeCenterService,
    CoffeeLookupService,
    CoffeeScaleService,
    CoffeeWeighingService,
    CoffeeIotService,
    CoffeeCatalogService,
    CoffeeParameterService,
    CoffeeReceptionRulesService,
    CoffeePurchaseCenterService,
    CoffeeConfigCenterService,
    CoffeeGateService,
    CoffeeWizardService,
  ],
  exports: [
    CoffeeReceptionService,
    CoffeeSettlementService,
    CoffeeInventoryService,
    CoffeeTraceabilityService,
    CoffeeCatalogService,
    CoffeeParameterService,
    CoffeeReceptionRulesService,
    CoffeeTurnService,
    CoffeeWizardService,
    CoffeeScaleService,
    CoffeeWeighingService,
    CoffeeQualityService,
    CoffeeOpsService,
    CoffeeStatsService,
    CoffeeReportsService,
  ],
})
export class CpepModule {}
