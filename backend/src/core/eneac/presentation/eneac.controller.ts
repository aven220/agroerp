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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EneacInboxService } from '../application/eneac-inbox.service';
import { EneacRulesService } from '../application/eneac-rules.service';
import { EneacMetricsService } from '../application/eneac-metrics.service';
import { EneacSchedulerService } from '../application/eneac-scheduler.service';
import { EneacEscalationService } from '../application/eneac-escalation.service';
import { EneacDevicesService } from '../application/eneac-devices.service';
import { EneacExternalEventsService } from '../application/eneac-external-events.service';
import { EneacNotificationService } from '../application/eneac-notification.service';
import { EneacDispatcherService } from '../application/eneac-dispatcher.service';
import {
  CreateNotificationRuleDto,
  CreateScheduleDto,
  ExternalEventDto,
  InboxAssignDto,
  InboxCommentDto,
  InboxImportantDto,
  RegisterDeviceTokenDto,
  SendNotificationDto,
  UpdateNotificationRuleDto,
} from './eneac.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('ENEAC — Inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eneac/inbox')
export class EneacInboxController {
  constructor(private readonly inbox: EneacInboxService) {}

  @Get()
  @RequirePermissions('notification:read')
  findAll(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('severity') severity?: string,
    @Query('groupKey') groupKey?: string,
    @Query('important') important?: string,
  ) {
    return this.inbox.findInbox(user.organizationId, user.id, {
      status,
      search,
      severity,
      groupKey,
      important: important === 'true',
    });
  }

  @Patch(':id/read')
  @RequirePermissions('notification:update')
  markRead(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.inbox.markRead(user.organizationId, id, user.id);
  }

  @Patch(':id/important')
  @RequirePermissions('notification:update')
  markImportant(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: InboxImportantDto,
  ) {
    return this.inbox.markImportant(user.organizationId, id, user.id, dto.important);
  }

  @Patch(':id/archive')
  @RequirePermissions('notification:update')
  archive(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.inbox.archive(user.organizationId, id, user.id);
  }

  @Delete(':id')
  @RequirePermissions('notification:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.inbox.remove(user.organizationId, id, user.id);
  }

  @Post(':id/comment')
  @RequirePermissions('notification:update')
  comment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: InboxCommentDto,
  ) {
    return this.inbox.comment(user.organizationId, id, user.id, dto.content);
  }

  @Post(':id/reply')
  @RequirePermissions('notification:update')
  reply(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: InboxCommentDto,
  ) {
    return this.inbox.reply(user.organizationId, id, user.id, dto.content);
  }

  @Post(':id/assign')
  @RequirePermissions('notification:admin')
  assign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: InboxAssignDto,
  ) {
    return this.inbox.assign(user.organizationId, id, dto.userId, user.id);
  }

  @Post(':id/attend')
  @RequirePermissions('alert:acknowledge')
  attend(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.inbox.attend(user.organizationId, id, user.id);
  }
}

@ApiTags('ENEAC — Rules & Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eneac')
export class EneacController {
  constructor(
    private readonly rules: EneacRulesService,
    private readonly metrics: EneacMetricsService,
    private readonly scheduler: EneacSchedulerService,
    private readonly escalation: EneacEscalationService,
    private readonly devices: EneacDevicesService,
    private readonly external: EneacExternalEventsService,
    private readonly notifications: EneacNotificationService,
    private readonly dispatcher: EneacDispatcherService,
    private readonly inbox: EneacInboxService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('notification:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.metrics.getDashboard(user.organizationId);
  }

  @Get('timeline')
  @RequirePermissions('notification:read')
  timeline(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.metrics.getTimeline(
      user.organizationId,
      from,
      to,
      eventType,
      limit ? Number(limit) : 100,
    );
  }

  @Get('rules')
  @RequirePermissions('notification:rule:read')
  listRules(@CurrentUser() user: { organizationId: string }) {
    return this.rules.findAll(user.organizationId);
  }

  @Get('rules/:id')
  @RequirePermissions('notification:rule:read')
  getRule(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.findOne(user.organizationId, id);
  }

  @Post('rules')
  @RequirePermissions('notification:rule:create')
  createRule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateNotificationRuleDto,
  ) {
    return this.rules.create(user.organizationId, user.id, dto);
  }

  @Patch('rules/:id')
  @RequirePermissions('notification:rule:update')
  updateRule(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateNotificationRuleDto,
  ) {
    return this.rules.update(user.organizationId, id, dto);
  }

  @Post('rules/:id/activate')
  @RequirePermissions('notification:rule:publish')
  activateRule(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.activate(user.organizationId, id);
  }

  @Post('rules/:id/deactivate')
  @RequirePermissions('notification:rule:update')
  deactivateRule(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.rules.deactivate(user.organizationId, id);
  }

  @Post('send')
  @RequirePermissions('notification:send')
  send(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: SendNotificationDto,
  ) {
    return this.notifications.sendDirect(user.organizationId, dto);
  }

  @Post('events/external')
  @RequirePermissions('notification:send')
  @ApiOperation({ summary: 'Ingest external event via API' })
  externalEvent(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ExternalEventDto,
    @Req() req: AgroRequest,
  ) {
    return this.external.ingest(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('schedules')
  @RequirePermissions('notification:read')
  listSchedules(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('recipientId') recipientId?: string,
  ) {
    return this.scheduler.findAll(
      user.organizationId,
      recipientId ?? user.id,
    );
  }

  @Post('schedules')
  @RequirePermissions('notification:create')
  createSchedule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateScheduleDto,
  ) {
    return this.scheduler.create(user.organizationId, user.id, dto);
  }

  @Post('schedules/process')
  @RequirePermissions('notification:admin')
  processSchedules(@CurrentUser() user: { organizationId: string }) {
    return this.scheduler.processDue(user.organizationId);
  }

  @Post('escalation/process')
  @RequirePermissions('notification:admin')
  processEscalation(@CurrentUser() user: { organizationId: string }) {
    return this.escalation.processEscalations(user.organizationId);
  }

  @Post('deliveries/retry')
  @RequirePermissions('notification:admin')
  retryDeliveries(@CurrentUser() user: { organizationId: string }) {
    return this.dispatcher.retryFailed(user.organizationId);
  }

  @Post('devices/register')
  @RequirePermissions('notification:update')
  registerDevice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.devices.registerToken(user.organizationId, user.id, dto);
  }

  @Post('sync/mobile')
  @RequirePermissions('notification:read')
  @ApiOperation({ summary: 'Mobile sync — inbox + pending read receipts' })
  async mobileSync(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() body: { readIds?: string[]; attendIds?: string[] },
  ) {
    const inbox = await this.inbox.findInbox(user.organizationId, user.id);
    if (body.readIds?.length) {
      for (const id of body.readIds) {
        await this.inbox.markRead(user.organizationId, id, user.id).catch(() => null);
      }
    }
    if (body.attendIds?.length) {
      for (const id of body.attendIds) {
        await this.inbox.attend(user.organizationId, id, user.id).catch(() => null);
      }
    }
    return {
      syncedAt: new Date().toISOString(),
      inbox,
      unreadCount: inbox.filter((m) => m.status === 'unread').length,
    };
  }
}
