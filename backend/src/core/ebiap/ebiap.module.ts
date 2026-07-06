import { Module } from '@nestjs/common';
import { FormsModule } from '@/core/forms/forms.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { BiQueryEngineService } from './application/bi-query-engine.service';
import { BiAggregationService } from './application/bi-aggregation.service';
import { BiDashboardService } from './application/bi-dashboard.service';
import { BiWidgetService } from './application/bi-widget.service';
import { BiKpiService } from './application/bi-kpi.service';
import { BiReportService } from './application/bi-report.service';
import { BiExportService } from './application/bi-export.service';
import { BiQueryDefinitionService } from './application/bi-query-definition.service';
import { BiRealtimeService } from './application/bi-realtime.service';
import { BiAnalysisService } from './application/bi-analysis.service';
import { EbiapController } from './presentation/ebiap.controller';

@Module({
  imports: [FormsModule, EgsipModule, WorkflowsModule, EneacModule],
  controllers: [EbiapController],
  providers: [
    BiQueryEngineService,
    BiAggregationService,
    BiDashboardService,
    BiWidgetService,
    BiKpiService,
    BiReportService,
    BiExportService,
    BiQueryDefinitionService,
    BiRealtimeService,
    BiAnalysisService,
  ],
  exports: [BiQueryEngineService, BiAggregationService, BiKpiService],
})
export class EbiapModule {}
