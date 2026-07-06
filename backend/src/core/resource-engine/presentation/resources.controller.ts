import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourcesService } from '../application/resources.service';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

export class CreateResourceDto {
  @ApiProperty({ example: 'generic_entity' })
  @IsString()
  @IsNotEmpty()
  resourceType!: string;

  @ApiPropertyOptional({ description: 'Dynamic data validated by Metadata Engine' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

@ApiTags('Resource Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @RequirePermissions('resource:read')
  @ApiOperation({ summary: 'List resources' })
  @ApiQuery({ name: 'type', required: false })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('type') type?: string,
  ) {
    return this.resourcesService.findAll(user.organizationId, type);
  }

  @Get(':id')
  @RequirePermissions('resource:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.resourcesService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('resource:create')
  @ApiOperation({ summary: 'Create generic resource' })
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateResourceDto,
    @Req() req: AgroRequest,
  ) {
    return this.resourcesService.create(
      user.organizationId,
      dto,
      user.id,
      req.agroContext,
    );
  }

  @Patch(':id')
  @RequirePermissions('resource:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @Req() req: AgroRequest,
  ) {
    return this.resourcesService.update(
      user.organizationId,
      id,
      dto,
      user.id,
      req.agroContext,
    );
  }

  @Delete(':id')
  @RequirePermissions('resource:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.resourcesService.remove(
      user.organizationId,
      id,
      user.id,
      req.agroContext,
    );
  }
}
