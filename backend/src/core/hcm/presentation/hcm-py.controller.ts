import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmAuditService } from '../application/hcm-audit.service';
import { HcmPyCenterService } from '../application/hcm-py-center.service';
import { HcmPyConfigService } from '../application/hcm-py-config.service';
import { HcmPyPeriodService } from '../application/hcm-py-period.service';
import { HcmPyRunService } from '../application/hcm-py-run.service';
import { HcmPyBenefitService } from '../application/hcm-py-benefit.service';
import {
  HcmPyGarnishmentService,
  HcmPyProvisionService,
  HcmPySettlementService,
  HcmPyVacationService,
} from '../application/hcm-py-settlement.service';
import { HcmPyDocumentService } from '../application/hcm-py-document.service';
import {
  HcmPyBenefitDto, HcmPyConceptDto, HcmPyConfigDto, HcmPyFundDto,
  HcmPyGarnishmentDto, HcmPyIncomeCertificateDto, HcmPyPeriodDto,
  HcmPyRunDto, HcmPySettlementDto, HcmPyVacationRequestDto,
} from './hcm-py.dto';
import type {
  HcmPyBenefitType, HcmPyConceptCategory, HcmPyConceptKind, HcmPyFundType,
  HcmPyGarnishmentType, HcmPyPeriodStatus, HcmPyPeriodicity, HcmPyRunStatus, HcmPySettlementType,
} from '@prisma/client';

