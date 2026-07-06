import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { PrmReportsService } from '../application/prm-reports.service';

@ApiTags('PRM — Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prm/reports')
export class PrmReportsController {
  constructor(private readonly reports: PrmReportsService) {}

  @Get('padron')
  @RequirePermissions('report:read')
  padron(
    @CurrentUser() user: { organizationId: string },
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('municipalityCode') municipalityCode?: string,
  ) {
    return this.reports.padron(user.organizationId, {
      lifecycleStatus,
      municipalityCode,
    });
  }

  @Get('altas-periodo')
  @RequirePermissions('report:read')
  altas(
    @CurrentUser() user: { organizationId: string },
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('municipalityCode') municipalityCode?: string,
  ) {
    return this.reports.altasPorPeriodo(user.organizationId, {
      fromDate,
      toDate,
      municipalityCode,
    });
  }

  @Get('por-estado')
  @RequirePermissions('report:read')
  porEstado(@CurrentUser() user: { organizationId: string }) {
    return this.reports.porEstadoLifecycle(user.organizationId);
  }

  @Get('cartera-comprador')
  @RequirePermissions('report:read')
  carteraComprador(
    @CurrentUser() user: { organizationId: string },
    @Query('municipalityCode') municipalityCode?: string,
  ) {
    return this.reports.carteraPorComprador(user.organizationId, {
      municipalityCode,
    });
  }

  @Get('cartera-tecnico')
  @RequirePermissions('report:read')
  carteraTecnico(
    @CurrentUser() user: { organizationId: string },
    @Query('municipalityCode') municipalityCode?: string,
  ) {
    return this.reports.carteraPorTecnico(user.organizationId, {
      municipalityCode,
    });
  }

  @Get('certificaciones-vencer')
  @RequirePermissions('report:read')
  certificaciones(
    @CurrentUser() user: { organizationId: string },
    @Query('days') days?: string,
  ) {
    return this.reports.certificacionesPorVencer(
      user.organizationId,
      days ? parseInt(days, 10) : 90,
    );
  }

  @Get('segmento')
  @RequirePermissions('report:read')
  segmento(
    @CurrentUser() user: { organizationId: string },
    @Query('segmentId') segmentId: string,
  ) {
    return this.reports.segmentoProductores(user.organizationId, segmentId);
  }
}
