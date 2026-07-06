import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SyncService } from '../application/sync.service';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';

@ApiTags('Sync Foundation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get('status')
  @RequirePermissions('sync:read')
  @ApiOperation({ summary: 'Sync status for organization' })
  status(@CurrentUser() user: { organizationId: string }) {
    return this.sync.getStatus(user.organizationId);
  }

  @Get('pull')
  @RequirePermissions('sync:read')
  @ApiOperation({ summary: 'Pull events since cursor (offline sync foundation)' })
  @ApiQuery({ name: 'cursor', required: false, example: '0' })
  @ApiQuery({ name: 'limit', required: false, example: '500' })
  pull(
    @CurrentUser() user: { organizationId: string },
    @Query('cursor') cursor = '0',
    @Query('limit') limit = '500',
  ) {
    return this.sync.pull(
      user.organizationId,
      BigInt(cursor),
      Number(limit),
    );
  }

  @Get('queue')
  @RequirePermissions('sync:read')
  @ApiOperation({ summary: 'Pending sync queue entries' })
  queue(@CurrentUser() user: { organizationId: string }) {
    return this.sync.getPending(user.organizationId);
  }
}
