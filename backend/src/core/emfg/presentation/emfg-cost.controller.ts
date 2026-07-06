import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmfgWipStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgCostActualService } from '../application/emfg-cost-actual.service';
import { EmfgCostEngineService } from '../application/emfg-cost-engine.service';
import { EmfgCostIndicatorsService } from '../application/emfg-cost-indicators.service';
import { EmfgCostStandardService } from '../application/emfg-cost-standard.service';
import { EmfgCostVarianceService } from '../application/emfg-cost-variance.service';
import { EmfgCostWipService } from '../application/emfg-cost-wip.service';
import { EmfgCostActualDto, EmfgCostComputeDto, EmfgCostLineUpdateDto, EmfgCostVersionDto } from './emfg-cost.dto';

@ApiTags('EMFG — Motor de Costos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg/cost')
export class EmfgCostController {
  constructor(
    private readonly standard: EmfgCostStandardService,
    private readonly actual: EmfgCostActualService,
    private readonly wip: EmfgCostWipService,
    private readonly variance: EmfgCostVarianceService,
    private readonly indicators: EmfgCostIndicatorsService,
    private readonly engine: EmfgCostEngineService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('manufacturing:cost')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Get('history')
  @RequirePermissions('manufacturing:cost')
  history(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.history(user.organizationId);
  }

  @Get('standards')
  @RequirePermissions('manufacturing:cost')
  listStandards(@CurrentUser() user: { organizationId: string }) {
    return this.standard.listVersions(user.organizationId);
  }

  @Get('standards/:versionKey')
  @RequirePermissions('manufacturing:cost')
  getStandard(
    @CurrentUser() user: { organizationId: string },
    @Param('versionKey') versionKey: string,
  ) {
    return this.standard.getVersion(user.organizationId, versionKey);
  }

  @Post('standards')
  @RequirePermissions('manufacturing:cost')
  createStandard(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgCostVersionDto,
  ) {
    return this.standard.createVersion(user.organizationId, user.id, dto);
  }

  @Post('standards/from-order/:orderKey')
  @RequirePermissions('manufacturing:cost')
  buildStandardFromOrder(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.standard.buildFromOrder(user.organizationId, user.id, orderKey);
  }

  @Get('standards/history')
  @RequirePermissions('manufacturing:cost')
  standardHistory(
    @CurrentUser() user: { organizationId: string },
    @Query('versionKey') versionKey?: string,
  ) {
    return this.standard.history(user.organizationId, versionKey);
  }

  @Patch('standards/lines/:lineKey')
  @RequirePermissions('manufacturing:cost')
  updateStandardLine(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('lineKey') lineKey: string,
    @Body() dto: EmfgCostLineUpdateDto,
  ) {
    return this.standard.updateLine(user.organizationId, user.id, lineKey, dto.unitCost);
  }

  @Get('wip')
  @RequirePermissions('manufacturing:cost')
  listWip(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EmfgWipStatus,
  ) {
    return this.wip.list(user.organizationId, status);
  }

  @Get('wip/:orderKey')
  @RequirePermissions('manufacturing:cost')
  getWip(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.wip.get(user.organizationId, orderKey);
  }

  @Post('wip/:orderKey/transfer')
  @RequirePermissions('manufacturing:cost')
  transferWip(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.wip.transferToFg(user.organizationId, user.id, orderKey);
  }

  @Post('wip/:orderKey/close')
  @RequirePermissions('manufacturing:cost')
  closeWip(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.wip.close(user.organizationId, user.id, orderKey);
  }

  @Get('orders/:orderKey/actuals')
  @RequirePermissions('manufacturing:cost')
  listActuals(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.actual.list(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/actuals')
  @RequirePermissions('manufacturing:cost')
  recordActual(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgCostActualDto,
  ) {
    return this.actual.recordLine(user.organizationId, user.id, orderKey, dto);
  }

  @Post('orders/:orderKey/calculate')
  @RequirePermissions('manufacturing:cost')
  calculateActual(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.actual.calculateFromOrder(user.organizationId, user.id, orderKey);
  }

  @Get('variances')
  @RequirePermissions('manufacturing:cost')
  listVariances(
    @CurrentUser() user: { organizationId: string },
    @Query('orderKey') orderKey?: string,
  ) {
    return this.variance.list(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/variances')
  @RequirePermissions('manufacturing:cost')
  computeVariances(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgCostComputeDto,
  ) {
    return this.variance.computeForOrder(user.organizationId, user.id, orderKey, dto.salesPrice ?? 0);
  }

  @Post('orders/:orderKey/run')
  @RequirePermissions('manufacturing:cost')
  runFull(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgCostComputeDto,
  ) {
    return this.engine.runFullCalculation(user.organizationId, user.id, orderKey, dto.salesPrice ?? 0);
  }
}
