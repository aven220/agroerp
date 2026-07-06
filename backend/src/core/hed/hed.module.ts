import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { HedController } from './presentation/hed.controller';
import { HedDashboardService } from './application/hed-dashboard.service';
import { HedAuditService } from './application/hed-audit.service';

@Module({
  imports: [CoreEngineModule],
  controllers: [HedController],
  providers: [HedDashboardService, HedAuditService],
  exports: [HedDashboardService],
})
export class HedModule {}
