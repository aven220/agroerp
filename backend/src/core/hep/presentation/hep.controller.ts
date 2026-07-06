import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HepDashboardService } from '../application/hep-dashboard.service';
import { HepAuditService } from '../application/hep-audit.service';
import { HepRequestService } from '../application/hep-request.service';
import { HepPayrollDocsService } from '../application/hep-payroll-docs.service';
import {
  HepCertificateCreateDto, HepLoginDto, HepOfflineSaveDto, HepPayslipBulkDto,
  HepProfileUpdateDto, HepRequestAttachmentDto, HepRequestCancelDto,
  HepRequestCreateDto, HepRequestDecisionDto,
} from './hep.dto';
import type { HepAuditAction, HepRequestStatus } from '@prisma/client';
import type { HepRequestTypeCode } from '../domain/hep-portal.engine';

@ApiTags('Portal del Empleado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('portal')
export class HepController {
  constructor(
    private readonly dashboard: HepDashboardService,
    private readonly audit: HepAuditService,
    private readonly requests: HepRequestService,
    private readonly payrollDocs: HepPayrollDocsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('portal:read')
  getDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Req() req?: Request,
  ) {
    return this.dashboard.dashboard(user.organizationId, user.id, employeeKey, {
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'] as string | undefined,
    });
  }

  @Post('seed')
  @RequirePermissions('portal:admin')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.dashboard.seed(user.organizationId, user.id);
  }

  @Get('profile')
  @RequirePermissions('portal:read')
  getProfile(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.dashboard.profile(user.organizationId, user.id, employeeKey);
  }

  @Put('profile')
  @RequirePermissions('portal:profile')
  updateProfile(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: HepProfileUpdateDto,
    @Req() req: Request,
  ) {
    return this.dashboard.updateProfile(user.organizationId, user.id, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('login')
  @RequirePermissions('portal:read')
  recordLogin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: HepLoginDto,
    @Req() req: Request,
  ) {
    return this.dashboard.recordLogin(user.organizationId, user.id, dto.employeeKey, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Get('news')
  @RequirePermissions('portal:read')
  async listNews(@CurrentUser() user: { id: string; organizationId: string }) {
    const news = await this.dashboard.listNews(user.organizationId);
    await this.audit.log({
      organizationId: user.organizationId,
      action: 'query',
      resource: 'HepNews',
      userId: user.id,
      details: { count: news.length },
    });
    return news;
  }

  @Get('notices')
  @RequirePermissions('portal:read')
  async listNotices(@CurrentUser() user: { id: string; organizationId: string }) {
    const notices = await this.dashboard.listNotices(user.organizationId);
    await this.audit.log({
      organizationId: user.organizationId,
      action: 'query',
      resource: 'HepNotice',
      userId: user.id,
      details: { count: notices.length },
    });
    return notices;
  }

  @Get('quick-links')
  @RequirePermissions('portal:read')
  listQuickLinks(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.listQuickLinks(user.organizationId);
  }

  @Get('birthdays')
  @RequirePermissions('portal:read')
  async listBirthdays(@CurrentUser() user: { id: string; organizationId: string }) {
    const birthdays = await this.dashboard.listBirthdays(user.organizationId);
    await this.audit.log({
      organizationId: user.organizationId,
      action: 'query',
      resource: 'HepBirthdays',
      userId: user.id,
      details: { count: birthdays.length },
    });
    return birthdays;
  }

  @Get('mobile/sync')
  @RequirePermissions('portal:read')
  async mobileSync(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    const [dashboard, requests, vacations, certificates, payslips, personalDocs, offline] = await Promise.all([
      this.dashboard.mobileSync(user.organizationId, user.id, employeeKey),
      this.requests.list(user.organizationId, user.id, { employeeKey }),
      this.requests.vacationSummary(user.organizationId, user.id, employeeKey),
      this.payrollDocs.listCertificates(user.organizationId, user.id, employeeKey),
      this.payrollDocs.listPayslips(user.organizationId, user.id, { employeeKey }),
      this.payrollDocs.personalDocuments(user.organizationId, user.id, employeeKey),
      this.payrollDocs.listOffline(user.organizationId, user.id),
    ]);
    return { ...dashboard, requests, vacations, certificates, payslips, personalDocs, offline };
  }

  @Get('requests')
  @RequirePermissions('portal:read')
  listRequests(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('status') status?: HepRequestStatus,
    @Query('category') category?: string,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.requests.list(user.organizationId, user.id, { status, category, employeeKey });
  }

  @Get('requests/history')
  @RequirePermissions('portal:read')
  requestHistory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.requests.history(user.organizationId, user.id, employeeKey);
  }

  @Get('requests/vacations')
  @RequirePermissions('portal:read')
  vacationSummary(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.requests.vacationSummary(user.organizationId, user.id, employeeKey);
  }

  @Get('requests/:requestKey')
  @RequirePermissions('portal:read')
  getRequest(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('requestKey') requestKey: string,
  ) {
    return this.requests.get(user.organizationId, user.id, requestKey);
  }

  @Post('requests')
  @RequirePermissions('portal:request')
  createRequest(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HepRequestCreateDto) {
    return this.requests.create(user.organizationId, user.id, {
      ...dto,
      requestType: dto.requestType as HepRequestTypeCode,
    });
  }

  @Post('requests/:requestKey/submit')
  @RequirePermissions('portal:request')
  submitRequest(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('requestKey') requestKey: string,
  ) {
    return this.requests.submit(user.organizationId, user.id, requestKey);
  }

  @Post('requests/:requestKey/cancel')
  @RequirePermissions('portal:request')
  cancelRequest(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('requestKey') requestKey: string,
    @Body() dto: HepRequestCancelDto,
  ) {
    return this.requests.cancel(user.organizationId, user.id, requestKey, dto.reason);
  }

  @Post('requests/:requestKey/decide')
  @RequirePermissions('portal:approve')
  decideRequest(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('requestKey') requestKey: string,
    @Body() dto: HepRequestDecisionDto,
  ) {
    return this.requests.decide(user.organizationId, user.id, requestKey, dto.approved, dto.comment);
  }

  @Post('requests/attachments')
  @RequirePermissions('portal:request')
  addAttachment(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HepRequestAttachmentDto) {
    return this.requests.addAttachment(user.organizationId, user.id, dto);
  }

  @Get('certificates')
  @RequirePermissions('portal:read')
  listCertificates(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.requests.listCertificates(user.organizationId, user.id, employeeKey);
  }

  @Post('certificates')
  @RequirePermissions('portal:request')
  createCertificate(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HepCertificateCreateDto) {
    return this.requests.generateCertificate(user.organizationId, user.id, {
      certificateType: dto.certificateType as 'certificate_labor' | 'certificate_income' | 'certificate_custom',
      title: dto.title,
      observations: dto.observations,
      employeeKey: dto.employeeKey,
    });
  }

  @Get('certificates/:certificateKey/download')
  @RequirePermissions('portal:read')
  downloadCertificate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('certificateKey') certificateKey: string,
  ) {
    return this.requests.downloadCertificate(user.organizationId, user.id, certificateKey);
  }

  @Get('payroll/payslips')
  @RequirePermissions('portal:read')
  listPayslips(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('periodCode') periodCode?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.listPayslips(user.organizationId, user.id, { periodCode, periodFrom, periodTo, employeeKey });
  }

  @Get('payroll/payslips/:payslipKey/preview')
  @RequirePermissions('portal:read')
  previewPayslip(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('payslipKey') payslipKey: string,
  ) {
    return this.payrollDocs.previewPayslip(user.organizationId, user.id, payslipKey);
  }

  @Get('payroll/payslips/:payslipKey/download')
  @RequirePermissions('portal:read')
  downloadPayslip(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('payslipKey') payslipKey: string,
  ) {
    return this.payrollDocs.downloadPayslipPdf(user.organizationId, user.id, payslipKey);
  }

  @Post('payroll/payslips/download-bulk')
  @RequirePermissions('portal:read')
  downloadPayslipsBulk(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HepPayslipBulkDto) {
    return this.payrollDocs.downloadPayslipsBulk(user.organizationId, user.id, dto.payslipKeys);
  }

  @Get('payroll/salary-history')
  @RequirePermissions('portal:read')
  salaryHistory(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.salaryHistory(user.organizationId, user.id, employeeKey);
  }

  @Get('payroll/contributions')
  @RequirePermissions('portal:read')
  contributions(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('periodCode') periodCode?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.contributions(user.organizationId, user.id, { periodCode, periodFrom, periodTo, employeeKey });
  }

  @Get('documents/center')
  @RequirePermissions('portal:read')
  documentsCenter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.documentsCenter(user.organizationId, user.id, employeeKey);
  }

  @Get('documents/personal')
  @RequirePermissions('portal:read')
  personalDocuments(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.personalDocuments(user.organizationId, user.id, employeeKey);
  }

  @Get('documents/personal/:documentKey/download')
  @RequirePermissions('portal:read')
  downloadPersonalDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('documentKey') documentKey: string,
  ) {
    return this.payrollDocs.downloadPersonalDocument(user.organizationId, user.id, documentKey);
  }

  @Get('documents/certificates')
  @RequirePermissions('portal:read')
  listAllCertificates(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.payrollDocs.listCertificates(user.organizationId, user.id, employeeKey);
  }

  @Get('documents/certificates/:certificateKey/download')
  @RequirePermissions('portal:read')
  downloadDocCertificate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('certificateKey') certificateKey: string,
    @Query('source') source?: 'portal' | 'payroll',
  ) {
    return this.payrollDocs.downloadCertificate(user.organizationId, user.id, certificateKey, source ?? 'portal');
  }

  @Get('documents/offline')
  @RequirePermissions('portal:read')
  listOfflineDocs(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.payrollDocs.listOffline(user.organizationId, user.id);
  }

  @Post('documents/offline')
  @RequirePermissions('portal:read')
  saveOfflineDoc(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HepOfflineSaveDto) {
    return this.payrollDocs.saveOffline(user.organizationId, user.id, dto);
  }

  @Get('audit')
  @RequirePermissions('portal:audit')
  auditLogs(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('action') action?: HepAuditAction,
  ) {
    return this.audit.list(user.organizationId, { employeeKey, action });
  }
}
