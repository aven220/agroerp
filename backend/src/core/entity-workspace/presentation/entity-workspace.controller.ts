import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EntityWorkspaceService } from '../application/entity-workspace.service';

@ApiTags('Entity Workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entity-workspace')
export class EntityWorkspaceController {
  constructor(private readonly workspace: EntityWorkspaceService) {}

  @Get(':entity/:id')
  @ApiOperation({ summary: 'Universal entity workspace for ERP records' })
  getWorkspace(
    @CurrentUser() user: { organizationId: string },
    @Param('entity') entity: string,
    @Param('id') id: string,
  ) {
    return this.workspace.getWorkspace(user.organizationId, entity, id);
  }
}
