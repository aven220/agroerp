import { Module, forwardRef } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EbreModule } from '@/core/ebre/ebre.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { EaidspModule } from '@/core/eaidsp/eaidsp.module';
import { SyncModule } from '@/core/sync/sync.module';
import { EsdjeController } from './presentation/esdje.controller';
import { JobRetryEngine } from './application/job-retry.engine';
import { JobQueueService } from './application/job-queue.service';
import { JobSchedulerService } from './application/job-scheduler.service';
import { JobWorkerPoolService } from './application/job-worker-pool.service';
import { JobExecutorService } from './application/job-executor.service';
import { JobDeadLetterService } from './application/job-dead-letter.service';
import { JobMaintenanceService } from './application/job-maintenance.service';
import { JobDispatcherService } from './application/job-dispatcher.service';
import { JobDefinitionsService } from './application/job-definitions.service';
import { JobEventBridgeService } from './application/job-event-bridge.service';
import { JobMetricsService } from './application/job-metrics.service';
import { JobAiService } from './application/job-ai.service';

@Module({
  imports: [
    EventsModule,
    CoreEngineModule,
    forwardRef(() => EbreModule),
    WorkflowsModule,
    EneacModule,
    EaidspModule,
    SyncModule,
  ],
  controllers: [EsdjeController],
  providers: [
    JobRetryEngine,
    JobQueueService,
    JobSchedulerService,
    JobWorkerPoolService,
    JobExecutorService,
    JobDeadLetterService,
    JobMaintenanceService,
    JobDispatcherService,
    JobDefinitionsService,
    JobEventBridgeService,
    JobMetricsService,
    JobAiService,
  ],
  exports: [JobDispatcherService, JobDefinitionsService, JobMetricsService],
})
export class EsdjeModule {}
