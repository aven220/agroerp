import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventService } from '../application/event.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';

@ApiTags('Event Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermissions('event:read')
  @ApiOperation({ summary: 'List events for organization' })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('eventType') eventType?: string,
    @Query('limit') limit = '50',
  ) {
    const events = await this.prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
        eventType,
      },
      orderBy: { globalSequence: 'desc' },
      take: Number(limit),
    });

    return events.map((e) => ({
      ...e,
      globalSequence: e.globalSequence.toString(),
      version: e.version.toString(),
    }));
  }

  @Get('aggregate/:type/:id')
  @RequirePermissions('event:read')
  @ApiOperation({ summary: 'Events for a specific aggregate' })
  findByAggregate(
    @CurrentUser() user: { organizationId: string },
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.events.getByAggregate(type, id, user.organizationId);
  }
}