@ApiTags('HCM — Nómina y Prestaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm/py')
export class HcmPyController {
  constructor(
    private readonly center: HcmPyCenterService,
    private readonly config: HcmPyConfigService,
    private readonly periods: HcmPyPeriodService,
    private readonly runs: HcmPyRunService,
    private readonly benefits: HcmPyBenefitService,
    private readonly garnishments: HcmPyGarnishmentService,
    private readonly settlements: HcmPySettlementService,
    private readonly provisions: HcmPyProvisionService,
    private readonly vacations: HcmPyVacationService,
    private readonly documents: HcmPyDocumentService,
    private readonly auditService: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:py_read')
  pyCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('hcm:py_read')
  dashboard(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.center.dashboard(user.organizationId, from, to);
  }

  @Post('seed')
  @RequirePermissions('hcm:py_config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:py_read')
  mobileSync(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.center.mobileSync(user.organizationId, employeeKey);
  }

  @Get('configs')
  @RequirePermissions('hcm:py_read')
  listConfigs(@CurrentUser() user: { organizationId: string }) {
    return this.config.listConfigs(user.organizationId);
  }

  @Post('configs')
  @RequirePermissions('hcm:py_config')
  upsertConfig(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyConfigDto) {
    return this.config.upsertConfig(user.organizationId, user.id, { ...dto, periodicity: dto.periodicity as HcmPyPeriodicity | undefined });
  }

  @Get('concepts')
  @RequirePermissions('hcm:py_read')
  listConcepts(@CurrentUser() user: { organizationId: string }) {
    return this.config.listConcepts(user.organizationId);
  }

  @Post('concepts')
  @RequirePermissions('hcm:py_config')
  upsertConcept(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyConceptDto) {
    return this.config.upsertConcept(user.organizationId, user.id, {
      ...dto, kind: dto.kind as HcmPyConceptKind, category: dto.category as HcmPyConceptCategory,
    });
  }

  @Get('funds')
  @RequirePermissions('hcm:py_read')
  listFunds(@CurrentUser() user: { organizationId: string }) {
    return this.config.listFunds(user.organizationId);
  }

  @Post('funds')
  @RequirePermissions('hcm:py_config')
  upsertFund(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyFundDto) {
    return this.config.upsertFund(user.organizationId, user.id, { ...dto, fundType: dto.fundType as HcmPyFundType });
  }

  @Get('periods')
  @RequirePermissions('hcm:py_read')
  listPeriods(
    @CurrentUser() user: { organizationId: string },
    @Query('companyKey') companyKey?: string,
    @Query('status') status?: HcmPyPeriodStatus,
  ) {
    return this.periods.list(user.organizationId, { companyKey, status });
  }

  @Post('periods')
  @RequirePermissions('hcm:py_period')
  createPeriod(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyPeriodDto) {
    return this.periods.create(user.organizationId, user.id, dto);
  }

  @Post('periods/:periodKey/close')
  @RequirePermissions('hcm:py_period')
  closePeriod(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('periodKey') periodKey: string,
  ) {
    return this.periods.close(user.organizationId, periodKey, user.id);
  }

  @Get('runs')
  @RequirePermissions('hcm:py_read')
  listRuns(
    @CurrentUser() user: { organizationId: string },
    @Query('periodKey') periodKey?: string,
    @Query('status') status?: HcmPyRunStatus,
  ) {
    return this.runs.list(user.organizationId, { periodKey, status });
  }

  @Post('runs')
  @RequirePermissions('hcm:py_run')
  createRun(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyRunDto) {
    return this.runs.create(user.organizationId, user.id, dto);
  }

  @Post('runs/:runKey/calculate')
  @RequirePermissions('hcm:py_run')
  calculateRun(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.runs.calculate(user.organizationId, runKey, user.id);
  }

  @Post('runs/:runKey/approve')
  @RequirePermissions('hcm:py_approve')
  approveRun(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.runs.approve(user.organizationId, runKey, user.id);
  }

  @Post('runs/:runKey/pay')
  @RequirePermissions('hcm:py_approve')
  payRun(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.runs.markPaid(user.organizationId, runKey, user.id);
  }

  @Post('runs/:runKey/reprocess')
  @RequirePermissions('hcm:py_run')
  reprocessRun(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('runKey') runKey: string,
  ) {
    return this.runs.reprocess(user.organizationId, runKey, user.id);
  }

  @Get('payslips')
  @RequirePermissions('hcm:py_read')
  listPayslips(
    @CurrentUser() user: { organizationId: string },
    @Query('runKey') runKey?: string,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.runs.listPayslips(user.organizationId, { runKey, employeeKey });
  }

  @Get('attendance-import')
  @RequirePermissions('hcm:py_run')
  importAttendance(
    @CurrentUser() user: { organizationId: string },
    @Query('payrollPeriod') payrollPeriod: string,
  ) {
    return this.runs.importFromAttendance(user.organizationId, payrollPeriod);
  }

  @Get('benefits')
  @RequirePermissions('hcm:py_read')
  listBenefits(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.benefits.list(user.organizationId, { employeeKey });
  }

  @Post('benefits')
  @RequirePermissions('hcm:py_config')
  createBenefit(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyBenefitDto) {
    return this.benefits.create(user.organizationId, user.id, { ...dto, benefitType: dto.benefitType as HcmPyBenefitType });
  }

  @Get('garnishments')
  @RequirePermissions('hcm:py_read')
  listGarnishments(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.garnishments.list(user.organizationId, employeeKey);
  }

  @Post('garnishments')
  @RequirePermissions('hcm:py_config')
  createGarnishment(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyGarnishmentDto) {
    return this.garnishments.create(user.organizationId, user.id, { ...dto, garnishmentType: dto.garnishmentType as HcmPyGarnishmentType });
  }

  @Get('provisions')
  @RequirePermissions('hcm:py_read')
  listProvisions(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('periodCode') periodCode?: string,
  ) {
    return this.provisions.list(user.organizationId, { employeeKey, periodCode });
  }

  @Get('settlements')
  @RequirePermissions('hcm:py_read')
  listSettlements(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.settlements.list(user.organizationId, employeeKey);
  }

  @Post('settlements')
  @RequirePermissions('hcm:py_run')
  calculateSettlement(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPySettlementDto) {
    return this.settlements.calculate(user.organizationId, user.id, { ...dto, settlementType: dto.settlementType as HcmPySettlementType });
  }

  @Get('vacations/balance')
  @RequirePermissions('hcm:py_read')
  vacationBalance(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey: string,
  ) {
    return this.vacations.getBalance(user.organizationId, employeeKey);
  }

  @Post('vacations/request')
  @RequirePermissions('hcm:py_read')
  requestVacation(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyVacationRequestDto) {
    return this.vacations.requestVacation(user.organizationId, user.id, dto);
  }

  @Get('documents')
  @RequirePermissions('hcm:py_read')
  listDocuments(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.documents.list(user.organizationId, { employeeKey });
  }

  @Post('documents/payslip/:payslipKey')
  @RequirePermissions('hcm:py_export')
  generatePayslipDoc(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('payslipKey') payslipKey: string,
  ) {
    return this.documents.generatePayslipDocument(user.organizationId, user.id, payslipKey);
  }

  @Post('documents/labor-certificate/:employeeKey')
  @RequirePermissions('hcm:py_export')
  laborCertificate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
  ) {
    return this.documents.generateLaborCertificate(user.organizationId, user.id, employeeKey);
  }

  @Post('documents/income-certificate')
  @RequirePermissions('hcm:py_export')
  incomeCertificate(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPyIncomeCertificateDto) {
    return this.documents.generateIncomeCertificate(user.organizationId, user.id, dto.employeeKey, dto.year);
  }

  @Get('salary-history/:employeeKey')
  @RequirePermissions('hcm:py_read')
  salaryHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('employeeKey') employeeKey: string,
  ) {
    return this.documents.salaryHistory(user.organizationId, employeeKey);
  }

  @Get('audit')
  @RequirePermissions('hcm:py_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.auditService.findAll(user.organizationId, 'HcmPy');
  }
}
