import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EamMaintWorkOrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EamAuditService } from '../application/eam-audit.service';
import { EamCalendarService } from '../application/eam-calendar.service';
import { EamCmmsEngineService, EamCmmsOfflineService } from '../application/eam-cmms-engine.service';
import { EamCmmsIndicatorsService } from '../application/eam-cmms-indicators.service';
import { EamIncidentService } from '../application/eam-incident.service';
import { EamMaintCostService } from '../application/eam-maint-cost.service';
import { EamMaintPlanService } from '../application/eam-maint-plan.service';
import { EamMaintSlaService } from '../application/eam-maint-sla.service';
import { EamMaintWorkOrderService } from '../application/eam-maint-work-order.service';
import { EamSparePartService } from '../application/eam-spare-part.service';
import { EamTechnicianService } from '../application/eam-technician.service';
import {
  EamAssignmentDto,
  EamAttachmentDto,
  EamCalendarDto,
  EamCmmsOfflineBatchDto,
  EamCostDto,
  EamCrewDto,
  EamExecutionDto,
  EamIncidentDto,
  EamMaintActivityDto,
  EamMaintChecklistDto,
  EamMaintPlanDto,
  EamMeasurementDto,
  EamSignDto,
  EamSparePartDto,
  EamSparePartStatusDto,
  EamSlaDto,
  EamTechnicianDto,
  EamWorkOrderApprovalDto,
  EamWorkOrderDto,
  EamWorkOrderScheduleDto,
} from './eam-cmms.dto';

@ApiTags('EAM — CMMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eam/cmms')
export class EamCmmsController {
  constructor(
    private readonly engine: EamCmmsEngineService,
    private readonly plan: EamMaintPlanService,
    private readonly workOrder: EamMaintWorkOrderService,
    private readonly technician: EamTechnicianService,
    private readonly sparePart: EamSparePartService,
    private readonly cost: EamMaintCostService,
    private readonly incident: EamIncidentService,
    private readonly sla: EamMaintSlaService,
    private readonly calendar: EamCalendarService,
    private readonly indicators: EamCmmsIndicatorsService,
    private readonly offline: EamCmmsOfflineService,
    private readonly audit: EamAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('asset_management:cmms')
  center(@CurrentUser() user: { organizationId: string }) {
    return this.engine.center(user.organizationId);
  }

  @Post('bootstrap')
  @RequirePermissions('asset_management:cmms')
  bootstrap(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.engine.bootstrap(user.organizationId, user.id);
  }

  @Get('audit')
  @RequirePermissions('asset_management:audit')
  auditLog(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId, undefined, 100).then((rows) =>
      rows.filter((r) =>
        ['work_order_created', 'work_order_approved', 'work_order_scheduled', 'work_order_started',
          'work_order_completed', 'work_order_closed', 'spare_part_consumed', 'incident_reported',
          'sla_breach', 'assignment_changed', 'cost_posted'].includes(r.action),
      ),
    );
  }

  @Get('plans')
  @RequirePermissions('asset_management:cmms')
  listPlans(@CurrentUser() user: { organizationId: string }, @Query('assetKey') assetKey?: string) {
    return this.plan.list(user.organizationId, assetKey);
  }

  @Post('plans')
  @RequirePermissions('asset_management:cmms')
  createPlan(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamMaintPlanDto) {
    return this.plan.create(user.organizationId, user.id, dto.assetKey, dto.name, dto.planType, dto.priority ?? 'medium', dto.frequencyValue ?? 1, dto.frequencyUnit ?? 'days', dto.checklistKey);
  }

  @Post('plans/:planKey/activities')
  @RequirePermissions('asset_management:cmms')
  addActivity(@CurrentUser() user: { organizationId: string; id: string }, @Param('planKey') planKey: string, @Body() dto: EamMaintActivityDto) {
    return this.plan.addActivity(user.organizationId, user.id, planKey, dto.name, dto.estimatedHours ?? 1, dto.description);
  }

