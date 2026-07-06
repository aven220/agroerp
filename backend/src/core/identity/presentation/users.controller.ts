import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import {
  CreateUserDto,
  LockUserDto,
  UpdateUserDto,
  UpdateUserProfileDto,
} from '../application/dto/auth.dto';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List users in organization' })
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.usersService.findAll(user.organizationId);
  }

  @Get(':id/activity')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'User activity timeline (sessions, audit, events)' })
  getActivity(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getActivity(
      user.organizationId,
      id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Create user' })
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user' })
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.organizationId, id, dto, user.id);
  }

  @Patch(':id/profile')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user profile, preferences, avatar, signature' })
  updateProfile(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(user.organizationId, id, dto, user.id);
  }

  @Post(':id/lock')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Lock user and revoke all sessions' })
  lock(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LockUserDto,
  ) {
    return this.usersService.lock(user.organizationId, id, dto, user.id);
  }

  @Post(':id/unlock')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Unlock user account' })
  unlock(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.usersService.unlock(user.organizationId, id, user.id);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: 'Soft delete user' })
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.usersService.remove(user.organizationId, id, user.id);
  }
}
