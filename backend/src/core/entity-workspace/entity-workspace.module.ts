import { Module } from '@nestjs/common';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { FormsModule } from '@/core/forms/forms.module';
import { AgriculturalTimelineModule } from '@/core/agricultural-timeline/agricultural-timeline.module';
import { EntityWorkspaceService } from './application/entity-workspace.service';
import { WorkspaceBuilderService } from './application/workspace-builder.service';
import { WorkspaceLayoutService } from './application/workspace-layout.service';
import { WorkspaceSectionService } from './application/workspace-section.service';
import { EntityWorkspaceController } from './presentation/entity-workspace.controller';
import { SummaryProvider } from './providers/summary.provider';
import { TimelineProvider } from './providers/timeline.provider';
import { FormsProvider } from './providers/forms.provider';
import { RelationshipsProvider } from './providers/relationships.provider';
import { DocumentsProvider } from './providers/documents.provider';
import { GalleryProvider } from './providers/gallery.provider';
import { AnalyticsProvider } from './providers/analytics.provider';
import { HealthProvider } from './providers/health.provider';
import { InsightsProvider } from './providers/insights.provider';
import {
  WORKSPACE_PROVIDERS,
  type WorkspaceProvider,
} from './interfaces/workspace-provider.interface';

@Module({
  imports: [PrmModule, FtipModule, FmdtModule, FormsModule, AgriculturalTimelineModule],
  controllers: [EntityWorkspaceController],
  providers: [
    SummaryProvider,
    TimelineProvider,
    FormsProvider,
    RelationshipsProvider,
    DocumentsProvider,
    GalleryProvider,
    AnalyticsProvider,
    HealthProvider,
    InsightsProvider,
    {
      provide: WORKSPACE_PROVIDERS,
      useFactory: (
        summary: SummaryProvider,
        timeline: TimelineProvider,
        forms: FormsProvider,
        relationships: RelationshipsProvider,
        documents: DocumentsProvider,
        gallery: GalleryProvider,
        analytics: AnalyticsProvider,
        health: HealthProvider,
        insights: InsightsProvider,
      ): WorkspaceProvider[] => [
        summary,
        timeline,
        forms,
        relationships,
        documents,
        gallery,
        analytics,
        health,
        insights,
      ],
      inject: [
        SummaryProvider,
        TimelineProvider,
        FormsProvider,
        RelationshipsProvider,
        DocumentsProvider,
        GalleryProvider,
        AnalyticsProvider,
        HealthProvider,
        InsightsProvider,
      ],
    },
    WorkspaceSectionService,
    WorkspaceLayoutService,
    WorkspaceBuilderService,
    EntityWorkspaceService,
  ],
  exports: [EntityWorkspaceService, WorkspaceBuilderService],
})
export class EntityWorkspaceModule {}
