import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmfgOrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EmfgAuditService } from '../application/emfg-audit.service';
import { EmfgCenterService } from '../application/emfg-center.service';
import { EmfgCapacityService } from '../application/emfg-capacity.service';
import { EmfgCalendarService } from '../application/emfg-calendar.service';
import { EmfgMasterPlanService } from '../application/emfg-master-plan.service';
import { EmfgBomService } from '../application/emfg-bom.service';
import { EmfgRoutingService } from '../application/emfg-routing.service';
import { EmfgOrderService } from '../application/emfg-order.service';
import { EmfgSchedulerService } from '../application/emfg-scheduler.service';
import {
  EmfgBomDto, EmfgBomExplodeDto, EmfgBomLineDto, EmfgBomSubstitutionDto,
  EmfgCalendarDayDto, EmfgCalendarDto, EmfgGenerateOrdersDto,
  EmfgMachineDto, EmfgMasterPlanDto, EmfgMasterPlanLineDto,
  EmfgOperationStatusDto, EmfgOrderProgressDto, EmfgOrderStatusDto,
  EmfgProductionCenterDto, EmfgProductionLineDto, EmfgProductionOrderDto,
  EmfgRescheduleDto, EmfgRoutingDto, EmfgRoutingOperationDto,
  EmfgScheduleAutoDto, EmfgScheduleManualDto, EmfgWorkCenterDto,
} from './emfg.dto';

