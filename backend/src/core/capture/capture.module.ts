import { Module } from '@nestjs/common';
import { FormsModule } from '@/core/forms/forms.module';
import { CaptureQueryService } from './application/capture-query.service';
import { CaptureSyncService } from './application/capture-sync.service';
import { CaptureAssignmentService } from './application/capture-assignment.service';
import { CapturePackageService } from './application/capture-package.service';
import { CaptureCatalogService } from './application/capture-catalog.service';
import { CaptureController } from './presentation/capture.controller';

@Module({
  imports: [FormsModule],
  controllers: [CaptureController],
  providers: [
    CaptureQueryService,
    CaptureSyncService,
    CaptureAssignmentService,
    CapturePackageService,
    CaptureCatalogService,
  ],
  exports: [
    CaptureQueryService,
    CaptureSyncService,
    CaptureAssignmentService,
    CapturePackageService,
    CaptureCatalogService,
  ],
})
export class CaptureModule {}
