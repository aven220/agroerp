import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { FmdtReportsService } from '../application/fmdt-reports.service';

@ApiTags('FMDT — Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fmdt/reports')
export class FmdtReportsController {
  constructor(private readonly reports: FmdtReportsService) {}

  @Get(':reportCode')
  @RequirePermissions('lot:export')
  run(
    @CurrentUser() user: { organizationId: string },
    @Param('reportCode') reportCode: string,
    @Query() params: Record<string, string>,
  ) {
    return this.reports.run(user.organizationId, reportCode, params);
  }
}
