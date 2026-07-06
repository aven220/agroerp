import { Module } from '@nestjs/common';
import { MetadataService } from './application/metadata.service';
import { FieldValidatorService } from './application/field-validator.service';
import { SchemasController } from './presentation/schemas.controller';

@Module({
  controllers: [SchemasController],
  providers: [MetadataService, FieldValidatorService],
  exports: [MetadataService, FieldValidatorService],
})
export class MetadataModule {}
