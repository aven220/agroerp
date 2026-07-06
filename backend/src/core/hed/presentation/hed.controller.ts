import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HedDashboardService } from '../application/hed-dashboard.service';
import { HedAuditService } from '../application/hed-audit.service';

@ApiTags('HCM — Dashboard Ejecutivo RRHH')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/executive-dashboard')
export class HedController {
  constructor(
    private readonly dashboard: HedDashboardService,
    private readonly audit: HedAuditService,
  ) {}

  @Get()
  @RequirePermissions('hcm:hed_read')
  getDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('departmentKey') departmentKey?: string,
  ) {
    return this.dashboard.dashboard(user.organizationId, user.id, {
      from, to, companyKey, branchKey, departmentKey,
    });
  }

  @Get('kpis')
  @RequirePermissions('hcm:hed_read')
  async getKpis(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.dashboard.dashboard(user.organizationId, user.id, { from, to });
    return { kpis: data.kpis, attendance: data.attendance, training: data.training, performance: data.performance };
  }

  @Get('charts')
  @RequirePermissions('hcm:hed_read')
  async getCharts(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.dashboard.dashboard(user.organizationId, user.id, { from, to });
    return { charts: data.charts, filters: data.filters };
  }

  @Post('export')
  @RequirePermissions('hcm:hed_export')
  exportDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('departmentKey') departmentKey?: string,
  ) {
    return this.dashboard.exportSnapshot(user.organizationId, user.id, {
      from, to, companyKey, branchKey, departmentKey,
    });
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:hed_read')
  mobileSync(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.mobileSync(user.organizationId, user.id, { from, to });
  }

  @Get('load-check')
  @RequirePermissions('hcm:hed_read')
  loadCheck(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.loadCheck(user.organizationId);
  }

  @Get('audit')
  @RequirePermissions('hcm:hed_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.audit.list(user.organizationId);
  }
}
