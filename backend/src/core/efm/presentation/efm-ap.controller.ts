import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { EfmApCenterService } from '../application/efm-ap-center.service';
import { EfmApSupplierService } from '../application/efm-ap-supplier.service';
import { EfmApInvoiceService } from '../application/efm-ap-invoice.service';
import { EfmApPaymentService } from '../application/efm-ap-payment.service';
import { EfmApScheduleService } from '../application/efm-ap-schedule.service';
import { EfmApApprovalService } from '../application/efm-ap-approval.service';
import { EfmApIncidentService } from '../application/efm-ap-incident.service';
import {
  EfmApAdvanceDto,
  EfmApApprovalActionDto,
  EfmApBatchDto,
  EfmApBlockDto,
  EfmApCreatePaymentDto,
  EfmApExceptionDto,
  EfmApHoldDto,
  EfmApIncidentDto,
  EfmApNoteDto,
  EfmApRegisterInvoiceDto,
  EfmApResolveIncidentDto,
  EfmApScheduleDto,
  EfmApSupplierDto,
} from './efm-ap.dto';

@ApiTags('EFM — Cuentas por Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('efm/ap')
export class EfmApController {
  constructor(
    private readonly center: EfmApCenterService,
    private readonly suppliers: EfmApSupplierService,
    private readonly invoices: EfmApInvoiceService,
    private readonly payments: EfmApPaymentService,
    private readonly schedule: EfmApScheduleService,
    private readonly approvals: EfmApApprovalService,
    private readonly incidents: EfmApIncidentService,
  ) {}

  @Get('center')
  @RequirePermissions('finance:read')
  apCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('finance:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('suppliers')
  @RequirePermissions('finance:read')
  listSuppliers(@CurrentUser() user: { organizationId: string }) {
    return this.suppliers.list(user.organizationId);
  }

  @Post('suppliers')
  @RequirePermissions('finance:config')
  upsertSupplier(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApSupplierDto,
  ) {
    return this.suppliers.upsert(user.organizationId, user.id, dto);
  }

  @Get('suppliers/:supplierKey/statement')
  @RequirePermissions('finance:read')
  supplierStatement(
    @CurrentUser() user: { organizationId: string },
    @Param('supplierKey') supplierKey: string,
  ) {
    return this.suppliers.getStatement(user.organizationId, supplierKey);
  }

  @Post('suppliers/:supplierKey/payment-block')
  @RequirePermissions('finance:ap_pay')
  blockSupplier(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('supplierKey') supplierKey: string,
    @Body() dto: EfmApBlockDto,
  ) {
    return this.suppliers.setPaymentBlock(user.organizationId, supplierKey, dto.blocked, dto.reason, user.id);
  }

  @Get('invoices')
  @RequirePermissions('finance:read')
  listInvoices(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('supplierKey') supplierKey?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.invoices.list(user.organizationId, { status, supplierKey, overdue: overdue === 'true' });
  }

  @Get('invoices/:invoiceKey')
  @RequirePermissions('finance:read')
  getInvoice(
    @CurrentUser() user: { organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.getOne(user.organizationId, invoiceKey);
  }

  @Post('invoices')
  @RequirePermissions('finance:ap_invoice')
  registerInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApRegisterInvoiceDto,
  ) {
    return this.invoices.register(user.organizationId, user.id, dto);
  }

  @Post('invoices/:invoiceKey/validate')
  @RequirePermissions('finance:ap_invoice')
  validateInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.validate(user.organizationId, invoiceKey, user.id);
  }

  @Post('invoices/:invoiceKey/approve-exception')
  @RequirePermissions('finance:ap_approve')
  approveException(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
    @Body() dto: EfmApExceptionDto,
  ) {
    return this.invoices.approveException(user.organizationId, invoiceKey, user.id, dto.justification);
  }

  @Post('invoices/:invoiceKey/post')
  @RequirePermissions('finance:ap_invoice')
  postInvoice(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('invoiceKey') invoiceKey: string,
  ) {
    return this.invoices.post(user.organizationId, invoiceKey, user.id);
  }

  @Post('credit-notes')
  @RequirePermissions('finance:ap_invoice')
  creditNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApNoteDto,
  ) {
    return this.invoices.registerCreditNote(user.organizationId, user.id, dto);
  }

  @Post('debit-notes')
  @RequirePermissions('finance:ap_invoice')
  debitNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApNoteDto,
  ) {
    return this.invoices.registerDebitNote(user.organizationId, user.id, dto);
  }

  @Get('payables')
  @RequirePermissions('finance:read')
  listPayables(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('supplierKey') supplierKey?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.schedule.listPayables(user.organizationId, { status, supplierKey, overdue: overdue === 'true' });
  }

  @Post('payables/:payableKey/hold')
  @RequirePermissions('finance:ap_pay')
  holdPayable(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('payableKey') payableKey: string,
    @Body() dto: EfmApHoldDto,
  ) {
    return this.schedule.holdPayable(user.organizationId, payableKey, user.id, dto.reason);
  }

  @Get('payments')
  @RequirePermissions('finance:read')
  listPayments(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('supplierKey') supplierKey?: string,
    @Query('batchKey') batchKey?: string,
  ) {
    return this.payments.list(user.organizationId, { status, supplierKey, batchKey });
  }

  @Get('payments/:paymentKey')
  @RequirePermissions('finance:read')
  getPayment(
    @CurrentUser() user: { organizationId: string },
    @Param('paymentKey') paymentKey: string,
  ) {
    return this.payments.getOne(user.organizationId, paymentKey);
  }

  @Post('payments')
  @RequirePermissions('finance:ap_pay')
  createPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApCreatePaymentDto,
  ) {
    return this.payments.create(user.organizationId, user.id, dto);
  }

  @Post('payments/:paymentKey/process')
  @RequirePermissions('finance:ap_pay')
  processPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
  ) {
    return this.payments.process(user.organizationId, paymentKey, user.id);
  }

  @Post('payments/:paymentKey/void')
  @RequirePermissions('finance:ap_pay')
  voidPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: EfmApApprovalActionDto,
  ) {
    return this.payments.voidPayment(user.organizationId, paymentKey, user.id, dto.reason ?? 'Anulado');
  }

  @Post('advances')
  @RequirePermissions('finance:ap_pay')
  registerAdvance(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApAdvanceDto,
  ) {
    return this.payments.registerAdvance(user.organizationId, user.id, dto);
  }

  @Get('schedule')
  @RequirePermissions('finance:read')
  listSchedule(
    @CurrentUser() user: { organizationId: string },
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
  ) {
    return this.schedule.listCalendar(user.organizationId, { dateFrom, dateTo, status });
  }

  @Post('schedule')
  @RequirePermissions('finance:ap_schedule')
  createSchedule(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApScheduleDto,
  ) {
    return this.schedule.schedule(user.organizationId, user.id, dto);
  }

  @Post('batches')
  @RequirePermissions('finance:ap_schedule')
  createBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApBatchDto,
  ) {
    return this.schedule.createBatch(user.organizationId, user.id, dto);
  }

  @Get('approvals/pending')
  @RequirePermissions('finance:ap_approve')
  pendingApprovals(@CurrentUser() user: { organizationId: string }) {
    return this.approvals.listPending(user.organizationId);
  }

  @Post('payments/:paymentKey/approve')
  @RequirePermissions('finance:ap_approve')
  approvePayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: EfmApApprovalActionDto,
  ) {
    return this.approvals.approvePayment(
      user.organizationId, paymentKey, user.id, dto.comments, dto.delegatedFromUserId,
    );
  }

  @Post('payments/:paymentKey/reject')
  @RequirePermissions('finance:ap_approve')
  rejectPayment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('paymentKey') paymentKey: string,
    @Body() dto: EfmApApprovalActionDto,
  ) {
    return this.approvals.rejectPayment(user.organizationId, paymentKey, user.id, dto.reason ?? 'Rechazado');
  }

  @Get('payments/:paymentKey/approval-history')
  @RequirePermissions('finance:read')
  approvalHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('paymentKey') paymentKey: string,
  ) {
    return this.approvals.getApprovalHistory(user.organizationId, paymentKey);
  }

  @Get('incidents')
  @RequirePermissions('finance:read')
  listIncidents(
    @CurrentUser() user: { organizationId: string },
    @Query('supplierKey') supplierKey?: string,
    @Query('status') status?: string,
  ) {
    return this.incidents.list(user.organizationId, { supplierKey, status });
  }

  @Post('incidents')
  @RequirePermissions('finance:read')
  createIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: EfmApIncidentDto,
  ) {
    return this.incidents.create(user.organizationId, user.id, dto);
  }

  @Post('incidents/:incidentKey/resolve')
  @RequirePermissions('finance:ap_pay')
  resolveIncident(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('incidentKey') incidentKey: string,
    @Body() dto: EfmApResolveIncidentDto,
  ) {
    return this.incidents.resolve(user.organizationId, incidentKey, user.id, dto.resolution);
  }

  @Get('mobile/sync')
  @RequirePermissions('finance:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return Promise.all([
      this.center.center(user.organizationId),
      this.suppliers.list(user.organizationId),
      this.invoices.list(user.organizationId, { status: 'posted' }),
      this.schedule.listPayables(user.organizationId, { status: 'open' }),
      this.schedule.listPayables(user.organizationId, { status: 'overdue' }),
      this.approvals.listPending(user.organizationId),
      this.schedule.listCalendar(user.organizationId, { status: 'scheduled' }),
    ]).then(([center, suppliers, invoices, openPayables, overduePayables, pendingApprovals, calendar]) => ({
      center,
      suppliers,
      invoices: invoices.slice(0, 100),
      openPayables: openPayables.slice(0, 100),
      overduePayables: overduePayables.slice(0, 50),
      pendingApprovals,
      calendar: calendar.slice(0, 100),
      syncedAt: new Date().toISOString(),
    }));
  }
}
