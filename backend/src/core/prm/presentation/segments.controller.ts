import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { SegmentsService } from '../application/segments.service';
import { CreateSegmentDto } from './producers.dto';

@ApiTags('PRM — Segmentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prm/segments')
export class SegmentsController {
  constructor(private readonly segments: SegmentsService) {}

  @Get()
  @RequirePermissions('producer:read')
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.segments.findAll(user.organizationId);
  }

  @Post()
  @RequirePermissions('producer:admin')
  @ApiOperation({ summary: 'Crear segmento' })
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segments.create(user.organizationId, user.id, dto);
  }

  @Post(':id/recalculate')
  @RequirePermissions('producer:admin')
  recalculate(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.segments.recalculate(user.organizationId, id);
  }

  @Get(':id/producers')
  @RequirePermissions('producer:read')
  getProducers(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.segments.getProducers(
      user.organizationId,
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
    );
  }
}