  @Get('checklists')
  @RequirePermissions('asset_management:cmms')
  listChecklists(@CurrentUser() user: { organizationId: string }) {
    return this.plan.listChecklists(user.organizationId);
  }

  @Post('checklists')
  @RequirePermissions('asset_management:cmms')
  createChecklist(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamMaintChecklistDto) {
    return this.plan.createChecklist(user.organizationId, user.id, dto.name, dto.items);
  }

  @Get('work-orders')
  @RequirePermissions('asset_management:cmms')
  listWorkOrders(@CurrentUser() user: { organizationId: string }, @Query('status') status?: EamMaintWorkOrderStatus) {
    return this.workOrder.list(user.organizationId, status);
  }

  @Get('work-orders/:workOrderKey')
  @RequirePermissions('asset_management:cmms')
  getWorkOrder(@CurrentUser() user: { organizationId: string }, @Param('workOrderKey') workOrderKey: string) {
    return this.workOrder.get(user.organizationId, workOrderKey);
  }

  @Post('work-orders')
  @RequirePermissions('asset_management:cmms_execute')
  createWorkOrder(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamWorkOrderDto) {
    return this.workOrder.createManual(user.organizationId, user.id, dto.assetKey, dto.title, dto.description, dto.priority);
  }

  @Post('plans/:planKey/work-orders')
  @RequirePermissions('asset_management:cmms_execute')
  createFromPlan(@CurrentUser() user: { organizationId: string; id: string }, @Param('planKey') planKey: string) {
    return this.workOrder.createFromPlan(user.organizationId, user.id, planKey);
  }

  @Post('incidents/:incidentKey/work-orders')
  @RequirePermissions('asset_management:cmms_execute')
  createFromIncident(@CurrentUser() user: { organizationId: string; id: string }, @Param('incidentKey') incidentKey: string) {
    return this.workOrder.createFromIncident(user.organizationId, user.id, incidentKey);
  }

  @Post('work-orders/:workOrderKey/approve')
  @RequirePermissions('asset_management:cmms_execute')
  approve(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamWorkOrderApprovalDto) {
    return this.workOrder.approve(user.organizationId, user.id, workOrderKey, dto.approved, dto.notes);
  }

  @Post('work-orders/:workOrderKey/schedule')
  @RequirePermissions('asset_management:cmms_execute')
  schedule(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamWorkOrderScheduleDto) {
    return this.workOrder.schedule(user.organizationId, user.id, workOrderKey, new Date(dto.scheduledAt));
  }

  @Post('work-orders/:workOrderKey/reschedule')
  @RequirePermissions('asset_management:cmms_execute')
  reschedule(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamWorkOrderScheduleDto) {
    return this.workOrder.reschedule(user.organizationId, user.id, workOrderKey, new Date(dto.scheduledAt));
  }

  @Post('work-orders/:workOrderKey/cancel')
  @RequirePermissions('asset_management:cmms_execute')
  cancel(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string) {
    return this.workOrder.cancel(user.organizationId, user.id, workOrderKey);
  }

  @Post('work-orders/:workOrderKey/execution')
  @RequirePermissions('asset_management:cmms_execute')
  execution(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamExecutionDto) {
    return this.workOrder.recordExecution(user.organizationId, user.id, workOrderKey, dto.action, dto.technicianKey, dto.laborMinutes, dto.notes, dto.checklistDone);
  }

  @Post('work-orders/:workOrderKey/attachments')
  @RequirePermissions('asset_management:cmms_execute')
  attach(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamAttachmentDto) {
    return this.workOrder.attachFile(user.organizationId, user.id, workOrderKey, dto.attachmentType, dto.storageUrl, dto.title);
  }

