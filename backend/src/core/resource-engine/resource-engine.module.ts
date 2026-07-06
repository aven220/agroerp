import { Module } from '@nestjs/common';
import { ResourcesService } from './application/resources.service';
import { ResourcesController } from './presentation/resources.controller';
import { MetadataModule } from '@/core/metadata/metadata.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { FilesController } from './presentation/files.controller';
import { FilesService } from './application/files.service';

@Module({
  imports: [MetadataModule, CoreEngineModule],
  controllers: [ResourcesController, FilesController],
  providers: [ResourcesService, FilesService],
  exports: [ResourcesService, FilesService],
})
export class ResourceEngineModule {}
