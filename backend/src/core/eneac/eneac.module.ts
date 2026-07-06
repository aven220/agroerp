import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EneacRecipientResolver } from './application/eneac-recipient.resolver';
import { EneacDispatcherService } from './application/eneac-dispatcher.service';
import { EneacRuleEngine } from './application/eneac-rule.engine';
import { EneacNotificationService } from './application/eneac-notification.service';
import { EneacEventBridgeService } from './application/eneac-event-bridge.service';
import { EneacInboxService } from './application/eneac-inbox.service';
import { EneacRulesService } from './application/eneac-rules.service';
import { EneacSchedulerService } from './application/eneac-scheduler.service';
import { EneacEscalationService } from './application/eneac-escalation.service';
import { EneacMetricsService } from './application/eneac-metrics.service';
import { EneacDevicesService } from './application/eneac-devices.service';
import { EneacExternalEventsService } from './application/eneac-external-events.service';
import { EneacController, EneacInboxController } from './presentation/eneac.controller';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EneacController, EneacInboxController],
  providers: [
    EneacRuleEngine,
    EneacRecipientResolver,
    EneacDispatcherService,
    EneacNotificationService,
    EneacEventBridgeService,
    EneacInboxService,
    EneacRulesService,
    EneacSchedulerService,
    EneacEscalationService,
    EneacMetricsService,
    EneacDevicesService,
    EneacExternalEventsService,
  ],
  exports: [
    EneacDispatcherService,
    EneacNotificationService,
    EneacInboxService,
    EneacMetricsService,
  ],
})
export class EneacModule {}
