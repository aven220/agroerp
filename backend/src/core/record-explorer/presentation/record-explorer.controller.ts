import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { assertEntityReadPermission } from '@/shared/application/entity-read-authorization';
import { RecordExplorerAggregatorService } from '../application/record-explorer-aggregator.service';

@ApiTags('Record Explorer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('record-explorer')
export class RecordExplorerController {
  constructor(private readonly aggregator: RecordExplorerAggregatorService) {}

  @Get(':entity/:id')
  @ApiOperation({ summary: 'Universal Record Explorer — aggregated entity view' })
  explore(
    @CurrentUser() user: { organizationId: string; permissions?: string[] },
    @Param('entity') entity: string,
    @Param('id') id: string,
  ) {
    assertEntityReadPermission(user, entity);
    return this.aggregator.explore(user.organizationId, entity, id);
  }
}