  @Post('work-orders/:workOrderKey/measurements')
  @RequirePermissions('asset_management:cmms_execute')
  measure(@CurrentUser() user: { organizationId: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamMeasurementDto) {
    return this.workOrder.recordMeasurement(user.organizationId, workOrderKey, dto.metricName, dto.metricValue, dto.unit);
  }

  @Post('work-orders/:workOrderKey/sign')
  @RequirePermissions('asset_management:cmms_execute')
  sign(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamSignDto) {
    return this.workOrder.sign(user.organizationId, user.id, workOrderKey, dto.signatureUrl);
  }

  @Post('work-orders/:workOrderKey/close/technical')
  @RequirePermissions('asset_management:cmms_execute')
  technicalClose(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string) {
    return this.workOrder.technicalClose(user.organizationId, user.id, workOrderKey);
  }

  @Post('work-orders/:workOrderKey/close/administrative')
  @RequirePermissions('asset_management:cmms_execute')
  administrativeClose(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string) {
    return this.workOrder.administrativeClose(user.organizationId, user.id, workOrderKey);
  }

  @Get('technicians')
  @RequirePermissions('asset_management:cmms')
  listTechnicians(@CurrentUser() user: { organizationId: string }) {
    return this.technician.list(user.organizationId);
  }

  @Post('technicians')
  @RequirePermissions('asset_management:cmms')
  createTechnician(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamTechnicianDto) {
    return this.technician.createTechnician(user.organizationId, user.id, dto.name, dto.specialtyKey);
  }

  @Get('crews')
  @RequirePermissions('asset_management:cmms')
  listCrews(@CurrentUser() user: { organizationId: string }) {
    return this.technician.listCrews(user.organizationId);
  }

  @Post('crews')
  @RequirePermissions('asset_management:cmms')
  createCrew(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamCrewDto) {
    return this.technician.createCrew(user.organizationId, user.id, dto.code, dto.name);
  }

  @Get('technicians/workload')
  @RequirePermissions('asset_management:cmms')
  workload(@CurrentUser() user: { organizationId: string }) {
    return this.technician.workload(user.organizationId);
  }

  @Post('work-orders/:workOrderKey/assign')
  @RequirePermissions('asset_management:cmms_execute')
  assign(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamAssignmentDto) {
    return this.technician.assign(user.organizationId, user.id, workOrderKey, dto.technicianKey, dto.isPrimary);
  }

  @Post('work-orders/:workOrderKey/auto-assign')
  @RequirePermissions('asset_management:cmms_execute')
  autoAssign(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Query('priority') priority?: string) {
    return this.technician.autoAssign(user.organizationId, user.id, workOrderKey, (priority as never) ?? 'medium');
  }

  @Get('work-orders/:workOrderKey/spare-parts')
  @RequirePermissions('asset_management:cmms')
  listSpareParts(@CurrentUser() user: { organizationId: string }, @Param('workOrderKey') workOrderKey: string) {
    return this.sparePart.list(user.organizationId, workOrderKey);
  }

  @Post('work-orders/:workOrderKey/spare-parts')
  @RequirePermissions('asset_management:cmms_execute')
  requestSparePart(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamSparePartDto) {
    return this.sparePart.request(user.organizationId, user.id, workOrderKey, dto.itemKey, dto.quantity, dto.lotKey, dto.serialNumber);
  }

  @Post('spare-parts/:lineKey/status')
  @RequirePermissions('asset_management:cmms_execute')
  sparePartStatus(@CurrentUser() user: { organizationId: string; id: string }, @Param('lineKey') lineKey: string, @Body() dto: EamSparePartStatusDto) {
    return this.sparePart.updateStatus(user.organizationId, user.id, lineKey, dto.status, dto.unitCost);
  }

  @Post('work-orders/:workOrderKey/costs')
  @RequirePermissions('asset_management:cmms_execute')
  postCost(@CurrentUser() user: { organizationId: string; id: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamCostDto) {
    return this.cost.post(user.organizationId, user.id, workOrderKey, dto.costType, dto.amount, dto.description);
  }

  @Get('dashboard/costs')
  @RequirePermissions('asset_management:cmms')
  costDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.cost.dashboard(user.organizationId);
  }

  @Get('incidents')
  @RequirePermissions('asset_management:cmms')
  listIncidents(@CurrentUser() user: { organizationId: string }, @Query('open') open?: string) {
    return this.incident.list(user.organizationId, open === 'true' ? false : open === 'false' ? true : undefined);
  }

  @Post('incidents')
  @RequirePermissions('asset_management:cmms_execute')
  reportIncident(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamIncidentDto) {
    return this.incident.report(user.organizationId, user.id, dto.assetKey, dto.incidentType, dto.title, dto.severity, dto.description, dto.impact);
  }

  @Get('sla')
  @RequirePermissions('asset_management:cmms')
  listSla(@CurrentUser() user: { organizationId: string }) {
    return this.sla.list(user.organizationId);
  }

  @Post('sla')
  @RequirePermissions('asset_management:cmms')
  createSla(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamSlaDto) {
    return this.sla.create(user.organizationId, user.id, dto.name, dto.responseHours, dto.repairHours, dto.priority ?? 'high');
  }

  @Post('sla/:slaKey/evaluate/:workOrderKey')
  @RequirePermissions('asset_management:cmms')
  evaluateSla(@CurrentUser() user: { organizationId: string; id: string }, @Param('slaKey') slaKey: string, @Param('workOrderKey') workOrderKey: string) {
    return this.sla.evaluateWorkOrder(user.organizationId, user.id, workOrderKey, slaKey);
  }

  @Get('dashboard/compliance')
  @RequirePermissions('asset_management:cmms')
  complianceDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.sla.complianceDashboard(user.organizationId);
  }

