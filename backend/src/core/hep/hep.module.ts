import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { HepController } from './presentation/hep.controller';
import { HepDashboardService } from './application/hep-dashboard.service';
import { HepAuditService } from './application/hep-audit.service';
import { HepRequestService } from './application/hep-request.service';
import { HepPayrollDocsService } from './application/hep-payroll-docs.service';

@Module({
  imports: [CoreEngineModule],
  controllers: [HepController],
  providers: [HepDashboardService, HepAuditService, HepRequestService, HepPayrollDocsService],
  exports: [HepDashboardService, HepRequestService, HepPayrollDocsService],
})
export class HepModule {}
