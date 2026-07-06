import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { FtipReportsService } from '../application/ftip-reports.service';

@ApiTags('FTIP — Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ftip/reports')
export class FtipReportsController {
  constructor(private readonly reports: FtipReportsService) {}

  @Get(':reportCode')
  @RequirePermissions('farm:export')
  run(
    @CurrentUser() user: { organizationId: string },
    @Param('reportCode') reportCode: string,
    @Query('status') status?: string,
    @Query('municipalityCode') municipalityCode?: string,
    @Query('farmUnitId') farmUnitId?: string,
  ) {
    return this.reports.runReport(user.organizationId, reportCode, {
      status: status ?? '',
      municipalityCode: municipalityCode ?? '',
      farmUnitId: farmUnitId ?? '',
    });
  }
}
