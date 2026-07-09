import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { assertEntityReadPermission } from '@/shared/application/entity-read-authorization';
import { AgriculturalTimelineService } from '../application/agricultural-timeline.service';
import { TimelineQueryService } from '../application/timeline-query.service';

@ApiTags('Agricultural Timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agricultural-timeline')
export class AgriculturalTimelineController {
  constructor(
    private readonly timeline: AgriculturalTimelineService,
    private readonly queryService: TimelineQueryService,
  ) {}

  @Get(':entity/:id')
  @ApiOperation({ summary: 'Unified agricultural timeline for an ERP entity' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated event types' })
  @ApiQuery({ name: 'limit', required: false })
  getTimeline(
    @CurrentUser() user: { organizationId: string; permissions?: string[] },
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    assertEntityReadPermission(user, entity);
    const filter = this.queryService.parseFilter({ from, to, types, limit });
    return this.timeline.getTimeline(user.organizationId, entity, id, filter);
  }
}
