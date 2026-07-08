import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { EventsModule } from '@/core/events/events.module';
import { IdentityModule } from '@/core/identity/identity.module';
import { ResourceEngineModule } from '@/core/resource-engine/resource-engine.module';
import { MetadataModule } from '@/core/metadata/metadata.module';
import { AuditModule } from '@/core/audit/audit.module';
import { SyncModule } from '@/core/sync/sync.module';
import { FormsModule } from '@/core/forms/forms.module';
import { CaptureModule } from '@/core/capture/capture.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { EneacModule } from '@/core/eneac/eneac.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EaidspModule } from '@/core/eaidsp/eaidsp.module';
import { EamipModule } from '@/core/eamip/eamip.module';
import { EbreModule } from '@/core/ebre/ebre.module';
import { EsdjeModule } from '@/core/esdje/esdje.module';
import { EppmModule } from '@/core/eppm/eppm.module';
import { EiesdpModule } from '@/core/eiesdp/eiesdp.module';
import { EihModule } from '@/core/eih/eih.module';
import { EopModule } from '@/core/eop/eop.module';
import { EpopModule } from '@/core/epop/epop.module';
import { CpepModule } from '@/core/cpep/cpep.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EfmModule } from '@/core/efm/efm.module';
import { HcmModule } from '@/core/hcm/hcm.module';
import { HepModule } from '@/core/hep/hep.module';
import { HedModule } from '@/core/hed/hed.module';
import { HpaModule } from '@/core/hpa/hpa.module';
import { EmfgModule } from '@/core/emfg/emfg.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EamModule } from '@/core/eam/eam.module';
import { BpmsModule } from '@/core/bpms/bpms.module';
import { EipModule } from '@/core/eip/eip.module';
import { EintModule } from '@/core/eint/eint.module';
import { EopsModule } from '@/core/eops/eops.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EiwpModule } from '@/core/eiwp/eiwp.module';
import { EphpModule } from '@/core/ephp/ephp.module';
import { EatrModule } from '@/core/eatr/eatr.module';
import { EaccModule } from '@/core/eacc/eacc.module';
import { EffmModule } from '@/core/effm/effm.module';
import { EaipModule } from '@/core/eaip/eaip.module';
import { EaceModule } from '@/core/eace/eace.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { RecordExplorerModule } from '@/core/record-explorer/record-explorer.module';
import { AgriculturalTimelineModule } from '@/core/agricultural-timeline/agricultural-timeline.module';
import { EntityWorkspaceModule } from '@/core/entity-workspace/entity-workspace.module';
import { HealthController } from '@/core/platform/health.controller';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/shared/infrastructure/guards/permissions.guard';
import { TenantMiddleware } from '@/shared/infrastructure/middleware/tenant.middleware';
import { RequestContextMiddleware } from '@/core/engine/middleware/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    EventsModule,
    CoreEngineModule,
    MetadataModule,
    AuditModule,
    SyncModule,
    EiampModule,
    IdentityModule,
    ResourceEngineModule,
    FormsModule,
    CaptureModule,
    WorkflowsModule,
    PrmModule,
    FtipModule,
    FmdtModule,
    RecordExplorerModule,
    AgriculturalTimelineModule,
    EntityWorkspaceModule,
    EgsipModule,
    EneacModule,
    EbiapModule,
    EaidspModule,
    EamipModule,
    EbreModule,
    EsdjeModule,
    EppmModule,
    EiesdpModule,
    EihModule,
    EopModule,
    EpopModule,
    CpepModule,
    EimsModule,
    EscmModule,
    EfmModule,
    HcmModule,
    HepModule,
    HedModule,
    HpaModule,
    EmfgModule,
    EpscmModule,
    EamModule,
    BpmsModule,
    EipModule,
    EintModule,
    EopsModule,
    EatpModule,
    EappModule,
    EiwpModule,
    EphpModule,
    EatrModule,
    EaccModule,
    EffmModule,
    EaipModule,
    EaceModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, TenantMiddleware)
      .forRoutes('*');
  }
}
