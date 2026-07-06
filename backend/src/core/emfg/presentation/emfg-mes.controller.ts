import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgMesConsumptionService } from '../application/emfg-mes-consumption.service';
import { EmfgMesExecutionService } from '../application/emfg-mes-execution.service';
import { EmfgMesMonitorService } from '../application/emfg-mes-monitor.service';
import { EmfgMesOfflineService } from '../application/emfg-mes-offline.service';
import { EmfgMesOperationService } from '../application/emfg-mes-operation.service';
import { EmfgMesProductionService } from '../application/emfg-mes-production.service';
import { EmfgMesTraceabilityService } from '../application/emfg-mes-traceability.service';
import {
  EmfgMesCaptureDto,
  EmfgMesConsumeDto,
  EmfgMesExecuteDto,
  EmfgMesLotDto,
  EmfgMesOfflineBatchDto,
  EmfgMesOpExecuteDto,
  EmfgMesProduceDto,
  EmfgMesSerialDto,
} from './emfg-mes.dto';

@ApiTags('EMFG — MES Ejecución')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg/mes')
export class EmfgMesController {
  constructor(
    private readonly execution: EmfgMesExecutionService,
    private readonly consumption: EmfgMesConsumptionService,
    private readonly production: EmfgMesProductionService,
    private readonly traceability: EmfgMesTraceabilityService,
    private readonly operations: EmfgMesOperationService,
    private readonly monitor: EmfgMesMonitorService,
    private readonly offline: EmfgMesOfflineService,
  ) {}

  @Get('monitor')
  @RequirePermissions('manufacturing:execute')
  monitorDashboard(
    @CurrentUser() user: { organizationId: string },
    @Query('centerKey') centerKey?: string,
  ) {
    return this.monitor.dashboard(user.organizationId, centerKey);
  }

  @Get('orders/:orderKey/tracking')
  @RequirePermissions('manufacturing:execute')
  tracking(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.monitor.orderTracking(user.organizationId, orderKey);
  }

  @Get('orders/:orderKey/executions')
  @RequirePermissions('manufacturing:execute')
  listExecutions(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.execution.listExecutions(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/execute')
  @RequirePermissions('manufacturing:execute')
  execute(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesExecuteDto,
  ) {
    return this.execution.execute(user.organizationId, user.id, orderKey, dto.action, dto);
  }

  @Get('orders/:orderKey/consumptions')
  @RequirePermissions('manufacturing:execute')
  listConsumptions(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.consumption.list(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/consumptions')
  @RequirePermissions('manufacturing:execute')
  consume(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesConsumeDto,
  ) {
    return this.consumption.consume(user.organizationId, user.id, orderKey, dto);
  }

  @Post('orders/:orderKey/consumptions/automatic')
  @RequirePermissions('manufacturing:execute')
  consumeAutomatic(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.consumption.consumeAutomatic(user.organizationId, user.id, orderKey);
  }

  @Get('orders/:orderKey/outputs')
  @RequirePermissions('manufacturing:execute')
  listOutputs(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.production.list(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/outputs')
  @RequirePermissions('manufacturing:execute')
  produce(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesProduceDto,
  ) {
    return this.production.record(user.organizationId, user.id, orderKey, dto);
  }

  @Get('orders/:orderKey/lots')
  @RequirePermissions('manufacturing:execute')
  listLots(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.traceability.lots(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/lots')
  @RequirePermissions('manufacturing:execute')
  createLot(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesLotDto,
  ) {
    return this.traceability.createLot(user.organizationId, user.id, orderKey, dto);
  }

  @Get('orders/:orderKey/serials')
  @RequirePermissions('manufacturing:execute')
  listSerials(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.traceability.serials(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/serials')
  @RequirePermissions('manufacturing:execute')
  createSerial(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesSerialDto,
  ) {
    return this.traceability.createSerial(user.organizationId, user.id, orderKey, dto);
  }

  @Get('orders/:orderKey/traceability')
  @RequirePermissions('manufacturing:execute')
  traceabilityHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.traceability.history(user.organizationId, orderKey);
  }

  @Get('lots/:lotKey/traceability')
  @RequirePermissions('manufacturing:execute')
  lotTraceability(
    @CurrentUser() user: { organizationId: string },
    @Param('lotKey') lotKey: string,
  ) {
    return this.traceability.byLot(user.organizationId, lotKey);
  }

  @Get('orders/:orderKey/operations')
  @RequirePermissions('manufacturing:execute')
  listOpExecutions(
    @CurrentUser() user: { organizationId: string },
    @Param('orderKey') orderKey: string,
  ) {
    return this.operations.list(user.organizationId, orderKey);
  }

  @Post('orders/:orderKey/operations/:orderOpKey/start')
  @RequirePermissions('manufacturing:execute')
  startOperation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Param('orderOpKey') orderOpKey: string,
    @Body() dto: EmfgMesOpExecuteDto,
  ) {
    return this.operations.start(user.organizationId, user.id, orderKey, orderOpKey, dto);
  }

  @Post('orders/:orderKey/operations/:orderOpKey/finish')
  @RequirePermissions('manufacturing:execute')
  finishOperation(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Param('orderOpKey') orderOpKey: string,
    @Body() dto: EmfgMesOpExecuteDto,
  ) {
    return this.operations.finish(user.organizationId, user.id, orderKey, orderOpKey, dto);
  }

  @Post('orders/:orderKey/captures')
  @RequirePermissions('manufacturing:execute')
  capture(
    @CurrentUser() user: { organizationId: string; id: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgMesCaptureDto,
  ) {
    return this.offline.capture(user.organizationId, user.id, orderKey, dto);
  }

  @Post('offline/sync')
  @RequirePermissions('manufacturing:execute')
  syncOffline(
    @CurrentUser() user: { organizationId: string; id: string },
    @Body() dto: EmfgMesOfflineBatchDto,
  ) {
    return this.offline.submitBatch(user.organizationId, user.id, dto.deviceId, dto.actions as never);
  }
}