  @Get('calendar')
  @RequirePermissions('asset_management:cmms')
  calendarView(@CurrentUser() user: { organizationId: string }, @Query('view') view?: string, @Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    if (view === 'week') return this.calendar.weekView(user.organizationId, d);
    if (view === 'month') return this.calendar.monthView(user.organizationId, d.getFullYear(), d.getMonth() + 1);
    return this.calendar.dayView(user.organizationId, d);
  }

  @Post('work-orders/:workOrderKey/calendar')
  @RequirePermissions('asset_management:cmms_execute')
  scheduleCalendar(@CurrentUser() user: { organizationId: string }, @Param('workOrderKey') workOrderKey: string, @Body() dto: EamCalendarDto) {
    return this.calendar.schedule(user.organizationId, workOrderKey, dto.technicianKey, new Date(dto.startsAt), new Date(dto.endsAt));
  }

  @Get('dashboard')
  @RequirePermissions('asset_management:cmms')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.dashboard(user.organizationId);
  }

  @Post('indicators/compute')
  @RequirePermissions('asset_management:cmms')
  computeIndicators(@CurrentUser() user: { organizationId: string }) {
    return this.indicators.compute(user.organizationId);
  }

  @Get('mobile/sync')
  @RequirePermissions('asset_management:cmms')
  mobileSync(@CurrentUser() user: { organizationId: string }, @Query('technicianKey') technicianKey?: string) {
    return this.offline.mobileSync(user.organizationId, technicianKey);
  }

  @Post('offline/batches')
  @RequirePermissions('asset_management:cmms_execute')
  queueOffline(@CurrentUser() user: { organizationId: string; id: string }, @Body() dto: EamCmmsOfflineBatchDto) {
    return this.offline.queueBatch(user.organizationId, user.id, dto.deviceId, dto.operations as never);
  }

  @Post('offline/batches/:batchKey/sync')
  @RequirePermissions('asset_management:cmms_execute')
  syncOffline(@CurrentUser() user: { organizationId: string; id: string }, @Param('batchKey') batchKey: string) {
    return this.offline.syncBatch(user.organizationId, user.id, batchKey);
  }
}
