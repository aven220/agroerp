import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EbreModule } from '@/core/ebre/ebre.module';
import { EamipModule } from '@/core/eamip/eamip.module';
import { EihModule } from '@/core/eih/eih.module';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { EipController } from './presentation/eip.controller';
import { EipAuditService } from './application/eip-audit.service';
import { EipBreService } from './application/eip-bre.service';
import { EipBridgeService } from './application/eip-bridge.service';
import { EipConnectorService } from './application/eip-connector.service';
import { EipEngineService, EipOfflineService } from './application/eip-engine.service';
import { EipEsbService } from './application/eip-esb.service';
import { EipEventBusService } from './application/eip-event-bus.service';
import { EipGatewayService } from './application/eip-gateway.service';
import { EipMessagingService } from './application/eip-messaging.service';
import { EipMonitoringService } from './application/eip-monitoring.service';
import { EipWebhookService } from './application/eip-webhook.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EbreModule, EamipModule, EihModule],
  controllers: [EipController],
  providers: [
    EipPrismaService,
    EipAuditService,
    EipBreService,
    EipGatewayService,
    EipWebhookService,
    EipEsbService,
    EipEventBusService,
    EipConnectorService,
    EipMessagingService,
    EipMonitoringService,
    EipBridgeService,
    EipOfflineService,
    EipEngineService,
  ],
  exports: [EipEngineService, EipBridgeService, EipEventBusService],
})
export class EipModule {}
