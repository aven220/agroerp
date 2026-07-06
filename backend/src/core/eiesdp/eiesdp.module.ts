import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EiesdpController } from './presentation/eiesdp.controller';
import { DeviceAuditService } from './application/device-audit.service';
import { DeviceSecurityService } from './application/device-security.service';
import { DeviceDigitalTwinService } from './application/device-digital-twin.service';
import { DeviceRegistryService } from './application/device-registry.service';
import { DeviceTelemetryService } from './application/device-telemetry.service';
import { DeviceAlertService } from './application/device-alert.service';
import { DeviceEdgeService } from './application/device-edge.service';
import { DeviceFirmwareService } from './application/device-firmware.service';
import { DeviceDriverService } from './application/device-driver.service';
import { DeviceMqttBridgeService } from './application/device-mqtt.bridge';
import { DeviceIngestGatewayService } from './application/device-ingest.gateway';
import { DeviceMetricsService } from './application/device-metrics.service';
import { DeviceAiService } from './application/device-ai.service';
import { DeviceSchedulerService } from './application/device-scheduler.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EiesdpController],
  providers: [
    DeviceAuditService,
    DeviceSecurityService,
    DeviceDigitalTwinService,
    DeviceRegistryService,
    DeviceTelemetryService,
    DeviceAlertService,
    DeviceEdgeService,
    DeviceFirmwareService,
    DeviceDriverService,
    DeviceMqttBridgeService,
    DeviceIngestGatewayService,
    DeviceMetricsService,
    DeviceAiService,
    DeviceSchedulerService,
  ],
  exports: [DeviceRegistryService, DeviceTelemetryService, DeviceIngestGatewayService],
})
export class EiesdpModule {}