@ApiTags('EMFG — Manufactura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('emfg')
export class EmfgController {
  constructor(
    private readonly center: EmfgCenterService,
    private readonly capacity: EmfgCapacityService,
    private readonly calendar: EmfgCalendarService,
    private readonly masterPlan: EmfgMasterPlanService,
    private readonly bom: EmfgBomService,
    private readonly routing: EmfgRoutingService,
    private readonly orders: EmfgOrderService,
    private readonly scheduler: EmfgSchedulerService,
    private readonly auditService: EmfgAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('manufacturing:read')
  getCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('manufacturing:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('manufacturing:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.center.mobileSync(user.organizationId);
  }

  @Get('load-check')
  @RequirePermissions('manufacturing:read')
  loadCheck(@CurrentUser() user: { organizationId: string }) {
    return this.center.loadCheck(user.organizationId);
  }

  @Get('capacity/summary')
  @RequirePermissions('manufacturing:read')
  capacitySummary(@CurrentUser() user: { organizationId: string }) {
    return this.capacity.capacitySummary(user.organizationId);
  }

  @Get('centers')
  @RequirePermissions('manufacturing:read')
  listCenters(@CurrentUser() user: { organizationId: string }) {
    return this.capacity.listCenters(user.organizationId);
  }

  @Post('centers')
  @RequirePermissions('manufacturing:config')
  upsertCenter(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgProductionCenterDto) {
    return this.capacity.upsertCenter(user.organizationId, user.id, dto);
  }

  @Post('lines')
  @RequirePermissions('manufacturing:config')
  upsertLine(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgProductionLineDto) {
    return this.capacity.upsertLine(user.organizationId, user.id, dto);
  }

  @Post('work-centers')
  @RequirePermissions('manufacturing:config')
  upsertWorkCenter(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgWorkCenterDto) {
    return this.capacity.upsertWorkCenter(user.organizationId, user.id, dto);
  }

  @Post('machines')
  @RequirePermissions('manufacturing:config')
  upsertMachine(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgMachineDto) {
    return this.capacity.upsertMachine(user.organizationId, user.id, dto);
  }

  @Get('calendars')
  @RequirePermissions('manufacturing:read')
  listCalendars(@CurrentUser() user: { organizationId: string }) {
    return this.calendar.list(user.organizationId);
  }

  @Post('calendars')
  @RequirePermissions('manufacturing:config')
  createCalendar(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgCalendarDto) {
    return this.calendar.create(user.organizationId, user.id, dto);
  }

  @Post('calendars/days')
  @RequirePermissions('manufacturing:config')
  updateCalendarDay(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgCalendarDayDto) {
    return this.calendar.updateDay(user.organizationId, user.id, dto);
  }

  @Get('master-plans')
  @RequirePermissions('manufacturing:read')
  listMasterPlans(@CurrentUser() user: { organizationId: string }) {
    return this.masterPlan.list(user.organizationId);
  }

  @Get('master-plans/:planKey')
  @RequirePermissions('manufacturing:read')
  getMasterPlan(@CurrentUser() user: { organizationId: string }, @Param('planKey') planKey: string) {
    return this.masterPlan.get(user.organizationId, planKey);
  }

  @Post('master-plans')
  @RequirePermissions('manufacturing:plan')
  createMasterPlan(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgMasterPlanDto) {
    return this.masterPlan.create(user.organizationId, user.id, dto);
  }

  @Post('master-plans/:planKey/lines')
  @RequirePermissions('manufacturing:plan')
  addMasterPlanLine(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('planKey') planKey: string,
    @Body() dto: EmfgMasterPlanLineDto,
  ) {
    return this.masterPlan.addLine(user.organizationId, user.id, planKey, dto);
  }

  @Post('master-plans/:planKey/activate')
  @RequirePermissions('manufacturing:plan')
  activateMasterPlan(@CurrentUser() user: { id: string; organizationId: string }, @Param('planKey') planKey: string) {
    return this.masterPlan.activate(user.organizationId, user.id, planKey);
  }

  @Post('master-plans/:planKey/generate-orders')
  @RequirePermissions('manufacturing:plan')
  generateOrders(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('planKey') planKey: string,
    @Body() dto: EmfgGenerateOrdersDto,
  ) {
    return this.masterPlan.generateOrders(user.organizationId, user.id, planKey, dto.centerKey);
  }

  @Get('boms')
  @RequirePermissions('manufacturing:read')
  listBoms(@CurrentUser() user: { organizationId: string }, @Query('itemKey') itemKey?: string) {
    return this.bom.list(user.organizationId, itemKey);
  }

  @Get('boms/:bomKey')
  @RequirePermissions('manufacturing:read')
  getBom(@CurrentUser() user: { organizationId: string }, @Param('bomKey') bomKey: string) {
    return this.bom.get(user.organizationId, bomKey);
  }

  @Post('boms')
  @RequirePermissions('manufacturing:bom')
  createBom(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgBomDto) {
    return this.bom.create(user.organizationId, user.id, dto);
  }

  @Post('boms/:bomKey/lines')
  @RequirePermissions('manufacturing:bom')
  addBomLine(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('bomKey') bomKey: string,
    @Body() dto: EmfgBomLineDto,
  ) {
    return this.bom.addLine(user.organizationId, user.id, bomKey, dto);
  }

  @Post('boms/:bomKey/substitutions')
  @RequirePermissions('manufacturing:bom')
  addBomSubstitution(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('bomKey') bomKey: string,
    @Body() dto: EmfgBomSubstitutionDto,
  ) {
    return this.bom.addSubstitution(user.organizationId, user.id, bomKey, dto);
  }

  @Post('boms/:bomKey/explode')
  @RequirePermissions('manufacturing:read')
  explodeBom(
    @CurrentUser() user: { organizationId: string },
    @Param('bomKey') bomKey: string,
    @Body() dto: EmfgBomExplodeDto,
  ) {
    return this.bom.explode(user.organizationId, bomKey, dto.orderQty, dto.useSubstitutions);
  }

  @Get('routings')
  @RequirePermissions('manufacturing:read')
  listRoutings(@CurrentUser() user: { organizationId: string }, @Query('itemKey') itemKey?: string) {
    return this.routing.list(user.organizationId, itemKey);
  }

  @Get('routings/:routingKey')
  @RequirePermissions('manufacturing:read')
  getRouting(@CurrentUser() user: { organizationId: string }, @Param('routingKey') routingKey: string) {
    return this.routing.get(user.organizationId, routingKey);
  }

  @Post('routings')
  @RequirePermissions('manufacturing:routing')
  createRouting(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgRoutingDto) {
    return this.routing.create(user.organizationId, user.id, dto);
  }

  @Post('routings/:routingKey/operations')
  @RequirePermissions('manufacturing:routing')
  addRoutingOperation(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('routingKey') routingKey: string,
    @Body() dto: EmfgRoutingOperationDto,
  ) {
    return this.routing.addOperation(user.organizationId, user.id, routingKey, dto);
  }

  @Get('orders')
  @RequirePermissions('manufacturing:read')
  listOrders(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EmfgOrderStatus,
    @Query('centerKey') centerKey?: string,
  ) {
    return this.orders.list(user.organizationId, { status, centerKey });
  }

  @Get('orders/:orderKey')
  @RequirePermissions('manufacturing:read')
  getOrder(@CurrentUser() user: { organizationId: string }, @Param('orderKey') orderKey: string) {
    return this.orders.get(user.organizationId, orderKey);
  }

  @Post('orders')
  @RequirePermissions('manufacturing:order')
  createOrder(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgProductionOrderDto) {
    return this.orders.create(user.organizationId, user.id, dto);
  }

  @Patch('orders/:orderKey/status')
  @RequirePermissions('manufacturing:order')
  updateOrderStatus(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgOrderStatusDto,
  ) {
    return this.orders.updateStatus(user.organizationId, user.id, orderKey, dto.status);
  }

  @Post('orders/:orderKey/release')
  @RequirePermissions('manufacturing:order')
  releaseOrder(@CurrentUser() user: { id: string; organizationId: string }, @Param('orderKey') orderKey: string) {
    return this.orders.release(user.organizationId, user.id, orderKey);
  }

  @Post('orders/:orderKey/progress')
  @RequirePermissions('manufacturing:execute')
  recordProgress(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgOrderProgressDto,
  ) {
    return this.orders.recordProgress(user.organizationId, user.id, orderKey, dto);
  }

  @Patch('operations/:orderOpKey/status')
  @RequirePermissions('manufacturing:execute')
  updateOperationStatus(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderOpKey') orderOpKey: string,
    @Body() dto: EmfgOperationStatusDto,
  ) {
    return this.orders.updateOperationStatus(user.organizationId, user.id, orderOpKey, dto.status);
  }

  @Get('schedule')
  @RequirePermissions('manufacturing:read')
  listSchedule(@CurrentUser() user: { organizationId: string }, @Query('workCenterKey') workCenterKey?: string) {
    return this.scheduler.listSchedule(user.organizationId, workCenterKey);
  }

  @Get('schedule/conflicts')
  @RequirePermissions('manufacturing:read')
  listConflicts(@CurrentUser() user: { organizationId: string }, @Query('resolved') resolved?: string) {
    return this.scheduler.listConflicts(user.organizationId, resolved === 'true' ? true : resolved === 'false' ? false : undefined);
  }

  @Get('schedule/reschedule-logs')
  @RequirePermissions('manufacturing:read')
  listRescheduleLogs(@CurrentUser() user: { organizationId: string }, @Query('orderKey') orderKey?: string) {
    return this.scheduler.listRescheduleLogs(user.organizationId, orderKey);
  }

  @Post('schedule/manual')
  @RequirePermissions('manufacturing:schedule')
  scheduleManual(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: EmfgScheduleManualDto) {
    return this.scheduler.scheduleManual(user.organizationId, user.id, dto);
  }

  @Post('orders/:orderKey/schedule/auto')
  @RequirePermissions('manufacturing:schedule')
  scheduleAuto(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgScheduleAutoDto,
  ) {
    return this.scheduler.scheduleAutomatic(user.organizationId, user.id, orderKey, dto.horizonStart);
  }

  @Post('orders/:orderKey/reschedule')
  @RequirePermissions('manufacturing:schedule')
  rescheduleOrder(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('orderKey') orderKey: string,
    @Body() dto: EmfgRescheduleDto,
  ) {
    return this.scheduler.reschedule(user.organizationId, user.id, orderKey, dto);
  }

  @Get('audit')
  @RequirePermissions('manufacturing:audit')
  audit(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.auditService.findAll(user.organizationId, entityType);
  }
}
