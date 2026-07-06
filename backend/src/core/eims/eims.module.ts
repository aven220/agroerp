import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EimsController } from './presentation/eims.controller';
import { EimsAuditService } from './application/eims-audit.service';
import { EimsCatalogService } from './application/eims-catalog.service';
import { EimsParameterService } from './application/eims-parameter.service';
import { EimsWarehouseService } from './application/eims-warehouse.service';
import { EimsLocationService } from './application/eims-location.service';
import { EimsItemService } from './application/eims-item.service';
import { EimsConfigService } from './application/eims-config.service';
import { EimsMovementService } from './application/eims-movement.service';
import { EimsKardexService } from './application/eims-kardex.service';
import { EimsPeriodService } from './application/eims-period.service';
import { EimsLotService } from './application/eims-lot.service';
import { EimsTraceabilityService } from './application/eims-traceability.service';
import { EimsTransformService } from './application/eims-transform.service';
import { EimsSerialService } from './application/eims-serial.service';
import { EimsCountService } from './application/eims-count.service';
import { EimsReservationService } from './application/eims-reservation.service';
import { EimsSupplyService } from './application/eims-supply.service';
import { EimsForecastService } from './application/eims-forecast.service';
import { EimsOpsService } from './application/eims-ops.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EimsController],
  providers: [
    EimsAuditService,
    EimsCatalogService,
    EimsParameterService,
    EimsWarehouseService,
    EimsLocationService,
    EimsItemService,
    EimsConfigService,
    EimsKardexService,
    EimsPeriodService,
    EimsTraceabilityService,
    EimsLotService,
    EimsSerialService,
    EimsMovementService,
    EimsTransformService,
    EimsCountService,
    EimsReservationService,
    EimsSupplyService,
    EimsForecastService,
    EimsOpsService,
  ],
  exports: [
    EimsCatalogService,
    EimsParameterService,
    EimsWarehouseService,
    EimsLocationService,
    EimsItemService,
    EimsConfigService,
    EimsMovementService,
    EimsKardexService,
    EimsPeriodService,
    EimsLotService,
    EimsTraceabilityService,
    EimsTransformService,
    EimsSerialService,
    EimsCountService,
    EimsReservationService,
    EimsSupplyService,
    EimsForecastService,
    EimsOpsService,
  ],
})
export class EimsModule {}
