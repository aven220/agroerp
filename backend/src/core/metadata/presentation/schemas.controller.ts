import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetadataService } from '../application/metadata.service';
import { CreateSchemaDto, UpdateSchemaDto } from './schemas.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';

@ApiTags('Metadata Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('metadata/schemas')
export class SchemasController {
  constructor(private readonly metadata: MetadataService) {}

  @Get()
  @RequirePermissions('metadata:read')
  @ApiOperation({ summary: 'List resource schemas' })
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.metadata.findAll(user.organizationId);
  }

  @Get('active/:resourceType')
  @RequirePermissions('metadata:read')
  @ApiOperation({ summary: 'Get active schema for resource type' })
  findActive(
    @CurrentUser() user: { organizationId: string },
    @Param('resourceType') resourceType: string,
  ) {
    return this.metadata.findActiveSchema(user.organizationId, resourceType);
  }

  @Get(':id')
  @RequirePermissions('metadata:read')
  @ApiOperation({ summary: 'Get schema by id' })
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.metadata.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('metadata:create')
  @ApiOperation({ summary: 'Create new schema version' })
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateSchemaDto,
  ) {
    return this.metadata.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('metadata:update')
  @ApiOperation({ summary: 'Update schema' })
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSchemaDto,
  ) {
    return this.metadata.update(user.organizationId, id, dto);
  }
}
